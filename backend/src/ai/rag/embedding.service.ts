import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Serviço para gerar embeddings usando Gemini
 * Embeddings são vetores numéricos que representam o significado semântico do texto
 * Dimensão: 768 (compatível com text-embedding-004)
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private genAI: GoogleGenerativeAI;
  private readonly EMBEDDING_MODEL = 'text-embedding-004';
  public readonly VECTOR_DIMENSIONS = 768;

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
   * Usado como fallback quando não pode usar pgvector
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
   * Formata embedding como string para pgvector
   * Formato: '[0.123, -0.456, 0.789, ...]'
   */
  formatForPgVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Parse string pgvector para array de números
   */
  parseFromPgVector(vectorStr: string): number[] {
    try {
      // Remove brackets e faz parse
      const cleaned = vectorStr.replace(/^\[|\]$/g, '');
      return cleaned.split(',').map(n => parseFloat(n.trim()));
    } catch {
      return [];
    }
  }

  /**
   * Serializa embedding para armazenamento (formato JSON - compatibilidade)
   * @deprecated Use formatForPgVector para novos dados
   */
  serializeEmbedding(embedding: number[]): string {
    return JSON.stringify(embedding);
  }

  /**
   * Deserializa embedding do banco (formato JSON - compatibilidade)
   * @deprecated Novos dados usam pgvector nativo
   */
  deserializeEmbedding(serialized: string): number[] {
    try {
      // Tenta primeiro como JSON array
      if (serialized.startsWith('[') && serialized.includes(',')) {
        const parsed = JSON.parse(serialized);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
}
