import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { AITranscriptionService } from './ai-transcription.service';
import { AIPromptsService } from './ai-prompts.service';
import { AIMemoryService } from './ai-memory.service';
import { AITasksService } from './ai-tasks.service';
import { AIExpensesService } from './ai-expenses.service';
import { AISecretaryController } from './ai-secretary.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SecretaryTasksModule } from '../secretary-tasks/secretary-tasks.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [ConfigModule, PrismaModule, SecretaryTasksModule, forwardRef(() => IntegrationsModule)],
  controllers: [AISecretaryController],
  providers: [
    AIService,
    AITranscriptionService,
    AIPromptsService,
    AIMemoryService,
    AITasksService,
    AIExpensesService,
  ],
  exports: [
    AIService,
    AITranscriptionService,
    AIPromptsService,
    AIMemoryService,
    AITasksService,
    AIExpensesService,
  ],
})
export class AIModule { }
