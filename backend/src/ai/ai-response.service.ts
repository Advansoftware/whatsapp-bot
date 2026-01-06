import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ResponseParams {
  messageContent: string;
  context: any;
  aiConfig: any;
  temperature?: number;
  systemPrompt?: string;
  tone?: string;
}

@Injectable()
export class AIResponseService {
  private readonly logger = new Logger(AIResponseService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Gera resposta usando Gemini
   */
  async generateResponse(params: ResponseParams): Promise<string> {
    try {
      const { messageContent, context, aiConfig, temperature, systemPrompt } = params;

      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: temperature || aiConfig.temperature || 0.7,
        }
      });

      // Construir prompt do sistema
      const finalSystemPrompt = systemPrompt || aiConfig.systemPrompt || this.getDefaultSystemPrompt();

      // Adicionar contexto de negócio se disponível
      let contextPrompt = '';
      if (context.businessContext) {
        contextPrompt += `\nCONTEXTO DO NEGÓCIO:\n${context.businessContext}\n`;
      }

      // Adicionar orientações de tom
      const tonePrompt = this.getTonePrompt(aiConfig.personality || 'professional');

      // Montar prompt completo
      const fullPrompt = [
        finalSystemPrompt,
        tonePrompt,
        contextPrompt,
        `Histórico de conversa:\n${JSON.stringify(context.conversationHistory || [])}`,
        `Mensagem do usuário: "${messageContent}"`,
        `Responda como o assistente virtual da empresa.`
      ].join('\n\n');

      const result = await model.generateContent(fullPrompt);
      return result.response.text();

    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  private getDefaultSystemPrompt(): string {
    return `Você é um assistente virtual útil e profissional. 
    Seu objetivo é ajudar o cliente de forma clara e objetiva.
    Mantenha respostas curtas e diretas, ideais para WhatsApp.`;
  }

  private getTonePrompt(personality: string): string {
    switch (personality) {
      case 'friendly':
        return `TOM DE VOZ: Amigável, empático e acolhedor. Use emojis ocasionalmente. Fale como uma pessoa prestativa.`;
      case 'casual':
        return `TOM DE VOZ: Casual e descontraído. Use gírias leves se apropriado. Fale como um amigo.`;
      case 'professional':
      default:
        return `TOM DE VOZ: Profissional, polido e respeitoso. Evite gírias. Fale com autoridade e cortesia.`;
    }
  }
}
