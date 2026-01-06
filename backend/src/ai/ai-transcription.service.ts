import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AITranscriptionService {
  private readonly logger = new Logger(AITranscriptionService.name);
  private genAI: GoogleGenerativeAI;
  private evolutionApiUrl: string;
  private evolutionApiKey: string;
  private readonly MODEL_NAME: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.evolutionApiUrl = this.config.get<string>('EVOLUTION_API_URL') || 'http://evolution:8080';
    this.evolutionApiKey = this.config.get<string>('EVOLUTION_API_KEY') || '';
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Verifica se o erro é de rate limit (429)
   */
  private isRateLimitError(error: any): boolean {
    return error?.status === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('rate limit');
  }

  /**
   * Converte objeto com índices numéricos para Buffer/base64
   */
  private objectToBase64(obj: any): string | null {
    if (!obj) return null;
    if (typeof obj === 'string') return obj; // Já é base64
    if (Buffer.isBuffer(obj)) return obj.toString('base64');
    if (obj instanceof Uint8Array) return Buffer.from(obj).toString('base64');
    if (Array.isArray(obj)) return Buffer.from(obj).toString('base64');

    // Objeto com índices numéricos como chaves
    if (typeof obj === 'object') {
      const keys = Object.keys(obj).filter(k => !isNaN(Number(k)));
      if (keys.length > 0) {
        const arr = new Array(keys.length);
        for (const key of keys) {
          arr[Number(key)] = obj[key];
        }
        return Buffer.from(arr).toString('base64');
      }
    }
    return null;
  }

  /**
   * Processa mensagem de áudio e retorna a transcrição
   */
  async processAudioMessage(instanceKey: string, mediaData: any): Promise<string> {
    try {
      this.logger.log(`📥 Downloading media for instance ${instanceKey}`);

      // Evolution API DTO: getBase64FromMediaMessageDto { message: proto.WebMessageInfo }
      // O mediaData é o WebMessageInfo completo do webhook, então enviamos diretamente
      const payload = {
        message: mediaData,
        convertToMp4: false,
      };

      this.logger.debug(`Payload message keys: ${JSON.stringify(Object.keys(mediaData))}`);

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

      const prompt = `Analise esta imagem de produto e extraia informações para cadastro de inventário.
      
      Texto acompanhante do dono: "${textMessage}"
      
      RETORNE APENAS UM JSON (sem markdown) com:
      {
        "identified": true/false (se é um produto claro),
        "name": "Nome curto e claro do produto",
        "description": "Descrição detalhada visual do produto, cores, marca se visível",
        "category": "Categoria sugerida",
        "suggestedPrice": "Sugestão de preço (R$) baseado no tipo de produto (estimativa) ou null se não souber"
      }`;

      const analysisResult = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        prompt,
      ]);

      const analysisText = analysisResult.response.text();
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          identified: false,
          response: 'Não consegui identificar o produto na imagem. Pode tentar novamente ou descrever o que é?',
        };
      }

      const analysis = JSON.parse(jsonMatch[0]);

      if (!analysis.identified) {
        return {
          identified: false,
          response: 'A imagem não parece clara o suficiente. Tente tirar uma foto melhor do produto.',
        };
      }

      // Produto identificado
      return {
        identified: true,
        productInfo: {
          name: analysis.name,
          description: analysis.description,
          suggestedPrice: analysis.suggestedPrice,
          category: analysis.category,
        },
        response: `Identifiquei o produto!\n\n📦 *${analysis.name}*\n📝 ${analysis.description}\n🏷️ Categoria: ${analysis.category || 'Geral'}\n${suggestedQuantity ? `🔢 Quantidade: ${suggestedQuantity}` : ''}\n\nPosso cadastrar? Digite "Sim" ou corrija as informações.`,
        awaitingConfirmation: true,
        pendingProduct: {
          ...analysis,
          quantity: suggestedQuantity || 1,
        }
      };

    } catch (error) {
      this.logger.error(`Image processing failed: ${error.message}`);
      return {
        identified: false,
        response: 'Tive um problema ao processar a imagem. Tente novamente.',
      };
    }
  }
}
