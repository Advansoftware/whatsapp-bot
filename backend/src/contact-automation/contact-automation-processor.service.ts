import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContactAutomationService } from './contact-automation.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

interface ContactAutomationField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  botPromptPatterns: string[];
  fieldType: string;
  priority: number;
  isRequired: boolean;
}

interface NavigationDecision {
  action: 'respond' | 'wait' | 'complete' | 'fail';
  response?: string;
  reason: string;
  isComplete?: boolean;
  extractedResult?: string;
}

@Injectable()
export class ContactAutomationProcessorService {
  private readonly logger = new Logger(ContactAutomationProcessorService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly automationService: ContactAutomationService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
    this.evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || 'http://evolution:8080';
    this.evolutionApiKey = this.config.get('EVOLUTION_API_KEY') || '';
  }

  /**
   * Inicia uma sessão de automação - envia primeira mensagem
   */
  async initiateSession(sessionId: string, instanceKey: string) {
    const session = await this.prisma.contactAutomationSession.findUnique({
      where: { id: sessionId },
      include: {
        profile: {
          include: {
            fields: true,
          },
        },
      },
    });

    if (!session) {
      this.logger.error(`Session ${sessionId} not found`);
      return;
    }

    try {
      // Atualizar status para navigating
      await this.prisma.contactAutomationSession.update({
        where: { id: sessionId },
        data: { status: 'navigating' },
      });

      // Gerar primeira mensagem baseada no objetivo
      const firstMessage = await this.generateInitialMessage(session);

      // Enviar mensagem
      await this.sendMessage(instanceKey, session.profile.remoteJid, firstMessage);

      // Registrar
      await this.automationService.updateSessionWithOurResponse(sessionId, firstMessage);

      this.logger.log(`Initiated session ${sessionId} with: "${firstMessage.substring(0, 50)}..."`);
    } catch (error) {
      this.logger.error(`Failed to initiate session ${sessionId}:`, error);
      await this.automationService.failSession(sessionId, `Erro ao iniciar: ${error.message}`);
    }
  }

  /**
   * Processa resposta recebida de um bot durante automação
   */
  async processIncomingBotMessage(
    companyId: string,
    instanceKey: string,
    remoteJid: string,
    messageContent: string,
  ): Promise<{ handled: boolean; sessionId?: string }> {
    // Buscar sessão ativa para este contato
    const session = await this.automationService.findActiveSessionForContact(companyId, remoteJid);

    if (!session) {
      return { handled: false };
    }

    this.logger.log(`Processing bot message for session ${session.id}: "${messageContent.substring(0, 100)}..."`);

    try {
      // Registrar mensagem recebida
      await this.automationService.updateSessionWithBotResponse(session.id, messageContent);

      // Decidir próxima ação
      const decision = await this.decideNextAction(session, messageContent);

      this.logger.log(`Decision for session ${session.id}: ${decision.action} - ${decision.reason}`);

      switch (decision.action) {
        case 'respond':
          if (decision.response) {
            // Pequeno delay para parecer mais humano
            await this.delay(2000 + Math.random() * 3000);

            await this.sendMessage(instanceKey, remoteJid, decision.response);
            await this.automationService.updateSessionWithOurResponse(session.id, decision.response);
          }
          break;

        case 'complete':
          await this.automationService.completeSession(
            session.id,
            decision.extractedResult || messageContent,
            await this.generateSummary(session, messageContent),
          );

          // Notificar o solicitante
          await this.notifyRequester(session, decision.extractedResult || messageContent);
          break;

        case 'fail':
          await this.automationService.failSession(session.id, decision.reason);
          break;

        case 'wait':
          // Apenas aguardar próxima mensagem
          break;
      }

      return { handled: true, sessionId: session.id };
    } catch (error) {
      this.logger.error(`Error processing bot message for session ${session.id}:`, error);
      return { handled: false };
    }
  }

  /**
   * Gera a mensagem inicial baseada no objetivo
   */
  private async generateInitialMessage(session: any): Promise<string> {
    const profile = session.profile;
    const fields = profile.fields as ContactAutomationField[];

    // Criar contexto dos campos disponíveis
    const fieldsContext = fields
      .map((f: ContactAutomationField) => `- ${f.fieldLabel}: ${f.fieldValue}`)
      .join('\n');

    const prompt = `Você é um assistente que vai interagir com o atendimento automático de "${profile.contactName}".

OBJETIVO DO USUÁRIO:
${session.originalQuery}

DADOS DISPONÍVEIS PARA FORNECER:
${fieldsContext}

DESCRIÇÃO DO CONTATO:
${profile.description || 'Não informado'}

TIPO DE BOT: ${profile.botType === 'menu' ? 'Menu com opções numéricas' : profile.botType === 'free_text' ? 'Texto livre' : 'Misto'}

Gere APENAS a primeira mensagem para iniciar a interação. Seja direto e objetivo.
Para bots de menu, geralmente basta um "Oi" ou "Olá" para receber o menu.
Responda APENAS com a mensagem, sem explicações.`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.3 },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text || 'Olá';
    } catch (error) {
      this.logger.error('Error generating initial message:', error);
      return 'Olá';
    }
  }

  /**
   * Decide a próxima ação baseada na resposta do bot
   */
  private async decideNextAction(session: any, botMessage: string): Promise<NavigationDecision> {
    const profile = session.profile;
    const fields = profile.fields as ContactAutomationField[];
    const navigationLog = (session.navigationLog as any[]) || [];

    // Criar contexto dos campos disponíveis
    const fieldsContext = fields
      .map((f: ContactAutomationField) => `- ${f.fieldLabel} (${f.fieldName}): ${f.fieldValue}\n  Bot costuma pedir: ${f.botPromptPatterns?.join(', ') || 'não definido'}`)
      .join('\n');

    // Histórico da navegação
    const historyContext = navigationLog
      .slice(-10)
      .map((log: any) => `[${log.type === 'bot' ? 'BOT' : 'NÓS'}]: ${log.message}`)
      .join('\n');

    const prompt = `Você está navegando pelo atendimento automático de "${profile.contactName}" para atingir um objetivo.

OBJETIVO:
${session.originalQuery}

DADOS DISPONÍVEIS:
${fieldsContext}

HISTÓRICO DA CONVERSA:
${historyContext}

ÚLTIMA MENSAGEM DO BOT:
${botMessage}

NÚMERO DE MENSAGENS TROCADAS: ${session.messagesSent + session.messagesReceived}

Analise a última mensagem do bot e decida:

1. Se o bot está pedindo algum dado que temos (CPF, identificador, etc), responda com o dado correto
2. Se o bot está mostrando um menu com opções, escolha a opção mais adequada para o objetivo
3. Se o bot deu uma resposta final/conclusiva relacionada ao objetivo, marque como "complete"
4. Se algo deu errado ou não conseguimos prosseguir, marque como "fail"
5. Se a mensagem parece incompleta ou precisamos esperar mais, marque como "wait"

Responda APENAS em JSON válido:
{
  "action": "respond" | "complete" | "fail" | "wait",
  "response": "texto da resposta se action=respond",
  "reason": "breve explicação da decisão",
  "isComplete": true/false,
  "extractedResult": "se complete, extraia a informação relevante da resposta do bot"
}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.2 },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { action: 'wait', reason: 'Não foi possível parsear a decisão' };
      }

      const decision = JSON.parse(jsonMatch[0]) as NavigationDecision;

      // Validações de segurança
      if (!['respond', 'complete', 'fail', 'wait'].includes(decision.action)) {
        decision.action = 'wait';
      }

      // Se respondeu muitas vezes sem progresso, falhar
      if (session.messagesSent > 20) {
        return {
          action: 'fail',
          reason: 'Máximo de mensagens atingido sem conclusão',
        };
      }

      return decision;
    } catch (error) {
      this.logger.error('Error deciding next action:', error);
      return {
        action: 'wait',
        reason: 'Erro ao processar decisão',
      };
    }
  }

  /**
   * Gera resumo da interação
   */
  private async generateSummary(session: any, finalMessage: string): Promise<string> {
    const prompt = `Resuma em 1-2 frases o resultado desta interação automatizada:

OBJETIVO ORIGINAL: ${session.originalQuery}
RESPOSTA FINAL DO BOT: ${finalMessage}

Responda de forma direta e informativa para o usuário.`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.3 },
      });

      const result = await model.generateContent(prompt);
      return result.response.text().trim() || 'Interação concluída.';
    } catch {
      return 'Interação concluída.';
    }
  }

  /**
   * Notifica o solicitante sobre o resultado
   */
  private async notifyRequester(session: any, result: string) {
    // Criar uma notificação no banco
    await this.prisma.notification.create({
      data: {
        companyId: session.companyId,
        type: 'contact_automation',
        category: 'success',
        title: `Resultado: ${session.profile.contactName}`,
        message: result,
        metadata: {
          sessionId: session.id,
          profileId: session.profileId,
          objective: session.originalQuery,
        },
        actionUrl: `/contact-automation`,
        actionLabel: 'Ver detalhes',
      },
    });

    this.logger.log(`Notification created for session ${session.id}`);
  }

  /**
   * Envia mensagem via Evolution API
   */
  private async sendMessage(instanceKey: string, remoteJid: string, text: string) {
    try {
      await axios.post(
        `${this.evolutionApiUrl}/message/sendText/${instanceKey}`,
        {
          number: remoteJid.replace('@s.whatsapp.net', ''),
          text,
        },
        {
          headers: { apikey: this.evolutionApiKey },
          timeout: 10000,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send message to ${remoteJid}:`, error);
      throw error;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica sessões expiradas e as finaliza
   */
  async checkExpiredSessions() {
    const expired = await this.prisma.contactAutomationSession.findMany({
      where: {
        status: { in: ['pending', 'navigating', 'waiting_response'] },
        expiresAt: { lt: new Date() },
      },
    });

    for (const session of expired) {
      this.logger.warn(`Session ${session.id} expired`);
      await this.automationService.failSession(session.id, 'Sessão expirada por timeout');
    }

    return expired.length;
  }

  /**
   * Detecta se uma mensagem do usuário é um pedido de automação
   * Ex: "pergunte na copasa se estou sem água"
   */
  async detectAutomationRequest(
    companyId: string,
    message: string,
  ): Promise<{ isAutomation: boolean; profileId?: string; objective?: string }> {
    // Palavras-chave que indicam pedido de automação
    const automationKeywords = [
      'pergunte',
      'pergunta',
      'consulte',
      'consulta',
      'verifique',
      'verifica',
      'fale com',
      'fala com',
      'entre em contato',
      'manda mensagem',
      'envie mensagem',
      'liga para',
      'ligar para',
      'checka',
      'check',
    ];

    const lowerMessage = message.toLowerCase();
    const hasKeyword = automationKeywords.some((k) => lowerMessage.includes(k));

    if (!hasKeyword) {
      return { isAutomation: false };
    }

    // Buscar perfis ativos
    const profiles = await this.prisma.contactAutomationProfile.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: { fields: true },
    });

    if (profiles.length === 0) {
      return { isAutomation: false };
    }

    // Usar IA para identificar qual perfil o usuário quer
    const profilesList = profiles
      .map((p) => `- ${p.contactName} (${p.contactNickname || 'sem apelido'}): ${p.description || 'sem descrição'}`)
      .join('\n');

    const prompt = `Analise esta mensagem do usuário e identifique se ele quer que você interaja automaticamente com algum destes contatos:

MENSAGEM: "${message}"

CONTATOS DISPONÍVEIS:
${profilesList}

Se for um pedido de automação, responda em JSON:
{
  "isAutomation": true,
  "contactName": "nome exato do contato identificado",
  "objective": "o que o usuário quer saber/fazer"
}

Se NÃO for um pedido de automação ou o contato não foi identificado:
{
  "isAutomation": false
}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.1 },
      });

      const resultAI = await model.generateContent(prompt);
      const text = resultAI.response.text();

      // Extrair JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { isAutomation: false };
      }

      const result = JSON.parse(jsonMatch[0]);

      if (result.isAutomation && result.contactName) {
        // Encontrar o perfil pelo nome
        const profile = profiles.find(
          (p) =>
            p.contactName.toLowerCase() === result.contactName.toLowerCase() ||
            p.contactNickname?.toLowerCase() === result.contactName.toLowerCase(),
        );

        if (profile) {
          return {
            isAutomation: true,
            profileId: profile.id,
            objective: result.objective,
          };
        }
      }

      return { isAutomation: false };
    } catch {
      return { isAutomation: false };
    }
  }
}
