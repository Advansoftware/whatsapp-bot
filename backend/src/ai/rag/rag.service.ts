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
 * Coordena busca semântica, processamento de documentos e construção de contexto
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
   * Busca conhecimento relevante para uma query
   */
  async search(companyId: string, query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      // Gerar embedding da query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Buscar chunks
      const chunks = await this.prisma.trainingChunk.findMany({
        where: { companyId },
        include: {
          document: {
            select: { name: true },
          },
        },
      });

      if (chunks.length === 0) {
        this.logger.debug('No training chunks found for company');
        return [];
      }

      // Calcular similaridade
      const results = chunks
        .filter(c => c.embedding)
        .map(chunk => {
          const chunkEmbedding = this.embeddingService.deserializeEmbedding(chunk.embedding!);
          const similarity = this.embeddingService.cosineSimilarity(queryEmbedding, chunkEmbedding);

          return {
            content: chunk.content,
            similarity,
            source: chunk.document?.name || 'Desconhecido',
            category: chunk.category,
          };
        })
        .filter(r => r.similarity >= 0.5) // Mínimo 50% similaridade
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    } catch (error) {
      this.logger.error(`RAG search failed: ${error.message}`);
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

    // Processar como chunk único
    try {
      const embedding = await this.embeddingService.generateEmbedding(
        `${params.question} ${params.answer}`,
      );

      await this.prisma.trainingChunk.create({
        data: {
          documentId: doc.id,
          companyId: params.companyId,
          content: `Pergunta: ${params.question}\nResposta: ${params.answer}`,
          chunkIndex: 0,
          embedding: this.embeddingService.serializeEmbedding(embedding),
          category: 'faq',
        },
      });

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
