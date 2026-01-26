import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ProcessDocumentParams {
  companyId: string;
  name: string;
  content: string;
  sourceType: 'file' | 'text' | 'url' | 'whatsapp';
  category?: string;
  tags?: string[];
  mimeType?: string;
  fileUrl?: string;
}

interface ChunkResult {
  content: string;
  metadata: Record<string, any>;
}

/**
 * Serviço para processar documentos de treinamento
 * Divide em chunks, gera embeddings e armazena no banco
 */
@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  // Configurações de chunking
  private readonly CHUNK_SIZE = 500; // Caracteres por chunk
  private readonly CHUNK_OVERLAP = 100; // Sobreposição entre chunks

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
   * Processa um documento de treinamento completo
   */
  async processDocument(params: ProcessDocumentParams): Promise<string> {
    const { companyId, name, content, sourceType, category, tags, mimeType, fileUrl } = params;

    // 1. Criar registro do documento
    const document = await this.prisma.trainingDocument.create({
      data: {
        companyId,
        name,
        sourceType,
        mimeType,
        fileUrl,
        originalContent: content.substring(0, 50000), // Limita armazenamento
        status: 'processing',
        category: category || 'general',
        tags: tags || [],
      },
    });

    try {
      // 2. Pré-processar conteúdo
      const cleanContent = this.preprocessContent(content);

      // 3. Dividir em chunks
      const chunks = this.splitIntoChunks(cleanContent);

      // 4. Gerar embeddings e salvar chunks
      let processedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          const embedding = await this.embeddingService.generateEmbedding(chunk.content);
          const vectorStr = this.embeddingService.formatForPgVector(embedding);
          const chunkId = `chunk_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;

          // Usar SQL raw para inserir com tipo vector do pgvector
          await this.prisma.$executeRaw`
            INSERT INTO training_chunks (id, document_id, company_id, content, chunk_index, embedding, category, metadata, created_at)
            VALUES (
              ${chunkId},
              ${document.id},
              ${companyId},
              ${chunk.content},
              ${i},
              ${vectorStr}::vector,
              ${category || 'general'},
              ${JSON.stringify(chunk.metadata)}::jsonb,
              NOW()
            )
          `;

          processedCount++;
        } catch (error) {
          this.logger.warn(`Failed to process chunk ${i}: ${error.message}`);
        }

        // Rate limiting: pequeno delay entre chunks
        if (i % 5 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 5. Atualizar status do documento
      await this.prisma.trainingDocument.update({
        where: { id: document.id },
        data: {
          status: 'completed',
          chunkCount: processedCount,
          tokenCount: this.estimateTokens(cleanContent),
        },
      });

      this.logger.log(`Document ${name} processed: ${processedCount} chunks created`);
      return document.id;

    } catch (error) {
      // Atualizar status de erro
      await this.prisma.trainingDocument.update({
        where: { id: document.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      this.logger.error(`Failed to process document ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Pré-processa o conteúdo removendo formatação desnecessária
   */
  private preprocessContent(content: string): string {
    return content
      // Remove múltiplos espaços em branco
      .replace(/\s+/g, ' ')
      // Remove caracteres de controle
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      // Normaliza quebras de linha
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Divide o conteúdo em chunks com sobreposição
   */
  private splitIntoChunks(content: string): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    const sentences = this.splitIntoSentences(content);

    let currentChunk = '';
    let chunkStart = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];

      if ((currentChunk + sentence).length > this.CHUNK_SIZE && currentChunk.length > 0) {
        // Salva chunk atual
        chunks.push({
          content: currentChunk.trim(),
          metadata: { startIndex: chunkStart, sentenceCount: i - chunkStart },
        });

        // Inicia novo chunk com sobreposição
        const overlapSentences = this.getOverlapSentences(sentences, i, this.CHUNK_OVERLAP);
        currentChunk = overlapSentences.join(' ') + ' ' + sentence;
        chunkStart = Math.max(0, i - overlapSentences.length);
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    // Adiciona último chunk se houver conteúdo
    if (currentChunk.trim().length > 50) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { startIndex: chunkStart, sentenceCount: sentences.length - chunkStart },
      });
    }

    return chunks;
  }

  /**
   * Divide texto em sentenças
   */
  private splitIntoSentences(text: string): string[] {
    // Regex para detectar fim de sentenças
    const sentenceEnders = /[.!?]\s+/g;
    const parts = text.split(sentenceEnders);

    return parts.filter(s => s.trim().length > 0);
  }

  /**
   * Obtém sentenças para sobreposição
   */
  private getOverlapSentences(sentences: string[], currentIndex: number, overlapChars: number): string[] {
    const result: string[] = [];
    let totalChars = 0;

    for (let i = currentIndex - 1; i >= 0 && totalChars < overlapChars; i--) {
      result.unshift(sentences[i]);
      totalChars += sentences[i].length;
    }

    return result;
  }

  /**
   * Estima quantidade de tokens
   */
  private estimateTokens(text: string): number {
    // Estimativa: ~4 caracteres por token em português
    return Math.ceil(text.length / 4);
  }

  /**
   * Usa IA para extrair informações estruturadas do documento
   */
  async extractStructuredInfo(content: string): Promise<{
    summary: string;
    keyTopics: string[];
    faqs: Array<{ question: string; answer: string }>;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Analise este documento e extraia informações estruturadas.

DOCUMENTO:
${content.substring(0, 10000)}

Retorne APENAS JSON no formato:
{
  "summary": "Resumo do documento em 2-3 frases",
  "keyTopics": ["tópico1", "tópico2", "tópico3"],
  "faqs": [
    {"question": "Pergunta que clientes podem fazer", "answer": "Resposta baseada no documento"}
  ]
}

Extraia até 5 FAQs relevantes que um cliente poderia perguntar.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { summary: '', keyTopics: [], faqs: [] };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      this.logger.error(`Failed to extract structured info: ${error.message}`);
      return { summary: '', keyTopics: [], faqs: [] };
    }
  }

  /**
   * Reprocessa um documento existente
   */
  async reprocessDocument(documentId: string): Promise<void> {
    const document = await this.prisma.trainingDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.originalContent) {
      throw new Error('Document not found or has no content');
    }

    // Deleta chunks existentes
    await this.prisma.trainingChunk.deleteMany({
      where: { documentId },
    });

    // Reprocessa
    await this.processDocument({
      companyId: document.companyId,
      name: document.name,
      content: document.originalContent,
      sourceType: document.sourceType as any,
      category: document.category,
      tags: document.tags,
    });
  }

  /**
   * Deleta um documento e seus chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.prisma.trainingDocument.delete({
      where: { id: documentId },
    });
  }
}
