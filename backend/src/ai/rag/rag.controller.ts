import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Logger,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RAGService, SearchResult, BuiltContext } from './rag.service';
import { DocumentProcessorService } from './document-processor.service';

@Controller('api/training')
@UseGuards(JwtAuthGuard)
export class RAGController {
  private readonly logger = new Logger(RAGController.name);

  constructor(
    private readonly ragService: RAGService,
    private readonly documentProcessor: DocumentProcessorService,
  ) { }

  /**
   * Lista documentos de treinamento
   */
  @Get('documents')
  async listDocuments(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.ragService.listDocuments(companyId);
  }

  /**
   * Obtém estatísticas de treinamento
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.ragService.getTrainingStats(companyId);
  }

  /**
   * Adiciona documento de texto
   */
  @Post('documents/text')
  async addTextDocument(
    @Request() req: any,
    @Body() body: {
      name: string;
      content: string;
      category?: string;
      tags?: string[];
    },
  ) {
    const companyId = req.user.companyId;

    if (!body.name || !body.content) {
      throw new BadRequestException('Name and content are required');
    }

    if (body.content.length < 50) {
      throw new BadRequestException('Content must be at least 50 characters');
    }

    const documentId = await this.ragService.addDocument({
      companyId,
      name: body.name,
      content: body.content,
      sourceType: 'text',
      category: body.category || 'general',
      tags: body.tags || [],
    });

    return { success: true, documentId };
  }

  /**
   * Adiciona FAQ
   */
  @Post('faqs')
  async addFAQ(
    @Request() req: any,
    @Body() body: {
      question: string;
      answer: string;
      keywords?: string[];
    },
  ) {
    const companyId = req.user.companyId;

    if (!body.question || !body.answer) {
      throw new BadRequestException('Question and answer are required');
    }

    const documentId = await this.ragService.addFAQ({
      companyId,
      question: body.question,
      answer: body.answer,
      keywords: body.keywords,
    });

    return { success: true, documentId };
  }

  /**
   * Lista FAQs
   */
  @Get('faqs')
  async listFAQs(@Request() req: any) {
    const companyId = req.user.companyId;

    const documents = await this.ragService.listDocuments(companyId);
    const faqs = documents.filter(d => d.category === 'faq');

    return faqs;
  }

  /**
   * Busca conhecimento (para teste)
   */
  @Get('search')
  async search(
    @Request() req: any,
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ) {
    const companyId = req.user.companyId;

    if (!query) {
      throw new BadRequestException('Query is required');
    }

    const results = await this.ragService.search(
      companyId,
      query,
      limit ? parseInt(limit) : 5,
    );

    return results;
  }

  /**
   * Remove documento
   */
  @Delete('documents/:id')
  async removeDocument(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    await this.ragService.removeDocument(id, companyId);

    return { success: true };
  }

  /**
   * Atualiza categoria do documento
   */
  @Put('documents/:id/category')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { category: string },
  ) {
    const companyId = req.user.companyId;

    if (!body.category) {
      throw new BadRequestException('Category is required');
    }

    await this.ragService.updateDocumentCategory(id, companyId, body.category);

    return { success: true };
  }

  /**
   * Ativa/desativa documento
   */
  @Put('documents/:id/toggle')
  async toggleDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    const companyId = req.user.companyId;

    // Verificar se existe e pertence à empresa - usando findFirst para múltiplos campos
    const doc = await this.ragService['prisma'].trainingDocument.findFirst({
      where: { id, companyId },
    });

    if (!doc) {
      throw new BadRequestException('Document not found');
    }

    await this.ragService['prisma'].trainingDocument.update({
      where: { id },
      data: { isActive: body.isActive },
    });

    return { success: true };
  }

  /**
   * Extrai informações estruturadas de um documento
   */
  @Post('documents/:id/extract')
  async extractInfo(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const doc = await this.ragService['prisma'].trainingDocument.findFirst({
      where: { id, companyId },
    });

    if (!doc || !doc.originalContent) {
      throw new BadRequestException('Document not found or has no content');
    }

    const extracted = await this.documentProcessor.extractStructuredInfo(
      doc.originalContent,
    );

    return extracted;
  }

  /**
   * Reprocessa um documento
   */
  @Post('documents/:id/reprocess')
  async reprocessDocument(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const doc = await this.ragService['prisma'].trainingDocument.findFirst({
      where: { id, companyId },
    });

    if (!doc) {
      throw new BadRequestException('Document not found');
    }

    await this.documentProcessor.reprocessDocument(id);

    return { success: true };
  }

  /**
   * Testa uma pergunta contra a base de conhecimento
   */
  @Post('test')
  async testQuery(
    @Request() req: any,
    @Body() body: { question: string },
  ) {
    const companyId = req.user.companyId;

    if (!body.question) {
      throw new BadRequestException('Question is required');
    }

    // Buscar conhecimento relevante
    const results = await this.ragService.search(companyId, body.question, 5);

    // Buscar FAQs similares
    const faqs = await this.ragService.findSimilarFAQs(companyId, body.question, 3);

    return {
      relevantKnowledge: results,
      similarFAQs: faqs,
    };
  }
}
