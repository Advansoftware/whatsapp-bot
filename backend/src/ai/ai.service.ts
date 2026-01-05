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
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
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
          maxOutputTokens: 2048,
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

      // Se for rate limit, retorna mensagem amigável ao invés de lançar exceção
      if (this.isRateLimitError(error)) {
        this.logger.warn(`Rate limit exceeded, returning friendly message`);
        return '[Sistema temporariamente ocupado. Por favor, aguarde alguns segundos e tente novamente.]';
      }

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
   */
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
   * Builds prompt for personal assistant mode (when owner is talking)
   */
  private buildPersonalAssistantPrompt(aiConfig: any): string {
    const ownerName = aiConfig.ownerName || 'chefe';

    return `Você é Sofia, assistente pessoal de ${ownerName}. Agora ${ownerName} está falando DIRETAMENTE COM VOCÊ pelo WhatsApp.

CONTEXTO IMPORTANTE:
- A mensagem que você recebe é do SEU CHEFE (${ownerName}) falando com você
- ELE está te mandando mensagem, você deve responder A ELE
- Você NÃO está reportando sobre clientes - você está conversando com seu chefe
- Se a mensagem dele teve erro de transcrição, peça para ele repetir ou digitar

SUA FUNÇÃO:
- Responder diretamente ao que ${ownerName} perguntar ou pedir
- Ser útil, eficiente e amigável
- Ajudar com tarefas, lembretes, organização
- Se ele pedir informações sobre clientes ou conversas, forneça
- Se ele der instruções, confirme que entendeu

COMO RESPONDER:
- Fale diretamente COM ele, não SOBRE ele
- Use "você" para se referir a ele
- Seja informal e amigável
- Use emojis com moderação

EXEMPLOS:
- Se ele mandar "oi": "Oi! 👋 Como posso te ajudar?"
- Se o áudio dele falhou: "Oi! Não consegui entender o áudio, pode repetir ou digitar? 😊"
- Se ele perguntar algo: Responda diretamente a pergunta dele

NUNCA:
- Fale como se estivesse reportando sobre "clientes" quando é ele quem mandou a mensagem
- Diga "o cliente mandou" - ELE é seu chefe, não cliente
- Confunda quem está falando - é sempre ${ownerName} neste modo`;
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
   * Converte objeto com índices numéricos para array (para mediaData)
   */
  private objectToArray(obj: any): Uint8Array | null {
    if (!obj) return null;
    if (obj instanceof Uint8Array) return obj;
    if (Array.isArray(obj)) return new Uint8Array(obj);

    // Objeto com índices numéricos como chaves
    if (typeof obj === 'object') {
      const keys = Object.keys(obj).filter(k => !isNaN(Number(k)));
      if (keys.length > 0) {
        const arr = new Array(keys.length);
        for (const key of keys) {
          arr[Number(key)] = obj[key];
        }
        return new Uint8Array(arr);
      }
    }
    return null;
  }

  /**
   * Converte mediaMessage para formato correto
   */
  private convertMediaMessage(mediaData: any): any {
    if (!mediaData?.message) return mediaData;

    const message = mediaData.message;
    const convertedMessage: any = {};

    for (const key of Object.keys(message)) {
      const value = message[key];
      if (value && typeof value === 'object') {
        convertedMessage[key] = { ...value };

        // Converter campos que devem ser arrays
        const arrayFields = ['jpegThumbnail', 'waveform', 'fileEncSha256', 'fileSha256', 'mediaKey'];
        for (const field of arrayFields) {
          if (value[field] && typeof value[field] === 'object' && !(value[field] instanceof Uint8Array)) {
            const converted = this.objectToArray(value[field]);
            if (converted) {
              convertedMessage[key][field] = converted;
            }
          }
        }
      } else {
        convertedMessage[key] = value;
      }
    }

    return { ...mediaData, message: convertedMessage };
  }

  /**
   * Processa mensagem de áudio e retorna a transcrição
   */
  async processAudioMessage(instanceKey: string, mediaData: any): Promise<string> {
    try {
      this.logger.log(`📥 Downloading media for instance ${instanceKey}`);

      // Log completo do mediaData para debug
      this.logger.debug(`Full mediaData: ${JSON.stringify(mediaData, null, 2)}`);

      // Evolution API v2 espera o payload no mesmo formato do webhook
      // Vamos copiar apenas o necessário e remover campos problemáticos
      const payload: any = {};

      // Copiar key se existir
      if (mediaData.key) {
        payload.key = mediaData.key;
      }

      // Copiar message, removendo campos problemáticos recursivamente
      if (mediaData.message) {
        payload.message = {};
        for (const [key, value] of Object.entries(mediaData.message)) {
          // Pular messageContextInfo completamente
          if (key === 'messageContextInfo') continue;

          if (typeof value === 'object' && value !== null) {
            // Copiar o objeto removendo contextInfo interno
            payload.message[key] = { ...(value as any) };
            if (payload.message[key].contextInfo) {
              delete payload.message[key].contextInfo;
            }
          } else {
            payload.message[key] = value;
          }
        }
      }

      this.logger.debug(`Cleaned payload: ${JSON.stringify(payload, null, 2)}`);

      // Baixar mídia via Evolution API
      this.logger.debug(`Request to Evolution API getBase64FromMediaMessage/${instanceKey}`);

      const response = await fetch(`${this.evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const base64Audio = result.base64;

      if (!base64Audio) {
        throw new Error('No base64 audio data in response');
      }

      this.logger.log(`✅ Media downloaded successfully, size: ${base64Audio.length} chars`);

      // Usar Gemini para transcrever o áudio
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      // Detectar mime type
      const mimeType = result.mimetype || 'audio/ogg';

      const transcriptionResult = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Audio,
          },
        },
        'Transcreva o áudio acima em português. Retorne APENAS o texto transcrito, sem explicações ou formatação adicional.',
      ]);

      const transcription = transcriptionResult.response.text().trim();

      this.logger.log(`🎤 Audio transcribed successfully: ${transcription.substring(0, 50)}...`);

      return transcription;
    } catch (error) {
      this.logger.error(`Audio transcription failed: ${error.message}`);

      // Se for rate limit, retorna mensagem amigável
      if (this.isRateLimitError(error)) {
        this.logger.warn(`Rate limit exceeded during audio transcription`);
        return '[Erro na transcrição do áudio - limite de requisições excedido]';
      }

      return '[Erro na transcrição do áudio]';
    }
  }

  /**
   * Processa imagem enviada pelo dono e identifica produto
   */
  async processImageForInventory(
    instanceKey: string,
    mediaData: any,
    textMessage: string,
    companyId: string,
  ): Promise<{
    identified: boolean;
    productInfo?: {
      name: string;
      description: string;
      suggestedPrice?: string;
      category?: string;
    };
    response: string;
    awaitingConfirmation?: boolean;
    pendingProduct?: any;
  }> {
    try {
      this.logger.log(`📷 Processing image for inventory from owner`);

      // Preparar payload para Evolution API - mesmo formato do áudio
      const payload: any = {
        message: {},
        key: {},
      };

      // Extrair key
      if (mediaData.key) {
        payload.key = mediaData.key;
      }

      // Extrair message e garantir que contextInfo existe
      if (mediaData.message) {
        const messageType = Object.keys(mediaData.message).find(k => k.endsWith('Message'));
        if (messageType && mediaData.message[messageType]) {
          payload.message[messageType] = {
            ...mediaData.message[messageType],
          };
          if (!payload.message[messageType].contextInfo) {
            payload.message[messageType].contextInfo = {};
          }
        } else {
          payload.message = mediaData.message;
        }
      }

      const response = await fetch(`${this.evolutionApiUrl}/chat/getBase64FromMediaMessage/${instanceKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.evolutionApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const base64Image = result.base64;

      if (!base64Image) {
        throw new Error('No base64 image data in response');
      }

      this.logger.log(`✅ Image downloaded successfully, size: ${base64Image.length} chars`);

      // Usar Gemini para analisar a imagem
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      });

      const mimeType = result.mimetype || 'image/jpeg';

      // Extrair quantidade do texto se mencionado
      const quantityMatch = textMessage.match(/(\d+)\s*(unidade|item|peça|produto|un|pç)/i)
        || textMessage.match(/adiciona(?:r)?\s+(\d+)/i)
        || textMessage.match(/(\d+)\s*desse/i);
      const suggestedQuantity = quantityMatch ? parseInt(quantityMatch[1]) : null;

      const analysisResult = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        `Analise esta imagem de produto e identifique:

1. O que é o produto (nome comercial provável)
2. Uma descrição breve
3. Categoria (eletrônicos, roupas, alimentos, cosméticos, etc)
4. Se possível, sugira uma faixa de preço de mercado

O usuário disse: "${textMessage}"
${suggestedQuantity ? `Quantidade mencionada: ${suggestedQuantity} unidades` : ''}

Responda em JSON:
{
  "name": "Nome do produto",
  "description": "Descrição breve",
  "category": "Categoria",
  "suggestedPrice": "R$ XX,XX - R$ YY,YY (ou null se não souber)",
  "confidence": 0.0-1.0
}`
      ]);

      const analysisText = analysisResult.response.text();
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          identified: false,
          response: 'Não consegui identificar bem o produto na imagem. Pode me enviar outra foto ou descrever o que é? 📸',
        };
      }

      const productInfo = JSON.parse(jsonMatch[0]);

      // Criar resposta pedindo confirmação
      const confirmationMessage = `📦 **Identificado:** ${productInfo.name}

📝 ${productInfo.description}
📂 Categoria: ${productInfo.category || 'Geral'}
${productInfo.suggestedPrice ? `💰 Preço sugerido: ${productInfo.suggestedPrice}` : ''}
${suggestedQuantity ? `📊 Quantidade: ${suggestedQuantity} unidades` : ''}

Para cadastrar no inventário, me informe:
• Preço de venda (ex: 29.90)
${!suggestedQuantity ? '• Quantidade em estoque' : ''}
• Variante/tamanho (opcional)

Ou diga "confirma" com o preço pra eu cadastrar! 😊`;

      return {
        identified: true,
        productInfo: {
          name: productInfo.name,
          description: productInfo.description,
          category: productInfo.category,
          suggestedPrice: productInfo.suggestedPrice,
        },
        response: confirmationMessage,
        awaitingConfirmation: true,
        pendingProduct: {
          name: productInfo.name,
          description: productInfo.description,
          category: productInfo.category,
          quantity: suggestedQuantity || 0,
          imageBase64: base64Image,
          imageMimeType: mimeType,
        },
      };
    } catch (error) {
      this.logger.error(`Image processing failed: ${error.message}`);

      if (this.isRateLimitError(error)) {
        return {
          identified: false,
          response: 'Estou com muitas requisições no momento. Tenta de novo em alguns segundos! ⏳',
        };
      }

      return {
        identified: false,
        response: 'Tive um probleminha pra processar a imagem. Pode tentar enviar de novo? 📸',
      };
    }
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

      this.logger.log(`✅ Product created: ${product.id} - ${product.name}`);

      const response = `✅ Produto cadastrado com sucesso!

📦 **${product.name}**${product.variant ? ` (${product.variant})` : ''}
💰 Preço: R$ ${product.price.toFixed(2)}
📊 Estoque: ${product.quantity} unidades

O produto já está disponível no seu inventário! 🎉`;

      return {
        success: true,
        product,
        response,
      };
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`);

      return {
        success: false,
        response: 'Ops, tive um problema ao cadastrar o produto. Tenta novamente? 😅',
      };
    }
  }

  /**
   * Processa confirmação de cadastro de produto do dono
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
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        }
      });

      const prompt = `O usuário está confirmando o cadastro de um produto.

Produto pendente:
- Nome: ${pendingProduct.name}
- Descrição: ${pendingProduct.description || 'N/A'}
- Quantidade sugerida: ${pendingProduct.quantity || 'não informada'}

Mensagem do usuário: "${messageContent}"

Extraia as informações da mensagem:
1. Se ele confirmou (disse sim, ok, confirma, etc)
2. O preço mencionado (número decimal, ex: 29.90)
3. Quantidade (se mencionou)
4. Variante/tamanho (se mencionou)

Responda em JSON:
{
  "confirmed": true/false,
  "price": 29.90 (número ou null),
  "quantity": 10 (número ou null),
  "variant": "Tamanho M" (string ou null),
  "needsMoreInfo": "O que falta" (string ou null se tudo ok)
}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { confirmed: false, needsMoreInfo: 'Não entendi. Pode confirmar com o preço?' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.confirmed) {
        return { confirmed: false };
      }

      if (!parsed.price) {
        return { confirmed: false, needsMoreInfo: 'Qual o preço de venda? (ex: 29.90)' };
      }

      const quantity = parsed.quantity || pendingProduct.quantity || 1;

      return {
        confirmed: true,
        productData: {
          name: pendingProduct.name,
          description: pendingProduct.description,
          price: parseFloat(parsed.price),
          quantity: quantity,
          variant: parsed.variant || null,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse product confirmation: ${error.message}`);
      return { confirmed: false, needsMoreInfo: 'Tive um probleminha. Pode repetir?' };
    }
  }

  /**
   * Analisa se a mensagem do dono é um comando/instrução para a secretária
   */
  async parseOwnerCommand(messageContent: string, companyId: string): Promise<{
    isCommand: boolean;
    commandType?: 'instruction' | 'query' | 'config';
    response?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        }
      });

      const prompt = `Você é uma secretária virtual inteligente. Analise a mensagem do seu chefe (dono) e determine:

1. Se é um COMANDO/INSTRUÇÃO para você (ex: "avise todos os clientes que...", "quando alguém perguntar sobre X, diga Y", "mude sua forma de responder")
2. Se é uma CONSULTA sobre algo (ex: "quantas mensagens hoje?", "quem me procurou?", "resumo do dia")
3. Se é apenas uma CONVERSA normal

Mensagem do chefe: "${messageContent}"

Responda em JSON:
{
  "isCommand": true/false,
  "commandType": "instruction" | "query" | "conversation",
  "response": "Sua resposta ao chefe (confirme o comando ou responda a consulta)"
}

Se for instrução, confirme que entendeu e vai seguir.
Se for consulta, responda de forma útil.
Se for conversa, responda naturalmente como assistente pessoal.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isCommand: parsed.isCommand || false,
          commandType: parsed.commandType,
          response: parsed.response,
        };
      }

      // Se não conseguir parsear, trata como conversa normal
      return { isCommand: false };
    } catch (error) {
      this.logger.error(`Failed to parse owner command: ${error.message}`);

      // Se for rate limit, não lança exceção
      if (this.isRateLimitError(error)) {
        return { isCommand: false };
      }

      return { isCommand: false };
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
    };

    // Se é modo assistente pessoal (dono), responde diretamente como assistente
    if (isPersonalAssistantMode) {
      const response = await this.generateResponse(messageContent, context, {
        ...aiConfig,
        systemPrompt: this.buildPersonalAssistantPrompt(aiConfig),
      });
      return {
        shouldRespond: true,
        response,
        shouldNotifyOwner: false,
      };
    }

    // Analisar mensagem (apenas para clientes)
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

      // Buscar últimas 500 mensagens para análise mais completa
      const messages = await this.prisma.message.findMany({
        where: { remoteJid: contact.remoteJid, companyId },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      // Resumo das memórias
      const memoryContext = contact.memories.map(m => `${m.type}: ${m.key}=${m.value}`).join('; ');

      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      // Usar mais mensagens com texto mais completo
      const conversationSummary = messages
        .reverse()
        .slice(0, 200) // Últimas 200 mensagens para análise mais detalhada
        .map(m => `[${m.direction === 'incoming' ? contact.pushName || 'CONTATO' : 'EU'}] ${m.content?.substring(0, 300) || '[mídia]'}`)
        .join('\n');

      const prompt = `Você é um analista de vendas experiente. Sua tarefa é analisar um CONTATO/LEAD específico.

⚠️ ATENÇÃO - IDENTIFIQUE CORRETAMENTE AS PARTES:
- Mensagens marcadas com [EU] = São mensagens que EU enviei (o dono desta conta de WhatsApp)
- Mensagens marcadas com [${contact.pushName || 'CONTATO'}] = São mensagens do CONTATO que estou analisando

🎯 VOCÊ DEVE ANALISAR APENAS O CONTATO "${contact.pushName || 'CONTATO'}", NÃO A MIM.
A análise é sobre a pessoa que me enviou mensagens, não sobre mim que estou enviando.

DADOS DO CONTATO A SER ANALISADO:
- Nome do Contato: ${contact.pushName || 'Desconhecido'}
- Total de mensagens na conversa: ${messages.length}
- Cidade: ${contact.city || 'Desconhecido'}
- Estado: ${contact.state || 'Desconhecido'}
- Ocupação: ${contact.occupation || 'Desconhecido'}
- Universidade: ${contact.university || 'N/A'}
- Curso: ${contact.course || 'N/A'}

MEMÓRIAS EXTRAÍDAS SOBRE O CONTATO:
${memoryContext || 'Nenhuma memória salva ainda'}

HISTÓRICO DA CONVERSA (${messages.length} mensagens):
- [EU] = minhas mensagens (ignore para a análise do perfil)
- [${contact.pushName || 'CONTATO'}] = mensagens do contato (FOCO DA ANÁLISE)

${conversationSummary}

FAÇA UMA ANÁLISE PROFUNDA SOBRE O CONTATO "${contact.pushName || 'CONTATO'}" E RETORNE JSON:
{
  "score": 0-100,
  "status": "cold|warm|hot|qualified|customer",
  "analysis": "Escreva uma análise DETALHADA de 4-5 parágrafos sobre o CONTATO cobrindo:
    
    ### Perfil do Contato
    Quem é ${contact.pushName || 'este contato'}? O que sabemos sobre ele(a)? Qual seu contexto de vida?
    
    ### Interesses e Necessidades  
    O que ${contact.pushName || 'o contato'} busca? Quais produtos/serviços demonstrou interesse? Por que entrou em contato?
    
    ### Objeções e Preocupações
    Quais dúvidas ou resistências ${contact.pushName || 'o contato'} demonstrou? Houve negociação de preço?
    
    ### Histórico de Interação
    Como foi a evolução da conversa com ${contact.pushName || 'o contato'}? Houve compras anteriores?
    
    ### Recomendações
    Como devo abordar ${contact.pushName || 'este contato'}? Qual a melhor estratégia de venda?"
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
