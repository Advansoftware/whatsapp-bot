import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { ContextBuilderService } from './rag/context-builder.service';

interface ResponseParams {
  messageContent: string;
  context: any;
  aiConfig: any;
  temperature?: number;
  systemPrompt?: string;
  tone?: string;
  companyId?: string;
  contactId?: string;
  remoteJid?: string;
  isPersonalAssistant?: boolean;
}

@Injectable()
export class AIResponseService {
  private readonly logger = new Logger(AIResponseService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly contextBuilder: ContextBuilderService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Gera resposta usando Gemini com RAG e contexto melhorado
   */
  async generateResponse(params: ResponseParams): Promise<string> {
    try {
      const {
        messageContent,
        context,
        aiConfig,
        temperature,
        systemPrompt,
        companyId,
        contactId,
        remoteJid,
        isPersonalAssistant,
      } = params;

      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: {
          temperature: temperature || aiConfig.temperature || 0.7,
        }
      });

      // Construir contexto enriquecido com RAG se disponível
      let enrichedContext = '';

      if (companyId && this.contextBuilder) {
        try {
          const builtContext = await this.contextBuilder.buildContext({
            companyId,
            contactId,
            remoteJid,
            currentMessage: messageContent,
            contactName: context.contactName,
            isPersonalAssistant,
          });

          // Adicionar conhecimento RAG
          if (builtContext.relevantKnowledge) {
            enrichedContext += `\n${builtContext.relevantKnowledge}\n`;
          }

          // Adicionar memórias do contato
          if (builtContext.memoryContext) {
            enrichedContext += `\n${builtContext.memoryContext}\n`;
          }

          // Adicionar itens pendentes
          if (builtContext.pendingItems) {
            enrichedContext += `\n${builtContext.pendingItems}\n`;
          }

          // Usar histórico do RAG se mais completo
          if (builtContext.conversationHistory &&
            builtContext.conversationHistory.length > (context.conversationHistory?.length || 0)) {
            context.conversationHistory = builtContext.conversationHistory;
          }
        } catch (ragError) {
          this.logger.warn(`RAG context building failed: ${ragError.message}`);
        }
      }

      // Construir prompt do sistema
      const finalSystemPrompt = systemPrompt || aiConfig.systemPrompt || this.getDefaultSystemPrompt();

      // Adicionar contexto de negócio se disponível
      let contextPrompt = '';
      if (context.businessContext) {
        contextPrompt += `\nCONTEXTO DO NEGÓCIO:\n${context.businessContext}\n`;
      }

      // Adicionar orientações de tom
      const tonePrompt = this.getTonePrompt(aiConfig.personality || 'professional');

      // Formatar histórico de conversa de forma otimizada
      const conversationHistory = this.formatConversationHistory(context.conversationHistory);

      // Montar prompt completo
      const fullPrompt = [
        finalSystemPrompt,
        tonePrompt,
        contextPrompt,
        enrichedContext,
        `\n--- CONVERSA ATUAL ---\n`,
        conversationHistory,
        `\n[CLIENTE agora]: "${messageContent}"`,
        `\nResponda de forma natural, concisa e útil como a assistente virtual. Leve em consideração TODO o contexto acima para dar uma resposta coerente.`
      ].filter(Boolean).join('\n');

      const result = await model.generateContent(fullPrompt);
      return result.response.text();

    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera resposta para modo assistente pessoal (dono)
   * Usa mais contexto de conversas anteriores
   */
  async generatePersonalAssistantResponse(params: ResponseParams): Promise<string> {
    return this.generateResponse({
      ...params,
      isPersonalAssistant: true,
    });
  }

  /**
   * Formata histórico de conversa para incluir mais contexto
   */
  private formatConversationHistory(messages: any[]): string {
    if (!messages || messages.length === 0) {
      return 'Início da conversa.';
    }

    // Incluir mais mensagens para melhor contexto
    const lastMessages = messages.slice(-15);

    const formatted = lastMessages.map(m => {
      const role = m.direction === 'incoming' ? 'CLIENTE' : 'VOCÊ';
      const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      return `[${role}${time ? ` ${time}` : ''}]: ${m.content}`;
    }).join('\n');

    return formatted;
  }

  private getDefaultSystemPrompt(): string {
    return `Você é um assistente virtual útil e profissional. 
    Seu objetivo é ajudar o cliente de forma clara e objetiva.
    Mantenha respostas curtas e diretas, ideais para WhatsApp.
    
    IMPORTANTE:
    - Leia TODO o histórico da conversa antes de responder
    - Mantenha coerência com o que já foi discutido
    - Se o cliente respondeu a uma pergunta sua, use essa resposta
    - Nunca "esqueça" o contexto da conversa`;
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
