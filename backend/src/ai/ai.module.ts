import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AITranscriptionService } from './ai-transcription.service';
import { AIPromptsService } from './ai-prompts.service';
import { AIMemoryService } from './ai-memory.service';
import { AISecretaryController } from './ai-secretary.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AISecretaryController],
  providers: [
    AIService,
    AITranscriptionService,
    AIPromptsService,
    AIMemoryService,
  ],
  exports: [
    AIService,
    AITranscriptionService,
    AIPromptsService,
    AIMemoryService,
  ],
})
export class AIModule { }
