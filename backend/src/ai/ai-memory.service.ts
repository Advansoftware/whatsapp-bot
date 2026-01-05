import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AIMemoryService {
  private readonly logger = new Logger(AIMemoryService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME = 'gemini-2.0-flash-exp';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Extrai informações importantes da mensagem e salva na memória do contato
   * Chamado após cada mensagem processada
   */
  async extractAndSaveMemory(
    contactId: string,
    messageContent: string,
    messageId: string,
  ): Promise<void> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

      const prompt = `Analise esta mensagem e extraia APENAS informações factuais importantes sobre o cliente.
Retorne um JSON array com as informações encontradas. Se não houver informações úteis, retorne [].

Mensagem: "${messageContent}"

TIPOS de informação para extrair:
- fact: fatos sobre a pessoa (nome, profissão, família, etc)
- preference: preferências (gosta de X, prefere Y)
- need: necessidades expressas (precisa de X, quer Y)
- objection: objeções/reclamações (achou caro, não gostou de X)
- interest: interesses em produtos/serviços
- context: contexto importante (horário preferido, forma de pagamento)

Retorne APENAS JSON array:
[
  {"type": "fact", "key": "nome_filho", "value": "Pedro", "confidence": 0.9},
  {"type": "interest", "key": "produto", "value": "Interessado em camisetas", "confidence": 0.8}
]

Se não encontrar nada relevante, retorne: []`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return;

      const memories = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(memories) || memories.length === 0) return;

      // Save each memory
      for (const mem of memories) {
        if (!mem.type || !mem.key || !mem.value) continue;

        await this.prisma.contactMemory.upsert({
          where: {
            contactId_type_key: {
              contactId,
              type: mem.type,
              key: mem.key,
            },
          },
          update: {
            value: mem.value,
            confidence: mem.confidence || 1.0,
            source: messageId,
          },
          create: {
            contactId,
            type: mem.type,
            key: mem.key,
            value: mem.value,
            confidence: mem.confidence || 1.0,
            source: messageId,
          },
        });
      }

      this.logger.log(`Saved ${memories.length} memories for contact ${contactId}`);
    } catch (error) {
      this.logger.error(`Memory extraction failed: ${error.message}`);
      // Não falhar silenciosamente, apenas logar
    }
  }

  /**
   * Busca memórias relevantes do contato para incluir no contexto
   * Retorna um resumo compacto para economizar tokens
   */
  async getContactMemoryContext(contactId: string): Promise<string> {
    try {
      const memories = await this.prisma.contactMemory.findMany({
        where: { contactId },
        orderBy: [
          { type: 'asc' },
          { updatedAt: 'desc' },
        ],
      });

      if (memories.length === 0) {
        return '';
      }

      // Agrupa por tipo para formatação compacta
      const grouped: Record<string, string[]> = {};
      for (const mem of memories) {
        if (!grouped[mem.type]) grouped[mem.type] = [];
        grouped[mem.type].push(`${mem.key}: ${mem.value}`);
      }

      let context = '\n📝 MEMÓRIA DO CONTATO:\n';

      if (grouped.fact) context += `Fatos: ${grouped.fact.join('; ')}\n`;
      if (grouped.preference) context += `Preferências: ${grouped.preference.join('; ')}\n`;
      if (grouped.need) context += `Necessidades: ${grouped.need.join('; ')}\n`;
      if (grouped.interest) context += `Interesses: ${grouped.interest.join('; ')}\n`;
      if (grouped.objection) context += `⚠️ Objeções anteriores: ${grouped.objection.join('; ')}\n`;
      if (grouped.context) context += `Contexto: ${grouped.context.join('; ')}\n`;

      return context;
    } catch (error) {
      this.logger.error(`Failed to get contact memory: ${error.message}`);
      return '';
    }
  }

  /**
   * Busca correções de erros anteriores para evitar repetir
   */
  async getErrorCorrections(companyId: string): Promise<string> {
    try {
      const corrections = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          category: 'error_correction',
          isActive: true,
        },
        orderBy: { priority: 'desc' },
        take: 10,
      });

      if (corrections.length === 0) return '';

      let context = '\n⚠️ ERROS A EVITAR:\n';
      for (const corr of corrections) {
        context += `- NÃO diga: "${corr.wrongResponse}"\n`;
        context += `  DIGA: "${corr.correctResponse}"\n`;
      }

      return context;
    } catch (error) {
      this.logger.error(`Failed to get error corrections: ${error.message}`);
      return '';
    }
  }

  /**
   * Busca conhecimento relevante da empresa (FAQs, políticas, etc)
   */
  async getRelevantKnowledge(companyId: string, messageContent: string): Promise<string> {
    try {
      // Busca por keywords no conteúdo da mensagem
      const knowledge = await this.prisma.companyKnowledge.findMany({
        where: {
          companyId,
          isActive: true,
          category: { in: ['faq', 'policy', 'product', 'script'] },
        },
        orderBy: { priority: 'desc' },
      });

      if (knowledge.length === 0) return '';

      // Filtra por relevância (keywords match)
      const lowerMessage = messageContent.toLowerCase();
      const relevant = knowledge.filter(k => {
        if (k.keywords.length === 0) return k.priority > 5; // Alta prioridade sempre incluir
        return k.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()));
      });

      if (relevant.length === 0) return '';

      let context = '\n📚 BASE DE CONHECIMENTO:\n';
      for (const item of relevant.slice(0, 5)) {
        context += `[${item.category.toUpperCase()}] ${item.title}: ${item.content}\n`;
      }

      return context;
    } catch (error) {
      this.logger.error(`Failed to get knowledge: ${error.message}`);
      return '';
    }
  }

  /**
   * Registra uma correção de erro para evitar repetir
   */
  async saveErrorCorrection(
    companyId: string,
    wrongResponse: string,
    correctResponse: string,
    context: string,
  ): Promise<void> {
    await this.prisma.companyKnowledge.create({
      data: {
        companyId,
        category: 'error_correction',
        title: `Correção: ${context.substring(0, 50)}...`,
        content: context,
        wrongResponse,
        correctResponse,
        priority: 10,
      },
    });
  }
}
