import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { ConversationMemoryService } from './conversation-memory.service';

export interface ContextBuildParams {
  companyId: string;
  contactId?: string;
  remoteJid?: string;
  currentMessage: string;
  contactName?: string;
  isPersonalAssistant?: boolean;
}

export interface BuiltContext {
  systemContext: string;
  conversationHistory: string;
  relevantKnowledge: string;
  memoryContext: string;
  pendingItems: string;
  totalTokensEstimate: number;
}

/**
 * Serviço para construir contexto otimizado para prompts da IA
 * Combina RAG, memórias e histórico de forma inteligente
 */
@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);
  private readonly MAX_CONTEXT_TOKENS = 8000; // Limite para contexto
  private readonly CHARS_PER_TOKEN = 4; // Estimativa

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly conversationMemory: ConversationMemoryService,
  ) { }

  /**
   * Constrói contexto completo e otimizado para a IA
   */
  async buildContext(params: ContextBuildParams): Promise<BuiltContext> {
    const {
      companyId,
      contactId,
      remoteJid,
      currentMessage,
      contactName,
      isPersonalAssistant,
    } = params;

    let systemContext = '';
    let conversationHistory = '';
    let relevantKnowledge = '';
    let memoryContext = '';
    let pendingItemsText = '';

    // 1. Buscar configuração da secretária
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    // 2. Buscar conhecimento relevante usando RAG
    relevantKnowledge = await this.getRelevantKnowledge(companyId, currentMessage);

    // 3. Se tiver contato, buscar contexto de memória
    if (contactId && remoteJid) {
      const fullContext = await this.conversationMemory.getFullConversationContext(
        companyId,
        contactId,
        remoteJid,
        isPersonalAssistant ? 10 : 20, // Menos mensagens para assistente pessoal
      );

      // Formatar histórico de conversa
      conversationHistory = this.formatConversationHistory(fullContext.recentMessages);

      // Adicionar memórias
      if (fullContext.memories) {
        memoryContext = `📝 MEMÓRIA DO CONTATO:\n${fullContext.memories}`;
      }

      // Adicionar resumos de conversas anteriores
      if (fullContext.summaries.length > 0) {
        memoryContext += `\n\n📚 HISTÓRICO ANTERIOR:\n${fullContext.summaries.join('\n---\n')}`;
      }

      // Itens pendentes
      if (fullContext.pendingItems.length > 0) {
        pendingItemsText = `⚠️ ITENS PENDENTES:\n${fullContext.pendingItems.map(i => `- ${i}`).join('\n')}`;
      }
    }

    // 4. Buscar correções de erros
    const errorCorrections = await this.getErrorCorrections(companyId);
    if (errorCorrections) {
      systemContext += `\n\n${errorCorrections}`;
    }

    // 5. Calcular estimativa de tokens
    const totalContent = systemContext + conversationHistory + relevantKnowledge + memoryContext + pendingItemsText;
    const totalTokensEstimate = Math.ceil(totalContent.length / this.CHARS_PER_TOKEN);

    // 6. Se exceder limite, truncar inteligentemente
    if (totalTokensEstimate > this.MAX_CONTEXT_TOKENS) {
      const result = this.truncateContext({
        systemContext,
        conversationHistory,
        relevantKnowledge,
        memoryContext,
        pendingItems: pendingItemsText,
      });

      return {
        ...result,
        totalTokensEstimate: this.MAX_CONTEXT_TOKENS,
      };
    }

    return {
      systemContext,
      conversationHistory,
      relevantKnowledge,
      memoryContext,
      pendingItems: pendingItemsText,
      totalTokensEstimate,
    };
  }

  /**
   * Busca conhecimento relevante usando RAG (busca semântica com pgvector)
   */
  private async getRelevantKnowledge(companyId: string, query: string): Promise<string> {
    try {
      // 1. Gerar embedding da query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const vectorStr = this.embeddingService.formatForPgVector(queryEmbedding);

      // 2. Busca vetorial nativa com pgvector usando operador de distância cosseno
      const results = await this.prisma.$queryRaw<Array<{
        id: string;
        content: string;
        category: string;
        similarity: number;
      }>>`
        SELECT 
          tc.id,
          tc.content,
          tc.category,
          (1 - (tc.embedding <=> ${vectorStr}::vector))::float as similarity
        FROM training_chunks tc
        WHERE tc.company_id = ${companyId}
          AND tc.embedding IS NOT NULL
        ORDER BY tc.embedding <=> ${vectorStr}::vector
        LIMIT 5
      `;

      // Filtrar por similaridade mínima de 50%
      const similar = results.filter(r => r.similarity >= 0.5);

      if (similar.length === 0) {
        // Fallback: buscar conhecimento por keywords
        return this.getKeywordKnowledge(companyId, query);
      }

      // 3. Formatar conhecimento encontrado
      let knowledge = '📚 CONHECIMENTO RELEVANTE:\n';
      for (const item of similar) {
        knowledge += `[Similaridade: ${(item.similarity * 100).toFixed(0)}%]\n${item.content}\n\n`;
      }

      return knowledge;
    } catch (error) {
      this.logger.error(`RAG search failed: ${error.message}`);
      return this.getKeywordKnowledge(companyId, query);
    }
  }

  /**
   * Fallback: busca por keywords (quando RAG não está disponível)
   */
  private async getKeywordKnowledge(companyId: string, query: string): Promise<string> {
    try {
      const lowerQuery = query.toLowerCase();

      // Buscar conhecimento da empresa
      const knowledge = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          isActive: true,
          category: { in: ['faq', 'policy', 'product', 'script'] },
        },
        orderBy: { priority: 'desc' },
      });

      if (knowledge.length === 0) return '';

      // Filtrar por relevância (keywords match)
      const relevant = knowledge.filter(k => {
        if (k.keywords.length === 0) return k.priority > 5;
        return k.keywords.some(kw => lowerQuery.includes(kw.toLowerCase()));
      });

      if (relevant.length === 0) return '';

      let context = '📚 BASE DE CONHECIMENTO:\n';
      for (const item of relevant.slice(0, 5)) {
        context += `[${item.category.toUpperCase()}] ${item.title}: ${item.content}\n\n`;
      }

      return context;
    } catch (error) {
      this.logger.error(`Keyword search failed: ${error.message}`);
      return '';
    }
  }

  /**
   * Busca correções de erros anteriores
   */
  private async getErrorCorrections(companyId: string): Promise<string> {
    try {
      const corrections = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          category: 'error_correction',
          isActive: true,
        },
        orderBy: { priority: 'desc' },
        take: 5,
      });

      if (corrections.length === 0) return '';

      let context = '⚠️ ERROS A EVITAR:\n';
      for (const corr of corrections) {
        context += `- NÃO diga: "${corr.wrongResponse}"\n`;
        context += `  DIGA: "${corr.correctResponse}"\n`;
      }

      return context;
    } catch (error) {
      return '';
    }
  }

  /**
   * Formata histórico de conversa para o prompt
   */
  private formatConversationHistory(messages: any[]): string {
    if (!messages || messages.length === 0) {
      return 'Início da conversa.';
    }

    const formatted = messages
      .map(m => `[${m.direction === 'incoming' ? 'CLIENTE' : 'VOCÊ'}]: ${m.content}`)
      .join('\n');

    return `HISTÓRICO DA CONVERSA:\n${formatted}`;
  }

  /**
   * Trunca contexto inteligentemente mantendo informações importantes
   */
  private truncateContext(context: {
    systemContext: string;
    conversationHistory: string;
    relevantKnowledge: string;
    memoryContext: string;
    pendingItems: string;
  }): Omit<BuiltContext, 'totalTokensEstimate'> {
    const maxChars = this.MAX_CONTEXT_TOKENS * this.CHARS_PER_TOKEN;

    // Prioridade: pendingItems > memoryContext > conversationHistory > relevantKnowledge > systemContext
    // Mas mantemos conversationHistory com prioridade alta pois é crucial

    let remaining = maxChars;

    // Sempre mantém itens pendentes (importantes para continuidade)
    const pendingItems = context.pendingItems.substring(0, Math.min(500, remaining));
    remaining -= pendingItems.length;

    // Mantém últimas mensagens do histórico
    const historyLimit = Math.min(context.conversationHistory.length, remaining * 0.4);
    const conversationHistory = context.conversationHistory.substring(
      context.conversationHistory.length - historyLimit,
    );
    remaining -= conversationHistory.length;

    // Mantém memórias importantes
    const memoryLimit = Math.min(context.memoryContext.length, remaining * 0.3);
    const memoryContext = context.memoryContext.substring(0, memoryLimit);
    remaining -= memoryContext.length;

    // Conhecimento relevante
    const knowledgeLimit = Math.min(context.relevantKnowledge.length, remaining * 0.8);
    const relevantKnowledge = context.relevantKnowledge.substring(0, knowledgeLimit);
    remaining -= relevantKnowledge.length;

    // System context
    const systemContext = context.systemContext.substring(0, remaining);

    return {
      systemContext,
      conversationHistory,
      relevantKnowledge,
      memoryContext,
      pendingItems,
    };
  }

  /**
   * Cria contexto compacto para resposta rápida
   */
  async buildQuickContext(
    companyId: string,
    remoteJid: string,
    lastNMessages: number = 5,
  ): Promise<string> {
    const messages = await this.prisma.message.findMany({
      where: { companyId, remoteJid },
      orderBy: { createdAt: 'desc' },
      take: lastNMessages,
      select: { content: true, direction: true },
    });

    return messages
      .reverse()
      .map(m => `${m.direction === 'incoming' ? 'Cliente' : 'Você'}: ${m.content}`)
      .join('\n');
  }
}
