import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessorService } from './document-processor.service';
import { ContextBuilderService, BuiltContext } from './context-builder.service';
import { ConversationMemoryService } from './conversation-memory.service';

export interface SearchResult {
  content: string;
  similarity: number;
  source: string;
  category: string;
}

export { BuiltContext };

/**
 * Serviço principal de RAG (Retrieval-Augmented Generation)
 * Usa pgvector para busca semântica de alta performance
 */
@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly documentProcessor: DocumentProcessorService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly conversationMemory: ConversationMemoryService,
  ) { }

  /**
   * Busca conhecimento relevante para uma query usando pgvector
   * Usa operador <=> para distância de cosseno (mais eficiente que carregar tudo na memória)
   */
  async search(companyId: string, query: string, limit: number = 5, minSimilarity: number = 0.5): Promise<SearchResult[]> {
    try {
      // Gerar embedding da query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const vectorStr = this.embeddingService.formatForPgVector(queryEmbedding);

      // Busca usando pgvector com operador de distância de cosseno
      // 1 - distância = similaridade (distância 0 = similaridade 1)
      const results = await this.prisma.$queryRaw<Array<{
        id: string;
        content: string;
        category: string;
        document_name: string;
        similarity: number;
      }>>`
        SELECT 
          tc.id,
          tc.content,
          tc.category,
          td.name as document_name,
          (1 - (tc.embedding <=> ${vectorStr}::vector))::float as similarity
        FROM training_chunks tc
        LEFT JOIN training_documents td ON tc.document_id = td.id
        WHERE tc.company_id = ${companyId}
        AND tc.embedding IS NOT NULL
        AND (1 - (tc.embedding <=> ${vectorStr}::vector)) >= ${minSimilarity}
        ORDER BY tc.embedding <=> ${vectorStr}::vector
        LIMIT ${limit}
      `;

      this.logger.debug(`pgvector search returned ${results.length} results`);

      return results.map(r => ({
        content: r.content,
        similarity: r.similarity,
        source: r.document_name || 'Desconhecido',
        category: r.category,
      }));
    } catch (error) {
      this.logger.error(`RAG search failed: ${error.message}`);

      // Fallback para busca em memória se pgvector falhar
      return this.searchFallback(companyId, query, limit, minSimilarity);
    }
  }

  /**
   * Fallback: busca em memória quando pgvector não está disponível
   */
  private async searchFallback(companyId: string, query: string, limit: number, minSimilarity: number): Promise<SearchResult[]> {
    try {
      this.logger.warn('Using fallback in-memory search');

      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Buscar todos os chunks (abordagem antiga)
      const chunks = await this.prisma.$queryRaw<Array<{
        id: string;
        content: string;
        category: string;
        embedding: string;
        document_name: string;
      }>>`
        SELECT 
          tc.id,
          tc.content,
          tc.category,
          tc.embedding::text as embedding,
          td.name as document_name
        FROM training_chunks tc
        LEFT JOIN training_documents td ON tc.document_id = td.id
        WHERE tc.company_id = ${companyId}
        AND tc.embedding IS NOT NULL
      `;

      if (chunks.length === 0) return [];

      // Calcular similaridade em memória
      const results = chunks
        .map(chunk => {
          const chunkEmbedding = this.embeddingService.parseFromPgVector(chunk.embedding);
          if (chunkEmbedding.length === 0) return null;

          const similarity = this.embeddingService.cosineSimilarity(queryEmbedding, chunkEmbedding);
          return {
            content: chunk.content,
            similarity,
            source: chunk.document_name || 'Desconhecido',
            category: chunk.category,
          };
        })
        .filter((r): r is SearchResult => r !== null && r.similarity >= minSimilarity)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      this.logger.error(`Fallback search also failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca resumos de conversa similares usando pgvector
   */
  async searchSummaries(
    companyId: string,
    contactId: string | null,
    query: string,
    limit: number = 3
  ): Promise<Array<{ summary: string; keyTopics: string[]; similarity: number }>> {
    try {
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const vectorStr = this.embeddingService.formatForPgVector(queryEmbedding);

      const contactFilter = contactId ? `AND cs.contact_id = '${contactId}'` : '';

      const results = await this.prisma.$queryRawUnsafe<Array<{
        summary: string;
        key_topics: string[];
        similarity: number;
      }>>(`
        SELECT 
          cs.summary,
          cs.key_topics,
          (1 - (cs.embedding <=> '${vectorStr}'::vector))::float as similarity
        FROM conversation_summaries cs
        WHERE cs.company_id = '${companyId}'
        ${contactFilter}
        AND cs.embedding IS NOT NULL
        ORDER BY cs.embedding <=> '${vectorStr}'::vector
        LIMIT ${limit}
      `);

      return results.map(r => ({
        summary: r.summary,
        keyTopics: r.key_topics || [],
        similarity: r.similarity,
      }));
    } catch (error) {
      this.logger.error(`Summary search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Adiciona documento de treinamento
   */
  async addDocument(params: {
    companyId: string;
    name: string;
    content: string;
    sourceType: 'file' | 'text' | 'url' | 'whatsapp';
    category?: string;
    tags?: string[];
  }): Promise<string> {
    return this.documentProcessor.processDocument(params);
  }

  /**
   * Lista documentos de treinamento
   */
  async listDocuments(companyId: string) {
    return this.prisma.trainingDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sourceType: true,
        category: true,
        tags: true,
        status: true,
        chunkCount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Remove documento de treinamento
   */
  async removeDocument(documentId: string, companyId: string): Promise<void> {
    // Verificar se pertence à empresa
    const doc = await this.prisma.trainingDocument.findFirst({
      where: { id: documentId, companyId },
    });

    if (!doc) {
      throw new Error('Document not found');
    }

    await this.documentProcessor.deleteDocument(documentId);
  }

  /**
   * Constrói contexto completo para prompt da IA
   */
  async buildContextForPrompt(params: {
    companyId: string;
    contactId?: string;
    remoteJid?: string;
    currentMessage: string;
    contactName?: string;
    isPersonalAssistant?: boolean;
  }) {
    return this.contextBuilder.buildContext(params);
  }

  /**
   * Cria resumo de conversa se necessário
   */
  async summarizeConversationIfNeeded(
    companyId: string,
    contactId: string,
    remoteJid: string,
  ): Promise<string | null> {
    return this.conversationMemory.createConversationSummary(companyId, contactId, remoteJid);
  }

  /**
   * Obtém estatísticas de treinamento da empresa
   */
  async getTrainingStats(companyId: string) {
    const [documents, chunks, summaries] = await Promise.all([
      this.prisma.trainingDocument.count({ where: { companyId } }),
      this.prisma.trainingChunk.count({ where: { companyId } }),
      this.prisma.conversationSummary.count({ where: { companyId } }),
    ]);

    const documentsByStatus = await this.prisma.trainingDocument.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { status: true },
    });

    const documentsByCategory = await this.prisma.trainingDocument.groupBy({
      by: ['category'],
      where: { companyId },
      _count: { category: true },
    });

    return {
      totalDocuments: documents,
      totalChunks: chunks,
      totalSummaries: summaries,
      byStatus: documentsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      byCategory: documentsByCategory.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Adiciona FAQ à base de conhecimento
   */
  async addFAQ(params: {
    companyId: string;
    question: string;
    answer: string;
    keywords?: string[];
  }): Promise<string> {
    const doc = await this.prisma.trainingDocument.create({
      data: {
        companyId: params.companyId,
        name: `FAQ: ${params.question.substring(0, 50)}...`,
        sourceType: 'text',
        originalContent: `Pergunta: ${params.question}\nResposta: ${params.answer}`,
        status: 'processing',
        category: 'faq',
        tags: params.keywords || [],
      },
    });

    // Processar como chunk único com pgvector
    try {
      const embedding = await this.embeddingService.generateEmbedding(
        `${params.question} ${params.answer}`,
      );
      const vectorStr = this.embeddingService.formatForPgVector(embedding);
      const content = `Pergunta: ${params.question}\nResposta: ${params.answer}`;

      // Usar raw query para inserir com pgvector
      await this.prisma.$executeRaw`
        INSERT INTO training_chunks (id, document_id, company_id, content, chunk_index, embedding, category, metadata, created_at)
        VALUES (
          ${`tc_${Date.now()}_0`},
          ${doc.id},
          ${params.companyId},
          ${content},
          0,
          ${vectorStr}::vector,
          'faq',
          '{}',
          NOW()
        )
      `;

      await this.prisma.trainingDocument.update({
        where: { id: doc.id },
        data: { status: 'completed', chunkCount: 1 },
      });
    } catch (error) {
      await this.prisma.trainingDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', errorMessage: error.message },
      });
    }

    return doc.id;
  }

  /**
   * Atualiza categoria de documento
   */
  async updateDocumentCategory(
    documentId: string,
    companyId: string,
    category: string,
  ): Promise<void> {
    await this.prisma.trainingDocument.updateMany({
      where: { id: documentId, companyId },
      data: { category },
    });

    // Atualizar chunks também
    await this.prisma.trainingChunk.updateMany({
      where: { documentId, companyId },
      data: { category },
    });
  }

  /**
   * Busca FAQs similares a uma pergunta
   */
  async findSimilarFAQs(companyId: string, question: string, limit: number = 3): Promise<Array<{
    question: string;
    answer: string;
    similarity: number;
  }>> {
    const results = await this.search(companyId, question, limit);

    return results
      .filter(r => r.category === 'faq')
      .map(r => {
        const parts = r.content.split('\nResposta:');
        return {
          question: parts[0].replace('Pergunta:', '').trim(),
          answer: parts[1]?.trim() || r.content,
          similarity: r.similarity,
        };
      });
  }
}
