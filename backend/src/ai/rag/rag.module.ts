import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { RAGService } from './rag.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessorService } from './document-processor.service';
import { ContextBuilderService } from './context-builder.service';
import { ConversationMemoryService } from './conversation-memory.service';
import { RAGController } from './rag.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [RAGController],
  providers: [
    RAGService,
    EmbeddingService,
    DocumentProcessorService,
    ContextBuilderService,
    ConversationMemoryService,
  ],
  exports: [
    RAGService,
    EmbeddingService,
    DocumentProcessorService,
    ContextBuilderService,
    ConversationMemoryService,
  ],
})
export class RAGModule { }
