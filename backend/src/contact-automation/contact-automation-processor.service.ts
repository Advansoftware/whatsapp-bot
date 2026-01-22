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
            menuOptions: true,
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
    const menuOptions = profile.menuOptions || [];
    const navigationLog = (session.navigationLog as any[]) || [];

    // Detectar se é um menu com opções numéricas
    const isMenuMessage = this.detectMenuMessage(botMessage);

    // Se tem opções de menu configuradas E a mensagem do bot é um menu
    if (isMenuMessage && menuOptions.length > 0) {
      const selectedOption = this.selectMenuOptionByObjective(
        session.originalQuery,
        menuOptions,
        botMessage,
      );

      if (selectedOption) {
        this.logger.log(`Menu detected! Selecting option: ${selectedOption.optionValue} (${selectedOption.optionLabel})`);
        return {
          action: 'respond',
          response: selectedOption.optionValue, // Só o número!
          reason: `Selecionando opção ${selectedOption.optionValue}: ${selectedOption.optionLabel}`,
        };
      }
    }

    // Verificar se o bot está pedindo algum dado que temos
    const requestedField = this.detectRequestedField(botMessage, fields);
    if (requestedField) {
      this.logger.log(`Bot requesting field: ${requestedField.fieldName}, responding with: ${requestedField.fieldValue}`);
      return {
        action: 'respond',
        response: requestedField.fieldValue,
        reason: `Bot pediu ${requestedField.fieldLabel}, fornecendo valor configurado`,
      };
    }

    // Se tem opções de menu configuradas, usar IA para decidir qual opção
    if (isMenuMessage && menuOptions.length > 0) {
      const optionByAI = await this.askAIForMenuOption(session.originalQuery, menuOptions, botMessage);
      if (optionByAI) {
        return {
          action: 'respond',
          response: optionByAI,
          reason: 'IA selecionou opção do menu',
        };
      }
    }

    // Criar contexto dos campos disponíveis
    const fieldsContext = fields
      .map((f: ContactAutomationField) => `- ${f.fieldLabel} (${f.fieldName}): ${f.fieldValue}\n  Bot costuma pedir: ${f.botPromptPatterns?.join(', ') || 'não definido'}`)
      .join('\n');

    // Contexto das opções de menu
    const menuContext = menuOptions.length > 0
      ? `\n\nOPÇÕES DE MENU CONFIGURADAS:\n${menuOptions.map((m: any) =>
        `- Digitar "${m.optionValue}" para: ${m.optionLabel} (keywords: ${m.keywords?.join(', ') || 'nenhuma'})`
      ).join('\n')}`
      : '';

    // Histórico da navegação
    const historyContext = navigationLog
      .slice(-10)
      .map((log: any) => `[${log.type === 'bot' ? 'BOT' : 'NÓS'}]: ${log.message}`)
      .join('\n');

    const prompt = `Você está navegando pelo atendimento automático de "${profile.contactName}" para atingir um objetivo.

REGRA CRÍTICA: Se o bot mostrar um MENU com opções numeradas (1, 2, 3...), você DEVE responder APENAS com o NÚMERO da opção. NÃO escreva texto, NÃO converse, APENAS o número.

OBJETIVO:
${session.originalQuery}

DADOS DISPONÍVEIS:
${fieldsContext}${menuContext}

HISTÓRICO DA CONVERSA:
${historyContext}

ÚLTIMA MENSAGEM DO BOT:
${botMessage}

NÚMERO DE MENSAGENS TROCADAS: ${session.messagesSent + session.messagesReceived}

Analise a última mensagem do bot e decida:

1. Se é um MENU com opções (1, 2, 3...), responda APENAS com o número da opção mais adequada
2. Se o bot está pedindo algum dado que temos (CPF, identificador, etc), responda APENAS com o dado
3. Se o bot deu uma resposta final/conclusiva relacionada ao objetivo, marque como "complete"
4. Se algo deu errado ou não conseguimos prosseguir, marque como "fail"
5. Se a mensagem parece incompleta ou precisamos esperar mais, marque como "wait"

Responda APENAS em JSON válido:
{
  "action": "respond" | "complete" | "fail" | "wait",
  "response": "APENAS número ou dado solicitado, NUNCA texto conversacional",
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
   * Detecta se a mensagem do bot é um menu com opções
   */
  private detectMenuMessage(message: string): boolean {
    // Padrões comuns de menu: *1* -, 1 -, 1., 1), [1]
    const menuPatterns = [
      /\*\d+\*\s*[-–—]/g,  // *1* -
      /^\d+\s*[-–—]/gm,    // 1 -
      /^\d+\.\s/gm,        // 1.
      /^\d+\)\s/gm,        // 1)
      /\[\d+\]\s/g,        // [1]
    ];

    return menuPatterns.some(pattern => pattern.test(message));
  }

  /**
   * Seleciona a opção de menu baseada no objetivo e keywords
   */
  private selectMenuOptionByObjective(
    objective: string,
    menuOptions: any[],
    botMessage: string,
  ): any | null {
    const lowerObjective = objective.toLowerCase();

    // Primeiro, tentar match por keywords
    for (const option of menuOptions) {
      const keywords = option.keywords || [];
      const hasMatch = keywords.some((keyword: string) =>
        lowerObjective.includes(keyword.toLowerCase())
      );
      if (hasMatch) {
        return option;
      }
    }

    // Se não encontrou por keywords, tentar match pelo label
    for (const option of menuOptions) {
      const label = option.optionLabel.toLowerCase();
      const labelWords = label.split(/\s+/).filter((w: string) => w.length > 3);
      const hasMatch = labelWords.some((word: string) =>
        lowerObjective.includes(word)
      );
      if (hasMatch) {
        return option;
      }
    }

    return null;
  }

  /**
   * Detecta se o bot está pedindo algum campo que temos configurado
   */
  private detectRequestedField(botMessage: string, fields: ContactAutomationField[]): ContactAutomationField | null {
    const lowerMessage = botMessage.toLowerCase();

    for (const field of fields) {
      // Verificar pelos padrões configurados
      const patterns = field.botPromptPatterns || [];
      const hasPatternMatch = patterns.some(pattern =>
        lowerMessage.includes(pattern.toLowerCase())
      );

      // Verificar pelo nome do campo
      const hasNameMatch = lowerMessage.includes(field.fieldName.toLowerCase()) ||
        lowerMessage.includes(field.fieldLabel.toLowerCase());

      if (hasPatternMatch || hasNameMatch) {
        return field;
      }
    }

    return null;
  }

  /**
   * Usa IA para escolher opção do menu quando não há match por keywords
   */
  private async askAIForMenuOption(
    objective: string,
    menuOptions: any[],
    botMessage: string,
  ): Promise<string | null> {
    const optionsList = menuOptions
      .map((m: any) => `${m.optionValue}: ${m.optionLabel}`)
      .join('\n');

    const prompt = `O usuário quer: "${objective}"

O bot mostrou estas opções:
${optionsList}

Mensagem do bot:
${botMessage}

Qual número devo digitar para atender o objetivo do usuário?
Responda APENAS com o número, nada mais.`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.1 },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Verificar se é um número válido das opções
      const validOptions = menuOptions.map((m: any) => m.optionValue);
      if (validOptions.includes(text)) {
        return text;
      }

      // Tentar extrair número da resposta
      const numberMatch = text.match(/\d+/);
      if (numberMatch && validOptions.includes(numberMatch[0])) {
        return numberMatch[0];
      }

      return null;
    } catch {
      return null;
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
   * Ex: "pergunte na copasa se estou sem água" ou "quantas faturas tenho na copasa?"
   */
  async detectAutomationRequest(
    companyId: string,
    message: string,
  ): Promise<{ isAutomation: boolean; profileId?: string; objective?: string }> {
    // Buscar perfis ativos primeiro
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

    const lowerMessage = message.toLowerCase();

    // Palavras-chave que indicam pedido EXPLÍCITO de automação
    const explicitKeywords = [
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

    const hasExplicitKeyword = explicitKeywords.some((k) => lowerMessage.includes(k));

    // Verificar se menciona algum contato/serviço cadastrado
    // Usa os dados do próprio cadastro: nome, apelido e descrição
    const mentionedProfile = profiles.find((p) => {
      const name = p.contactName.toLowerCase();
      const nickname = p.contactNickname?.toLowerCase() || '';
      const description = p.description?.toLowerCase() || '';

      // Extrair palavras-chave da descrição do serviço (palavras com 4+ caracteres)
      const descriptionWords = description
        .split(/[\s,\.]+/)
        .filter(w => w.length >= 4)
        .filter(w => !['para', 'como', 'mais', 'tudo', 'coisas', 'serviços', 'sobre', 'relacionadas', 'relacionado'].includes(w));

      return lowerMessage.includes(name) ||
        (nickname && lowerMessage.includes(nickname)) ||
        descriptionWords.some(w => lowerMessage.includes(w));
    });

    // Se não tem keyword explícita E não menciona nenhum serviço, não é automação
    if (!hasExplicitKeyword && !mentionedProfile) {
      return { isAutomation: false };
    }

    // Usar IA para confirmar e extrair objetivo
    const profilesList = profiles
      .map((p) => `- ${p.contactName} (${p.contactNickname || 'sem apelido'}): ${p.description || 'sem descrição'}`)
      .join('\n');

    const prompt = `Analise esta mensagem e identifique se o usuário está perguntando algo que pode ser respondido consultando um destes serviços automatizados:

MENSAGEM: "${message}"

SERVIÇOS DISPONÍVEIS PARA CONSULTA AUTOMÁTICA:
${profilesList}

REGRAS:
1. Se a mensagem menciona ou é sobre algum desses serviços (ex: "fatura de água" = Copasa, "conta de luz" = Cemig)
2. Ou se o usuário está pedindo explicitamente para consultar/perguntar algo
3. Identifique qual serviço pode responder a pergunta

Responda em JSON:
{
  "isAutomation": true/false,
  "contactName": "nome exato do serviço (se aplicável)",
  "objective": "o que consultar no serviço",
  "reasoning": "breve explicação"
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
      this.logger.log(`Automation detection result: ${JSON.stringify(result)}`);

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
    } catch (error) {
      this.logger.warn(`Automation detection AI error: ${error.message}`);
      return { isAutomation: false };
    }
  }
}
