import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface MessageContext {
  conversationHistory: any[];
  contactName?: string;
  products?: any[];
  businessContext?: string;
  ownerName?: string;
  isPersonalAssistant?: boolean; // Modo secretária pessoal (quando o dono fala com ela)
  ownerInstructions?: string; // Instruções temporárias do dono
}

interface AIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  intent: 'question' | 'complaint' | 'purchase' | 'support' | 'greeting' | 'other';
  suggestedResponse: string;
  confidence: number;
  reasoning: string;
  shouldEscalate: boolean;
  escalationReason?: string;
}

interface NotifyOwnerParams {
  instanceKey: string;
  ownerPhone: string;
  customerName: string;
  customerPhone: string;
  reason: string;
  summary: string;
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI;
  private evolutionApiUrl: string;
  private evolutionApiKey: string;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.evolutionApiUrl = this.config.get('EVOLUTION_API_URL') || '';
    this.evolutionApiKey = this.config.get('EVOLUTION_API_KEY') || '';
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  // ========================================
  // TRANSCRIÇÃO DE ÁUDIO
  // ========================================

  /**
   * Converte objeto indexado (ex: {0: 1, 1: 2, ...}) para array
   */
  private objectToArray(obj: any): number[] | any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj;

    // Verifica se parece ser um objeto indexado (chaves são números sequenciais)
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((k, i) => k === String(i))) {
      return keys.map(k => obj[k]);
    }
    return obj;
  }

  /**
   * Converte recursivamente objetos indexados em arrays na mensagem
   */
  private convertMediaMessage(message: any): any {
    if (!message || typeof message !== 'object') return message;

    const result: any = {};
    for (const [key, value] of Object.entries(message)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Campos que devem ser arrays de bytes
        const byteFields = ['mediaKey', 'fileSha256', 'fileEncSha256', 'waveform', 'messageSecret',
          'senderKeyHash', 'recipientKeyHash', 'threadId', 'senderKeyIndexes', 'recipientKeyIndexes'];

        if (byteFields.includes(key)) {
          result[key] = this.objectToArray(value);
        } else if (key === 'fileLength' || key === 'mediaKeyTimestamp' || key === 'senderTimestamp' || key === 'recipientTimestamp') {
          // Campos de números long - pegar o valor low
          result[key] = (value as any).low !== undefined ? (value as any).low : value;
        } else {
          result[key] = this.convertMediaMessage(value);
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Baixa mídia da Evolution API e retorna como base64
   */
  async downloadMediaFromEvolution(instanceKey: string, mediaData: any): Promise<string | null> {
    try {
      this.logger.log(`📥 Downloading media for instance ${instanceKey}`);
      this.logger.debug(`Media data keys: ${Object.keys(mediaData).join(', ')}`);

      // Converter a mensagem para formato correto (arrays ao invés de objetos indexados)
      // A Evolution API espera: { message: { key: {...}, message: {...}, messageType: 'audioMessage' } }
      const convertedData = this.convertMediaMessage(mediaData);

      const requestBody = {
        message: convertedData,
        convertToMp4: false,
      };

      this.logger.debug(`Request to Evolution API getBase64FromMediaMessage/${instanceKey}`);
      const response = await fetch(`${this.evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionApiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to download media (${response.status}): ${error}`);
        return null;
      }

      const data = await response.json();

      if (!data.base64) {
        this.logger.error(`No base64 in response: ${JSON.stringify(data).substring(0, 200)}`);
        return null;
      }

      this.logger.log(`✅ Media downloaded successfully, size: ${data.base64.length} chars`);
      return data.base64;
    } catch (error) {
      this.logger.error(`Error downloading media: ${error.message}`);
      return null;
    }
  }

  /**
   * Transcreve áudio usando Gemini
   * O Gemini 2.5 suporta áudio nativo!
   */
  async transcribeAudio(audioBase64: string, mimeType: string = 'audio/ogg'): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: audioBase64,
          },
        },
        'Transcreva este áudio em português. Retorne APENAS a transcrição do que foi dito, sem comentários adicionais. Se não conseguir entender, retorne "[Áudio não compreendido]".',
      ]);

      const transcription = result.response.text().trim();
      this.logger.log(`Audio transcribed: ${transcription.substring(0, 100)}...`);
      return transcription;
    } catch (error) {
      this.logger.error(`Audio transcription failed: ${error.message}`);
      return '[Erro na transcrição do áudio]';
    }
  }

  /**
   * Processa áudio: baixa da Evolution e transcreve
   */
  async processAudioMessage(instanceKey: string, mediaData: any): Promise<string> {
    // Baixar áudio
    const audioBase64 = await this.downloadMediaFromEvolution(instanceKey, mediaData);
    if (!audioBase64) {
      return '[Não foi possível processar o áudio]';
    }

    // Determinar mime type (WhatsApp geralmente usa ogg/opus)
    const mimeType = mediaData.message?.audioMessage?.mimetype || 'audio/ogg';

    // Transcrever
    const transcription = await this.transcribeAudio(audioBase64, mimeType);
    return transcription;
  }

  // ========================================
  // SISTEMA DE INSTRUÇÕES DO DONO
  // ========================================

  /**
   * Salva instruções temporárias do dono
   * Ex: "Diga que estou dormindo e acordo às 8h"
   */
  async setOwnerInstructions(
    companyId: string,
    instructions: string,
    durationMinutes?: number
  ): Promise<void> {
    const until = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;

    await this.prisma.aISecretary.update({
      where: { companyId },
      data: {
        ownerInstructions: instructions,
        instructionsUntil: until,
      },
    });

    this.logger.log(`Owner instructions set for company ${companyId}: "${instructions}" until ${until || 'indefinitely'}`);
  }

  /**
   * Limpa instruções do dono
   */
  async clearOwnerInstructions(companyId: string): Promise<void> {
    await this.prisma.aISecretary.update({
      where: { companyId },
      data: {
        ownerInstructions: null,
        instructionsUntil: null,
      },
    });
  }

  /**
   * Busca instruções ativas (válidas no momento)
   */
  async getActiveInstructions(companyId: string): Promise<string | null> {
    const config = await this.prisma.aISecretary.findUnique({
      where: { companyId },
      select: { ownerInstructions: true, instructionsUntil: true },
    });

    if (!config?.ownerInstructions) return null;

    // Verificar se expirou
    if (config.instructionsUntil && new Date() > config.instructionsUntil) {
      // Limpar instruções expiradas
      await this.clearOwnerInstructions(companyId);
      return null;
    }

    return config.ownerInstructions;
  }

  /**
   * Interpreta comandos do dono para a secretária
   * Retorna true se era um comando, false se era mensagem normal
   */
  async parseOwnerCommand(
    messageContent: string,
    companyId: string
  ): Promise<{ isCommand: boolean; response?: string }> {
    const lowerContent = messageContent.toLowerCase().trim();

    // Comandos de limpar instruções
    if (lowerContent.includes('limpar instrução') ||
      lowerContent.includes('limpar instruções') ||
      lowerContent.includes('cancelar instrução') ||
      lowerContent === 'ok' && await this.getActiveInstructions(companyId)) {
      await this.clearOwnerInstructions(companyId);
      return { isCommand: true, response: '✅ Instruções limpas! Voltei ao modo normal.' };
    }

    // Detectar comandos de instrução usando IA
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    const prompt = `Analise esta mensagem e determine se é um COMANDO/INSTRUÇÃO para uma secretária ou uma PERGUNTA/CONVERSA normal.

Mensagem: "${messageContent}"

COMANDOS são instruções como:
- "Quando alguém ligar/chamar, diga que..."
- "Se alguém perguntar, fala que..."
- "Avisa que estou ocupado/dormindo/em reunião"
- "Por X horas/minutos, responda que..."

Retorne JSON:
{
  "isCommand": true/false,
  "instruction": "instrução formatada" (se for comando),
  "durationMinutes": número ou null (se mencionar tempo)
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isCommand && parsed.instruction) {
          await this.setOwnerInstructions(companyId, parsed.instruction, parsed.durationMinutes);

          const durationText = parsed.durationMinutes
            ? ` por ${parsed.durationMinutes} minutos`
            : '';

          return {
            isCommand: true,
            response: `✅ Entendido! Vou seguir essa instrução${durationText}:\n\n"${parsed.instruction}"\n\nPara cancelar, diga "limpar instruções".`
          };
        }
      }
    } catch (error) {
      this.logger.error(`Failed to parse owner command: ${error.message}`);
    }

    return { isCommand: false };
  }

  /**
   * Análise completa de mensagem com contexto
   */
  async analyzeMessage(
    messageContent: string,
    context: MessageContext,
  ): Promise<AIAnalysis> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      // Build context-aware prompt
      const systemPrompt = this.buildSystemPrompt(context);
      const analysisPrompt = this.buildAnalysisPrompt(messageContent, context);

      const result = await model.generateContent([systemPrompt, analysisPrompt]);
      const response = result.response.text();

      // Parse AI response (expecting JSON format)
      const analysis = this.parseAIResponse(response);

      return analysis;
    } catch (error) {
      this.logger.error(`AI analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera resposta automática baseada no contexto
   */
  async generateResponse(
    messageContent: string,
    context: MessageContext,
    aiConfig: any,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: aiConfig.temperature || 0.7,
          maxOutputTokens: 500,
        }
      });

      const systemPrompt = aiConfig.systemPrompt || this.buildSystemPrompt(context);
      const conversationContext = this.buildConversationContext(context);
      const productContext = this.buildProductContext(context.products);

      const prompt = `${systemPrompt}

${conversationContext}

${productContext}

Cliente: ${messageContent}

Assistente:`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return response.trim();
    } catch (error) {
      this.logger.error(`Response generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera resumo de conversa
   */
  async summarizeConversation(messages: any[]): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const conversationText = messages
        .map((m) => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`)
        .join('\n');

      const prompt = `Resuma a seguinte conversa em 2-3 frases, destacando os pontos principais e o status:

${conversationText}

Resumo:`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      this.logger.error(`Summarization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detecta oportunidades de venda
   */
  async detectOpportunity(messageContent: string, products: any[]): Promise<{
    hasOpportunity: boolean;
    recommendedProducts: string[];
    reasoning: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const productsList = products.map(p => `- ${p.name} (${p.variant}): ${p.price}`).join('\n');

      const prompt = `Analise esta mensagem de cliente e identifique se há oportunidade de venda:

Mensagem: "${messageContent}"

Produtos disponíveis:
${productsList}

Responda em JSON:
{
  "hasOpportunity": true/false,
  "recommendedProducts": ["produto1", "produto2"],
  "reasoning": "explicação"
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return { hasOpportunity: false, recommendedProducts: [], reasoning: 'Análise inconclusiva' };
    } catch (error) {
      this.logger.error(`Opportunity detection failed: ${error.message}`);
      return { hasOpportunity: false, recommendedProducts: [], reasoning: 'Erro na análise' };
    }
  }

  /**
   * Builds system prompt with business context - Secretária humanizada
   * Se isPersonalAssistant for true, age como secretária pessoal do dono
   */
  private buildSystemPrompt(context: MessageContext): string {
    const ownerName = context.ownerName || 'o proprietário';

    // Modo Secretária Pessoal - quando o dono está falando com ela
    if (context.isPersonalAssistant) {
      return `Você é Sofia, a secretária pessoal de ${ownerName}. ${ownerName} está falando diretamente com você.

SUA PERSONALIDADE:
- Você é eficiente, prestativa e fala de forma natural como uma brasileira
- Use emojis com moderação para deixar a conversa mais leve
- Seja informal e amigável - você conhece bem seu chefe
- Demonstre proatividade e iniciativa

SUAS FUNÇÕES COMO SECRETÁRIA PESSOAL:
- Ajudar a organizar tarefas e lembretes
- Anotar informações importantes que ${ownerName} mencionar
- Lembrar de compromissos e prazos
- Ajudar a redigir mensagens para clientes
- Resumir conversas de clientes quando solicitado
- Sugerir ações baseadas nas conversas recentes

COMO RESPONDER:
- Seja direta e objetiva, ${ownerName} é ocupado
- Confirme quando anotar algo: "Anotado, chefe! 📝"
- Seja proativa: "Quer que eu te lembre disso amanhã?"
- Para tarefas: "Deixa comigo! Vou cuidar disso."

EXEMPLOS DE INTERAÇÕES:
- "${ownerName}: Lembra de ligar pro João amanhã" → "Anotado! Vou te lembrar amanhã de ligar pro João. Quer que eu avise em algum horário específico? ⏰"
- "${ownerName}: Como tá a conversa com o cliente X?" → "Deixa eu ver aqui... [resumo da conversa]"
- "${ownerName}: Manda uma mensagem pro cliente Y agradecendo" → "Claro! Que tal algo assim: '[sugestão]' Posso mandar?"

${context.businessContext || ''}`;
    }

    // Modo normal - atendendo clientes
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
   * Builds conversation context
   */
  private buildConversationContext(context: MessageContext): string {
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return 'Início da conversa.';
    }

    const lastMessages = context.conversationHistory.slice(-5);
    const formatted = lastMessages
      .map((m) => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`)
      .join('\n');

    return `Histórico recente:\n${formatted}`;
  }

  /**
   * Builds product catalog context
   */
  private buildProductContext(products?: any[]): string {
    if (!products || products.length === 0) {
      return 'Nenhum produto cadastrado no momento.';
    }

    const activeProducts = products.filter(p => p.isActive !== false && p.quantity > 0);
    if (activeProducts.length === 0) {
      return 'Todos os produtos estão esgotados no momento.';
    }

    const productList = activeProducts
      .map((p) => {
        const stock = p.quantity > 10 ? 'Em estoque' : p.quantity > 0 ? `Últimas ${p.quantity} unidades` : 'Esgotado';
        return `- ${p.name}${p.variant ? ` (${p.variant})` : ''}: ${p.price} - ${stock}`;
      })
      .join('\n');

    return `PRODUTOS DISPONÍVEIS:\n${productList}`;
  }

  /**
   * Builds analysis prompt
   */
  private buildAnalysisPrompt(messageContent: string, context: MessageContext): string {
    return `Analise esta mensagem e retorne um JSON com a análise:

Mensagem: "${messageContent}"
Nome do cliente: ${context.contactName || 'Desconhecido'}

Retorne APENAS JSON no seguinte formato:
{
  "sentiment": "positive/neutral/negative",
  "urgency": "low/normal/high/urgent",
  "intent": "question/complaint/purchase/support/greeting/other",
  "suggestedResponse": "sugestão de resposta",
  "confidence": 0.0-1.0,
  "reasoning": "explicação breve",
  "shouldEscalate": true/false
}`;
  }

  /**
   * Parse AI response (handles JSON extraction)
   */
  private parseAIResponse(response: string): AIAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if no JSON found
      this.logger.warn('Could not parse AI response as JSON, using defaults');
      return {
        sentiment: 'neutral',
        urgency: 'normal',
        intent: 'other',
        suggestedResponse: 'Desculpe, não consegui processar sua mensagem. Pode reformular?',
        confidence: 0.3,
        reasoning: 'Resposta da IA não estava no formato esperado',
        shouldEscalate: true,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notifica o dono do estabelecimento sobre uma conversa importante
   */
  async notifyOwner(params: NotifyOwnerParams): Promise<boolean> {
    const { instanceKey, ownerPhone, customerName, customerPhone, reason, summary } = params;

    try {
      const message = `🔔 *Atenção necessária!*

👤 *Cliente:* ${customerName || 'Não identificado'}
📱 *Número:* ${customerPhone}

📋 *Motivo:* ${reason}

💬 *Resumo da conversa:*
${summary}

_Responda diretamente ao cliente pelo número acima ou acesse o painel._`;

      await this.sendWhatsAppMessage(instanceKey, ownerPhone, message);

      this.logger.log(`Owner notified: ${ownerPhone} about customer ${customerPhone}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to notify owner: ${error.message}`);
      return false;
    }
  }

  /**
   * Envia mensagem via Evolution API
   */
  async sendWhatsAppMessage(instanceKey: string, remoteJid: string, message: string): Promise<void> {
    try {
      // Formatar número se necessário
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
        throw new Error(`Evolution API error: ${response.status} - ${errorData}`);
      }

      this.logger.log(`Message sent to ${formattedJid}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error.message}`);
      throw error;
    }
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
   * Processa mensagem completa com lógica de secretária
   * Se isPersonalAssistant for true, age como secretária pessoal do dono
   */
  async processSecretaryMessage(
    messageContent: string,
    companyId: string,
    instanceKey: string,
    remoteJid: string,
    contactName?: string,
    isPersonalAssistant: boolean = false,
  ): Promise<{
    shouldRespond: boolean;
    response?: string;
    shouldNotifyOwner: boolean;
    notificationReason?: string;
  }> {
    // Buscar configuração da secretária
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    if (!aiConfig || !aiConfig.enabled) {
      return { shouldRespond: false, shouldNotifyOwner: false };
    }

    // Se é o proprietário no modo secretária pessoal, pular verificações de horário e escalação
    if (isPersonalAssistant) {
      this.logger.log(`👤 Processing as personal assistant for owner`);

      // Buscar contexto para o dono
      const messages = await this.prisma.message.findMany({
        where: { companyId, remoteJid },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const context: MessageContext = {
        conversationHistory: messages.reverse(),
        contactName: aiConfig.ownerName || contactName,
        ownerName: aiConfig.ownerName ?? undefined,
        isPersonalAssistant: true,
      };

      // Gerar resposta como secretária pessoal
      const response = await this.generateResponse(messageContent, context, aiConfig);

      return {
        shouldRespond: true,
        response,
        shouldNotifyOwner: false, // Nunca notifica o dono, ELE é o dono!
      };
    }

    // --- Fluxo normal para clientes ---

    // Buscar instruções ativas do dono
    const ownerInstructions = await this.getActiveInstructions(companyId);

    // Se há instruções do dono, usar como resposta prioritária
    if (ownerInstructions) {
      this.logger.log(`📋 Using owner instructions: "${ownerInstructions}"`);

      // Gerar resposta baseada nas instruções
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });
      const prompt = `Você é Sofia, secretária virtual. Seu chefe deixou esta instrução para você seguir:

INSTRUÇÃO DO CHEFE: "${ownerInstructions}"

Um cliente mandou esta mensagem: "${messageContent}"

Gere uma resposta educada e natural seguindo a instrução do chefe. Seja breve e simpática.`;

      try {
        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();

        return {
          shouldRespond: true,
          response,
          shouldNotifyOwner: true, // Notificar que alguém mandou mensagem
          notificationReason: `Cliente entrou em contato (instrução ativa: "${ownerInstructions.substring(0, 50)}...")`,
        };
      } catch (error) {
        this.logger.error(`Failed to generate instruction-based response: ${error.message}`);
      }
    }

    // Verificar horário de funcionamento
    if (!this.isWithinBusinessHours(aiConfig.businessHours)) {
      return {
        shouldRespond: true,
        response: 'Oi! No momento estamos fora do horário de atendimento. Deixa sua mensagem que respondemos assim que possível! 😊',
        shouldNotifyOwner: false,
      };
    }

    // Verificar palavras de escalação
    if (this.checkEscalationWords(messageContent, aiConfig.escalationWords)) {
      return {
        shouldRespond: true,
        response: `Entendi! Vou chamar o ${aiConfig.ownerName || 'responsável'} pra te atender, tá? Só um minutinho! 🙂`,
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
    ]);

    const context: MessageContext = {
      conversationHistory: messages.reverse(),
      contactName,
      products,
      ownerName: aiConfig.ownerName ?? undefined,
      isPersonalAssistant: false,
    };

    // Analisar mensagem
    const analysis = await this.analyzeMessage(messageContent, context);

    // Decidir ação baseado no modo
    if (aiConfig.mode === 'passive') {
      // Modo passivo: apenas analisa, não responde
      return {
        shouldRespond: false,
        shouldNotifyOwner: analysis.shouldEscalate,
        notificationReason: analysis.reasoning,
      };
    }

    // Verificar se deve escalar
    if (analysis.shouldEscalate || analysis.urgency === 'urgent' || analysis.intent === 'complaint') {
      const response = await this.generateResponse(messageContent, context, aiConfig);

      return {
        shouldRespond: true,
        response: response + `\n\nVou passar sua mensagem pro ${aiConfig.ownerName || 'responsável'}, tá? 🙂`,
        shouldNotifyOwner: true,
        notificationReason: analysis.escalationReason || analysis.reasoning,
      };
    }

    // Modo ativo ou supervisionado: gerar resposta
    if (aiConfig.mode === 'active') {
      const response = await this.generateResponse(messageContent, context, aiConfig);
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
   * Extrai informações importantes da mensagem e salva na memória do contato
   * Chamado após cada mensagem processada
   */
  async extractAndSaveMemory(
    contactId: string,
    messageContent: string,
    messageId: string,
  ): Promise<void> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Analise esta mensagem e extraia APENAS informações factuais importantes sobre o cliente.
Retorne um JSON array com as informações encontradas. Se não houver informações úteis, retorne [].

Mensagem: "${messageContent}"

TIPOS de informação para extrair:
- fact: fatos sobre a pessoa (nome, profissão, família, etc)
- preference: preferências (gosta de X, prefere Y)
- need: necessidades expressas (precisa de X, quer Y)
- objection: objeções/reclamações (achou caro, não gostou de X)
- interest: interesses em produtos/serviços
- context: contexto importante (horário preferido, forma de pagamento)

Retorne APENAS JSON array:
[
  {"type": "fact", "key": "nome_filho", "value": "Pedro", "confidence": 0.9},
  {"type": "interest", "key": "produto", "value": "Interessado em camisetas", "confidence": 0.8}
]

Se não encontrar nada relevante, retorne: []`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const memories = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(memories) || memories.length === 0) return;

      // Save each memory
      for (const mem of memories) {
        if (!mem.type || !mem.key || !mem.value) continue;

        await this.prisma.contactMemory.upsert({
          where: {
            contactId_type_key: {
              contactId,
              type: mem.type,
              key: mem.key,
            },
          },
          update: {
            value: mem.value,
            confidence: mem.confidence || 1.0,
            source: messageId,
          },
          create: {
            contactId,
            type: mem.type,
            key: mem.key,
            value: mem.value,
            confidence: mem.confidence || 1.0,
            source: messageId,
          },
        });
      }

      this.logger.log(`Saved ${memories.length} memories for contact ${contactId}`);
    } catch (error) {
      this.logger.error(`Memory extraction failed: ${error.message}`);
      // Não falhar silenciosamente, apenas logar
    }
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

      // Buscar últimas 100 mensagens para análise
      const messages = await this.prisma.message.findMany({
        where: { remoteJid: contact.remoteJid, companyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Resumo das memórias
      const memoryContext = contact.memories.map(m => `${m.type}: ${m.key}=${m.value}`).join('; ');

      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const conversationSummary = messages
        .reverse()
        .slice(0, 50) // Últimas 50 para o prompt
        .map(m => `[${m.direction}] ${m.content?.substring(0, 100)}`)
        .join('\n');

      const prompt = `Você é um analista de vendas. Analise este lead e forneça uma qualificação detalhada.

DADOS DO CONTATO:
- Nome: ${contact.pushName || 'Desconhecido'}
- Total de mensagens: ${messages.length}
- Cidade: ${contact.city || 'Desconhecido'}
- Ocupação: ${contact.occupation || 'Desconhecido'}

MEMÓRIAS EXTRAÍDAS:
${memoryContext || 'Nenhuma memória salva'}

RESUMO DAS CONVERSAS:
${conversationSummary}

ANALISE E RETORNE JSON:
{
  "score": 0-100,
  "status": "cold|warm|hot|customer",
  "analysis": "Análise detalhada de 2-3 parágrafos sobre:
    - Perfil do cliente
    - Interesses identificados
    - Objeções/preocupações
    - Probabilidade de conversão
    - Recomendações de abordagem"
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse lead analysis');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Salvar no contato
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
    } catch (error) {
      this.logger.error(`Lead qualification failed: ${error.message}`);
      throw error;
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
