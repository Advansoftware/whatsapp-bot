import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ConversationContext {
  messages: Array<{
    content: string;
    direction: string;
    createdAt: Date;
  }>;
  contactId: string;
  contactName?: string;
}

/**
 * Serviço para gerenciar memória de conversas de longo prazo
 * Cria resumos periódicos e mantém histórico compacto
 */
@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  // Configurações
  private readonly SUMMARY_THRESHOLD = 50; // Mensagens antes de criar resumo
  private readonly MAX_RECENT_MESSAGES = 20; // Mensagens recentes a manter em contexto

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Obtém contexto de memória completo para uma conversa
   * Combina: resumos antigos + memórias do contato + últimas mensagens
   */
  async getFullConversationContext(
    companyId: string,
    contactId: string,
    remoteJid: string,
    recentMessagesLimit: number = 20,
  ): Promise<{
    recentMessages: any[];
    summaries: string[];
    memories: string;
    pendingItems: string[];
  }> {
    // 1. Buscar últimas N mensagens
    const recentMessages = await this.prisma.message.findMany({
      where: { companyId, remoteJid },
      orderBy: { createdAt: 'desc' },
      take: recentMessagesLimit,
      select: {
        content: true,
        direction: true,
        createdAt: true,
        response: true,
      },
    });

    // 2. Buscar resumos de conversas anteriores
    const summaries = await this.prisma.conversationSummary.findMany({
      where: { companyId, contactId },
      orderBy: { endDate: 'desc' },
      take: 3, // Últimos 3 resumos
      select: {
        summary: true,
        keyTopics: true,
        pendingItems: true,
        endDate: true,
      },
    });

    // 3. Buscar memórias do contato
    const memories = await this.prisma.contactMemory.findMany({
      where: { contactId },
      orderBy: { updatedAt: 'desc' },
    });

    // Formatar memórias
    let memoriesText = '';
    if (memories.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const mem of memories) {
        if (!grouped[mem.type]) grouped[mem.type] = [];
        grouped[mem.type].push(`${mem.key}: ${mem.value}`);
      }

      if (grouped.fact) memoriesText += `Fatos: ${grouped.fact.join('; ')}\n`;
      if (grouped.preference) memoriesText += `Preferências: ${grouped.preference.join('; ')}\n`;
      if (grouped.need) memoriesText += `Necessidades: ${grouped.need.join('; ')}\n`;
      if (grouped.interest) memoriesText += `Interesses: ${grouped.interest.join('; ')}\n`;
      if (grouped.objection) memoriesText += `Objeções: ${grouped.objection.join('; ')}\n`;
    }

    // Coletar itens pendentes de resumos
    const allPendingItems = summaries.flatMap(s => s.pendingItems || []);

    return {
      recentMessages: recentMessages.reverse(), // Ordem cronológica
      summaries: summaries.map(s => s.summary),
      memories: memoriesText,
      pendingItems: allPendingItems,
    };
  }

  /**
   * Cria resumo de uma conversa quando atinge threshold
   */
  async createConversationSummary(
    companyId: string,
    contactId: string,
    remoteJid: string,
  ): Promise<string | null> {
    // 1. Verificar se precisa criar resumo
    const lastSummary = await this.prisma.conversationSummary.findFirst({
      where: { companyId, contactId },
      orderBy: { endDate: 'desc' },
    });

    const messagesQuery = {
      companyId,
      remoteJid,
      createdAt: lastSummary ? { gt: lastSummary.endDate } : undefined,
    };

    const messageCount = await this.prisma.message.count({
      where: messagesQuery,
    });

    if (messageCount < this.SUMMARY_THRESHOLD) {
      return null; // Não precisa criar resumo ainda
    }

    // 2. Buscar mensagens para resumir
    const messages = await this.prisma.message.findMany({
      where: messagesQuery,
      orderBy: { createdAt: 'asc' },
      select: {
        content: true,
        direction: true,
        createdAt: true,
      },
    });

    if (messages.length === 0) return null;

    // 3. Gerar resumo com IA
    const summary = await this.generateSummary(messages);

    // 4. Gerar embedding do resumo
    let embeddingVector: number[] | null = null;
    try {
      embeddingVector = await this.embeddingService.generateEmbedding(summary.summary);
    } catch (error) {
      this.logger.warn(`Failed to generate summary embedding: ${error.message}`);
    }

    // 5. Salvar resumo (usando SQL raw para suporte a pgvector)
    const startDate = messages[0].createdAt;
    const endDate = messages[messages.length - 1].createdAt;
    const summaryId = `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (embeddingVector) {
      const vectorStr = this.embeddingService.formatForPgVector(embeddingVector);

      await this.prisma.$executeRaw`
        INSERT INTO conversation_summaries (
          id, company_id, contact_id, start_date, end_date,
          summary, key_topics, key_facts, decisions, pending_items,
          overall_sentiment, message_count, embedding, created_at
        ) VALUES (
          ${summaryId},
          ${companyId},
          ${contactId},
          ${startDate},
          ${endDate},
          ${summary.summary},
          ${summary.keyTopics},
          ${summary.keyFacts},
          ${summary.decisions},
          ${summary.pendingItems},
          ${summary.sentiment},
          ${messages.length},
          ${vectorStr}::vector,
          NOW()
        )
      `;
    } else {
      // Sem embedding (fallback)
      await this.prisma.conversationSummary.create({
        data: {
          companyId,
          contactId,
          startDate,
          endDate,
          summary: summary.summary,
          keyTopics: summary.keyTopics,
          keyFacts: summary.keyFacts,
          decisions: summary.decisions,
          pendingItems: summary.pendingItems,
          overallSentiment: summary.sentiment,
          messageCount: messages.length,
        },
      });
    }

    this.logger.log(`Created conversation summary for contact ${contactId}: ${messages.length} messages`);
    return summary.summary;
  }

  /**
   * Gera resumo estruturado usando IA
   */
  private async generateSummary(messages: Array<{ content: string; direction: string; createdAt: Date }>): Promise<{
    summary: string;
    keyTopics: string[];
    keyFacts: string[];
    decisions: string[];
    pendingItems: string[];
    sentiment: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const conversationText = messages
        .map(m => `[${m.direction === 'incoming' ? 'CLIENTE' : 'ASSISTENTE'}]: ${m.content}`)
        .join('\n');

      const prompt = `Analise esta conversa e crie um resumo estruturado para referência futura.

CONVERSA:
${conversationText.substring(0, 15000)}

Retorne APENAS JSON no formato:
{
  "summary": "Resumo conciso da conversa em 2-3 frases",
  "keyTopics": ["tópico1", "tópico2"],
  "keyFacts": ["fato importante 1", "fato importante 2"],
  "decisions": ["decisão tomada 1"],
  "pendingItems": ["item pendente que precisa follow-up"],
  "sentiment": "positive|neutral|negative"
}

FOQUE em:
- Informações que seriam úteis em conversas futuras
- Compromissos ou promessas feitas
- Preferências ou objeções do cliente
- Itens que ficaram pendentes`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          summary: 'Não foi possível gerar resumo',
          keyTopics: [],
          keyFacts: [],
          decisions: [],
          pendingItems: [],
          sentiment: 'neutral',
        };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to generate summary: ${error.message}`);
      return {
        summary: 'Erro ao gerar resumo',
        keyTopics: [],
        keyFacts: [],
        decisions: [],
        pendingItems: [],
        sentiment: 'neutral',
      };
    }
  }

  /**
   * Busca resumos relevantes para uma query usando similaridade semântica com pgvector
   */
  async findRelevantSummaries(
    companyId: string,
    contactId: string,
    query: string,
    topK: number = 3,
  ): Promise<string[]> {
    try {
      // Gerar embedding da query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const vectorStr = this.embeddingService.formatForPgVector(queryEmbedding);

      // Busca vetorial nativa com pgvector usando operador de distância cosseno
      const results = await this.prisma.$queryRaw<Array<{ summary: string; similarity: number }>>`
        SELECT 
          cs.summary,
          (1 - (cs.embedding <=> ${vectorStr}::vector))::float as similarity
        FROM conversation_summaries cs
        WHERE cs.company_id = ${companyId}
          AND cs.contact_id = ${contactId}
          AND cs.embedding IS NOT NULL
        ORDER BY cs.embedding <=> ${vectorStr}::vector
        LIMIT ${topK}
      `;

      return results.map(r => r.summary);
    } catch (error) {
      this.logger.error(`Failed to find relevant summaries: ${error.message}`);
      return [];
    }
  }

  /**
   * Limpa resumos antigos para economizar espaço
   */
  async cleanupOldSummaries(companyId: string, keepLast: number = 10): Promise<number> {
    const summariesToKeep = await this.prisma.conversationSummary.findMany({
      where: { companyId },
      orderBy: { endDate: 'desc' },
      take: keepLast,
      select: { id: true },
    });

    const keepIds = summariesToKeep.map(s => s.id);

    const deleted = await this.prisma.conversationSummary.deleteMany({
      where: {
        companyId,
        id: { notIn: keepIds },
      },
    });

    return deleted.count;
  }
}
