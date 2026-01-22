import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AIMemoryService } from './ai-memory.service';
import { AITranscriptionService } from './ai-transcription.service';
import { AIExpensesService } from './ai-expenses.service';
import { SecretaryTasksModule } from '../secretary-tasks/secretary-tasks.module';
import { SecretaryTasksService } from '../secretary-tasks/secretary-tasks.service';

interface MessageContext {
  conversationHistory: any[];
  contactName?: string;
  products?: any[];
  businessContext?: string;
  ownerName?: string;
}



interface NotifyOwnerParams {
  instanceKey: string;
  ownerPhone: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  summary: string;
}

import { AIResponseService } from './ai-response.service';
import { AIAnalysisService, AIAnalysis } from './ai-analysis.service';

import { AIPromptsService } from './ai-prompts.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private evolutionApiUrl: string;
  private evolutionApiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly memoryService: AIMemoryService,
    private readonly responseService: AIResponseService,
    private readonly analysisService: AIAnalysisService,
    private readonly transcriptionService: AITranscriptionService,
    private readonly expenseService: AIExpensesService,
    private readonly promptsService: AIPromptsService,
    private readonly tasksService: SecretaryTasksService,
  ) {
    this.evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || '';
    this.evolutionApiKey = this.config.get('EVOLUTION_API_KEY') || '';
  }

  /**
   * Facade para construir prompt de assistente pessoal
   */
  buildPersonalAssistantPrompt(aiConfig: any, automationProfiles?: any[]): string {
    return this.promptsService.buildPersonalAssistantPrompt(aiConfig, automationProfiles);
  }

  /**
   * Verifica se o erro é de rate limit (429)
   */
  private isRateLimitError(error: any): boolean {
    return error.message?.includes('429') ||
      error.message?.includes('Too Many Requests') ||
      error.message?.includes('quota');
  }

  /**
   * Extrai o tempo de retry do erro de rate limit
   */
  private getRetryDelay(error: any): number {
    const match = error.message?.match(/retry in (\d+)/i);
    return match ? parseInt(match[1]) * 1000 : 60000; // Default 60s
  }

  /**
   * Qualifica leads com base no histórico (Facade)
   */
  async qualifyLead(contactId: string, messages: any[], contact: any, memoryContext?: string): Promise<any> {
    const analysis = await this.analysisService.qualifyLead({
      contactId,
      messages,
      contact,
      memoryContext
    });

    // Manter comportamento original de salvar no banco (embora analysisService pudesse fazer isso)
    // Na verdade, analysisService apenas analisa. O salvamento estava no original.
    // Vamos atualizar analysisService para incluir o salvamento ou fazer aqui.
    // O original salvava: await this.prisma.contact.update...
    // O analysisService retorna o JSON.
    // Então aqui no facade eu devo salvar.

    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        leadScore: analysis.score,
        leadStatus: analysis.status,
        aiAnalysis: analysis.analysis,
        aiAnalyzedAt: new Date(),
      },
    });

    this.logger.log(`Lead ${contactId} qualified: score=${analysis.score}, status=${analysis.status}`);
    return analysis;
  }
  async analyzeMessage(
    messageContent: string,
    context: MessageContext,
  ): Promise<AIAnalysis> {
    return this.analysisService.analyzeMessage(messageContent, context);
  }

  /**
   * OTIMIZADO: Analisa E gera resposta em uma única chamada
   * Economiza 50% das chamadas de API
   */
  async analyzeAndRespond(
    messageContent: string,
    context: MessageContext,
    aiConfig: any,
  ): Promise<{ analysis: AIAnalysis; response: string }> {
    return this.analysisService.analyzeAndRespond(messageContent, context, aiConfig);
  }

  /**
   * Gera resposta usando IA
   */
  async generateResponse(
    messageContent: string,
    context: MessageContext,
    aiConfig: any,
  ): Promise<string> {
    return this.responseService.generateResponse({
      messageContent,
      context,
      aiConfig,
    });
  }

  private buildSystemPrompt(context: MessageContext): string {
    const ownerName = context.ownerName || 'o proprietário';

    return `Você é uma secretária virtual chamada Sofia. Você trabalha para ${ownerName} atendendo clientes pelo WhatsApp.

SUA PERSONALIDADE:
- Você é simpática, acolhedora e fala de forma natural como uma brasileira
- Use emojis com moderação (não em toda mensagem, mas quando fizer sentido)
- Seja informal mas profissional - trate os clientes de "você" 
- Demonstre empatia e interesse genuíno
- Use expressões naturais como "Oi!", "Claro!", "Com certeza!", "Opa!"
- Evite ser robótica ou muito formal

COMO VOCÊ FUNCIONA:
- Você responde dúvidas sobre produtos, preços e disponibilidade
- Você pode informar sobre promoções e novidades
- Quando não sabe algo ou a situação é complexa, você diz que vai chamar ${ownerName}
- Se o cliente insistir em falar com um humano, respeite e chame ${ownerName}
- Para pedidos, orçamentos complexos ou reclamações sérias, chame ${ownerName}

FRASES QUE VOCÊ USA:
- "Deixa eu verificar aqui pra você..."
- "Vou passar isso pro ${ownerName}, tá? Ele te responde rapidinho!"
- "Opa, essa eu não sei responder, mas já vou chamar alguém pra te ajudar!"
- "Que legal! Temos sim!"

${context.businessContext || ''}`;
  }






  /**
   * Notifica o dono do estabelecimento sobre uma conversa importante
   */
  async notifyOwner(params: NotifyOwnerParams): Promise<boolean> {
    const { instanceKey, ownerPhone, customerName, customerPhone, reason, summary } = params;

    try {
      const message = `🔔 * Atenção necessária! *

👤 * Cliente:* ${customerName || 'Não identificado'}
📱 * Número:* ${customerPhone}

📋 * Motivo:* ${reason}

💬 * Resumo da conversa:*
    ${summary}

_Responda diretamente ao cliente pelo número acima ou acesse o painel._`;

      await this.sendWhatsAppMessage(instanceKey, ownerPhone, message);

      this.logger.log(`Owner notified: ${ownerPhone} about customer ${customerPhone} `);
      return true;
    } catch (error) {
      this.logger.error(`Failed to notify owner: ${error.message} `);
      return false;
    }
  }

  /**
   * Envia mensagem via Evolution API
   */
  async sendWhatsAppMessage(instanceKey: string, remoteJid: string, message: string): Promise<void> {
    try {
      // Formatar número se necessário (sem espaço antes do @)
      const formattedJid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;

      const response = await fetch(`${this.evolutionApiUrl}/message/sendText/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionApiKey,
        },
        body: JSON.stringify({
          number: formattedJid,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorData} `);
      }

      this.logger.log(`Message sent to ${formattedJid} `);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message} `);
      throw error;
    }
  }

  /**
   * Processa mensagem de áudio (delegado)
   */
  async processAudioMessage(instanceKey: string, mediaData: any): Promise<string> {
    return this.transcriptionService.processAudioMessage(instanceKey, mediaData);
  }

  /**
   * Processa imagem para inventário (delegado)
   */
  async processImageForInventory(
    instanceKey: string,
    mediaData: any,
    textMessage: string,
    companyId: string,
  ): Promise<any> {
    return this.transcriptionService.processImageForInventory(instanceKey, mediaData, textMessage, companyId);
  }

  /**
   * Cria produto no inventário a partir dos dados coletados
   */
  async createProductFromConversation(
    companyId: string,
    productData: {
      name: string;
      description?: string;
      price: number;
      quantity: number;
      variant?: string;
      category?: string;
      imageBase64?: string;
      imageMimeType?: string;
    },
  ): Promise<{
    success: boolean;
    product?: any;
    response: string;
  }> {
    try {
      this.logger.log(`📦 Creating product: ${productData.name} for company ${companyId}`);

      // Criar produto no banco
      const product = await this.prisma.product.create({
        data: {
          companyId,
          name: productData.name,
          price: productData.price,
          quantity: productData.quantity,
          variant: productData.variant || null,
          isActive: true,
        },
      });

      this.logger.log(`✅ Product created: ${product.id} - ${product.name} `);

      const response = `✅ Produto cadastrado com sucesso!

📦 ** ${product.name}** ${product.variant ? ` (${product.variant})` : ''}
💰 Preço: R$ ${product.price.toFixed(2)}
📊 Estoque: ${product.quantity} unidades

O produto já está disponível no seu inventário! 🎉`;

      return {
        success: true,
        product,
        response,
      };
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message} `);

      return {
        success: false,
        response: 'Ops, tive um problema ao cadastrar o produto. Tenta novamente? 😅',
      };
    }
  }

  /**
   * Processa confirmação de cadastro de produto do dono (delegado)
   */
  async parseProductConfirmation(
    messageContent: string,
    pendingProduct: any,
  ): Promise<{
    confirmed: boolean;
    productData?: {
      name: string;
      description?: string;
      price: number;
      quantity: number;
      variant?: string;
    };
    needsMoreInfo?: string;
  }> {
    return this.analysisService.parseProductConfirmation(messageContent, pendingProduct);
  }

  /**
   * Analisa se a mensagem do dono é um comando/instrução (delegado)
   */
  async parseOwnerCommand(messageContent: string, companyId: string): Promise<{
    isCommand: boolean;
    commandType?: 'instruction' | 'query' | 'config' | 'conversation';
    response?: string;
  }> {
    return this.analysisService.parseOwnerCommand(messageContent, companyId);
  }

  /**
   * Verifica se a mensagem contém palavras que devem escalar para humano
   */
  checkEscalationWords(message: string, escalationWords: string | null): boolean {
    if (!escalationWords) return false;

    try {
      const words: string[] = JSON.parse(escalationWords);
      const lowerMessage = message.toLowerCase();

      return words.some(word => lowerMessage.includes(word.toLowerCase()));
    } catch {
      // Se não for JSON válido, trata como lista separada por vírgula
      const words = escalationWords.split(',').map(w => w.trim().toLowerCase());
      const lowerMessage = message.toLowerCase();

      return words.some(word => lowerMessage.includes(word));
    }
  }

  /**
   * Verifica se está dentro do horário de funcionamento
   */
  isWithinBusinessHours(businessHours: string | null): boolean {
    if (!businessHours) return true; // Se não configurado, sempre ativo

    try {
      const hours = JSON.parse(businessHours);
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutos desde meia-noite

      const todayHours = hours[dayOfWeek];
      if (!todayHours || !todayHours.open) return false;

      const [startHour, startMin] = todayHours.start.split(':').map(Number);
      const [endHour, endMin] = todayHours.end.split(':').map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      return currentTime >= startTime && currentTime <= endTime;
    } catch {
      return true; // Em caso de erro, mantém ativo
    }
  }

  /**
   * Analisa a resposta da IA para ver se é um comando de automação
   */
  parseAutomationCommand(response: string): { profileName: string; query: string } | null {
    try {
      // Verificar se a resposta contém JSON de automação
      const jsonMatch = response.match(/\{[\s\S]*"action"\s*:\s*"start_automation"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.action === 'start_automation' && parsed.profileName && parsed.query) {
          return {
            profileName: parsed.profileName,
            query: parsed.query,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Processa mensagem completa com lógica de secretária
   */
  async processSecretaryMessage(
    messageContent: string,
    companyId: string,
    instanceKey: string,
    remoteJid: string,
    contactName?: string,
    isPersonalAssistantMode: boolean = false,
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    shouldNotifyOwner: boolean;
    notificationReason?: string;
    automationSessionId?: string;
    automationProfile?: any;
  }> {
    // Buscar configuração da secretária
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    if (!aiConfig || !aiConfig.enabled) {
      return { shouldRespond: false, shouldNotifyOwner: false };
    }

    // Se é modo assistente pessoal (dono falando), pular verificações de horário/escalação
    if (isPersonalAssistantMode) {
      this.logger.log(`👤 Processing as personal assistant for owner`);
    }

    // Verificar horário de funcionamento (apenas para clientes)
    if (!isPersonalAssistantMode && !this.isWithinBusinessHours(aiConfig.businessHours)) {
      return {
        shouldRespond: true,
        response: 'Oi! No momento estamos fora do horário de atendimento. Deixa sua mensagem que respondemos assim que possível! 😊',
        shouldNotifyOwner: false,
      };
    }

    // Verificar palavras de escalação (apenas para clientes)
    if (!isPersonalAssistantMode && this.checkEscalationWords(messageContent, aiConfig.escalationWords)) {
      return {
        shouldRespond: true,
        response: `Entendi! Vou chamar o ${aiConfig.ownerName || 'responsável'} pra te atender, tá ? Só um minutinho! 🙂`,
        shouldNotifyOwner: true,
        notificationReason: 'Cliente mencionou palavra-chave de escalação',
      };
    }

    // Buscar contexto
    const [messages, products] = await Promise.all([
      this.prisma.message.findMany({
        where: { companyId, remoteJid },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.product.findMany({
        where: { companyId, isActive: true },
      }),
      // Buscar perfis de automação ativos
      this.prisma.contactAutomationProfile.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          contactName: true,
          contactNickname: true,
          description: true,
          remoteJid: true,
        },
      }),
    ]);

    const context: MessageContext = {
      conversationHistory: messages.reverse(),
      contactName,
      products,
      ownerName: aiConfig.ownerName ?? undefined,
    };

    // Se é modo assistente pessoal (dono), responde diretamente como assistente
    if (isPersonalAssistantMode) {
      // Buscar automações disponíveis
      const automationProfiles = await this.prisma.contactAutomationProfile.findMany({
        where: { companyId, isActive: true },
      });

      const response = await this.generateResponse(messageContent, context, {
        ...aiConfig,
        systemPrompt: this.buildPersonalAssistantPrompt(aiConfig, automationProfiles),
      });

      // Verificar se a resposta é um comando de automação
      const automationCommand = this.parseAutomationCommand(response);
      if (automationCommand) {
        // Encontrar o perfil de automação
        const profile = automationProfiles.find(p =>
          p.contactName.toLowerCase().includes(automationCommand.profileName.toLowerCase()) ||
          (p.contactNickname && p.contactNickname.toLowerCase().includes(automationCommand.profileName.toLowerCase()))
        );

        if (profile) {
          // Iniciar sessão de automação
          try {
            const session = await this.prisma.contactAutomationSession.create({
              data: {
                profileId: profile.id,
                companyId,
                requestedBy: 'assistant',
                requestedFrom: 'personal_assistant',
                originalQuery: automationCommand.query,
                objective: automationCommand.query,
                status: 'pending',
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutos
              },
            });

            this.logger.log(`Started automation session ${session.id} for ${profile.contactName} via personal assistant`);

            return {
              shouldRespond: true,
              response: `Perfeito! 🔍 Vou consultar o ${profile.contactName} sobre "${automationCommand.query}". Te aviso assim que tiver a resposta!`,
              shouldNotifyOwner: false,
              automationSessionId: session.id,
              automationProfile: profile,
            };
          } catch (error) {
            this.logger.error(`Failed to start automation session: ${error.message}`);
            return {
              shouldRespond: true,
              response: `Opa, tive um probleminha pra iniciar a consulta no ${profile.contactName}. Tenta de novo? 😅`,
              shouldNotifyOwner: false,
            };
          }
        }
      }

      return {
        shouldRespond: true,
        response,
        shouldNotifyOwner: false,
      };
    }

    // Decidir ação baseado no modo
    if (aiConfig.mode === 'passive') {
      // Modo passivo: apenas analisa, não responde (1 chamada)
      const analysis = await this.analyzeMessage(messageContent, context);
      return {
        shouldRespond: false,
        shouldNotifyOwner: analysis.shouldEscalate,
        notificationReason: analysis.reasoning,
      };
    }

    // Modo ativo: OTIMIZADO - análise + resposta em UMA chamada (economiza 50% do custo)
    if (aiConfig.mode === 'active') {
      const { analysis, response } = await this.analyzeAndRespond(messageContent, context, aiConfig);

      // Se deve escalar, adiciona mensagem de escalação
      if (analysis.shouldEscalate || analysis.urgency === 'urgent' || analysis.intent === 'complaint') {
        const escalationResponse = `Entendi! Vou chamar o ${aiConfig.ownerName || 'responsável'} pra te atender, tá? Só um minutinho! 🙂`;
        return {
          shouldRespond: true,
          response: escalationResponse,
          shouldNotifyOwner: true,
          notificationReason: analysis.escalationReason || analysis.reasoning,
        };
      }

      return {
        shouldRespond: true,
        response,
        shouldNotifyOwner: false,
      };
    }

    // Modo supervisionado: não responde automaticamente, aguarda aprovação
    return {
      shouldRespond: false,
      shouldNotifyOwner: false,
    };
  }

  // ========================================
  // MEMORY SYSTEM - Extração e uso de memória
  // ========================================

  /**
   * Extrai informações importantes da mensagem e salva na memória do contato (delegado)
   */
  async extractAndSaveMemory(
    contactId: string,
    messageContent: string,
    messageId: string,
  ): Promise<void> {
    return this.memoryService.extractAndSaveMemory(contactId, messageContent, messageId);
  }

  /**
   * Busca memórias relevantes do contato para incluir no contexto
   * Retorna um resumo compacto para economizar tokens
   */
  async getContactMemoryContext(contactId: string): Promise<string> {
    try {
      const memories = await this.prisma.contactMemory.findMany({
        where: { contactId },
        orderBy: [
          { type: 'asc' },
          { updatedAt: 'desc' },
        ],
      });

      if (memories.length === 0) {
        return '';
      }

      // Agrupa por tipo para formatação compacta
      const grouped: Record<string, string[]> = {};
      for (const mem of memories) {
        if (!grouped[mem.type]) grouped[mem.type] = [];
        grouped[mem.type].push(`${mem.key}: ${mem.value}`);
      }

      let context = '\n📝 MEMÓRIA DO CONTATO:\n';

      if (grouped.fact) context += `Fatos: ${grouped.fact.join('; ')}\n`;
      if (grouped.preference) context += `Preferências: ${grouped.preference.join('; ')}\n`;
      if (grouped.need) context += `Necessidades: ${grouped.need.join('; ')}\n`;
      if (grouped.interest) context += `Interesses: ${grouped.interest.join('; ')}\n`;
      if (grouped.objection) context += `⚠️ Objeções anteriores: ${grouped.objection.join('; ')}\n`;
      if (grouped.context) context += `Contexto: ${grouped.context.join('; ')}\n`;

      return context;
    } catch (error) {
      this.logger.error(`Failed to get contact memory: ${error.message}`);
      return '';
    }
  }

  /**
   * Busca correções de erros anteriores para evitar repetir
   */
  async getErrorCorrections(companyId: string): Promise<string> {
    try {
      const corrections = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          category: 'error_correction',
          isActive: true,
        },
        orderBy: { priority: 'desc' },
        take: 10,
      });

      if (corrections.length === 0) return '';

      let context = '\n⚠️ ERROS A EVITAR:\n';
      for (const corr of corrections) {
        context += `- NÃO diga: "${corr.wrongResponse}"\n`;
        context += `  DIGA: "${corr.correctResponse}"\n`;
      }

      return context;
    } catch (error) {
      this.logger.error(`Failed to get error corrections: ${error.message}`);
      return '';
    }
  }

  /**
   * Busca conhecimento relevante da empresa (FAQs, políticas, etc)
   */
  async getRelevantKnowledge(companyId: string, messageContent: string): Promise<string> {
    try {
      // Busca por keywords no conteúdo da mensagem
      const knowledge = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          isActive: true,
          category: { in: ['faq', 'policy', 'product', 'script'] },
        },
        orderBy: { priority: 'desc' },
      });

      if (knowledge.length === 0) return '';

      // Filtra por relevância (keywords match)
      const lowerMessage = messageContent.toLowerCase();
      const relevant = knowledge.filter(k => {
        if (k.keywords.length === 0) return k.priority > 5; // Alta prioridade sempre incluir
        return k.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()));
      });

      if (relevant.length === 0) return '';

      let context = '\n📚 BASE DE CONHECIMENTO:\n';
      for (const item of relevant.slice(0, 5)) {
        context += `[${item.category.toUpperCase()}] ${item.title}: ${item.content}\n`;
      }

      return context;
    } catch (error) {
      this.logger.error(`Failed to get knowledge: ${error.message}`);
      return '';
    }
  }

  // ========================================
  // LEAD SCORING - Qualificação automática
  // ========================================

  /**
   * Analisa conversas e qualifica o lead
   * Deve ser chamado quando contato atinge 300+ mensagens e nunca foi analisado
   */
  async analyzeAndQualifyLead(contactId: string, companyId: string): Promise<{
    score: number;
    status: string;
    analysis: string;
  }> {
    try {
      // Buscar contato
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { memories: true },
      });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Buscar últimas 500 mensagens para análise mais completa
      const messages = await this.prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      // Resumo das memórias
      const memoryContext = contact.memories.map(m => `${m.type}: ${m.key}=${m.value}`).join('; ');

      // Delegate to Analysis Service
      const result = await this.analysisService.qualifyLead({
        contactId,
        messages: messages.reverse(),
        contact,
        memoryContext
      });

      return {
        score: result.score,
        status: result.status,
        analysis: result.analysis
      };

    } catch (error) {
      this.logger.error(`Lead qualification failed: ${error.message}`);
      // Fallback
      return {
        score: 0,
        status: 'cold',
        analysis: 'Erro na análise automática.'
      };
    }
  }

  /**
   * Registra uma correção de erro para evitar repetir
   */
  async saveErrorCorrection(
    companyId: string,
    wrongResponse: string,
    correctResponse: string,
    context: string,
  ): Promise<void> {
    await this.prisma.companyKnowledge.create({
      data: {
        companyId,
        category: 'error_correction',
        title: `Correção: ${context.substring(0, 50)}...`,
        content: context,
        wrongResponse,
        correctResponse,
        priority: 10,
      },
    });
  }
}
