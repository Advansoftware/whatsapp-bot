import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Serviço para gerar embeddings usando Gemini
 * Embeddings são vetores numéricos que representam o significado semântico do texto
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private genAI: GoogleGenerativeAI;
  private readonly EMBEDDING_MODEL = 'text-embedding-004';

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Gera embedding para um texto
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.EMBEDDING_MODEL });

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera embeddings para múltiplos textos em batch
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.EMBEDDING_MODEL });

      const results = await Promise.all(
        texts.map(text => model.embedContent(text))
      );

      return results.map(r => r.embedding.values);
    } catch (error) {
      this.logger.error(`Failed to generate batch embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Encontra os N chunks mais similares a uma query
   */
  findMostSimilar(
    queryEmbedding: number[],
    chunks: Array<{ id: string; content: string; embedding: number[] }>,
    topK: number = 5,
    minSimilarity: number = 0.5,
  ): Array<{ id: string; content: string; similarity: number }> {
    const results = chunks
      .map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter(r => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  /**
   * Serializa embedding para armazenamento no banco
   */
  serializeEmbedding(embedding: number[]): string {
    return JSON.stringify(embedding);
  }

  /**
   * Deserializa embedding do banco
   */
  deserializeEmbedding(serialized: string): number[] {
    try {
      return JSON.parse(serialized);
    } catch {
      return [];
    }
  }
}
