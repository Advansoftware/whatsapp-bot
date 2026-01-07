import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappProcessor } from './whatsapp.processor';
import { WHATSAPP_QUEUE } from './constants';
import { AIModule } from '../ai/ai.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { SecretaryTasksModule } from '../secretary-tasks/secretary-tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroupAutomationsModule } from '../group-automations/group-automations.module';

export { WHATSAPP_QUEUE } from './constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: WHATSAPP_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500,     // Keep last 500 failed jobs for debugging
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
    AIModule,
    ChatbotModule,
    SecretaryTasksModule,
    NotificationsModule,
    GroupAutomationsModule,
  ],
  providers: [WhatsappProcessor],
  exports: [BullModule],
})
export class QueueModule { }
