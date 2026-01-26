export interface TrainingDocument {
  id: string;
  name: string;
  sourceType: 'file' | 'text' | 'url' | 'whatsapp';
  category: string;
  tags: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingStats {
  totalDocuments: number;
  totalChunks: number;
  totalSummaries: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords?: string[];
}

export interface SearchResult {
  content: string;
  similarity: number;
  source: string;
  category: string;
}

export const CATEGORIES = [
  { value: 'general', label: 'Geral', color: 'default' },
  { value: 'product', label: 'Produtos', color: 'primary' },
  { value: 'faq', label: 'FAQ', color: 'info' },
  { value: 'policy', label: 'Políticas', color: 'warning' },
  { value: 'script', label: 'Scripts', color: 'success' },
] as const;

export type CategoryValue = typeof CATEGORIES[number]['value'];
