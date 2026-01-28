import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { WebhookModule } from './webhook/webhook.module';
import { AuthModule } from './auth/auth.module';
import { ApiModule } from './api/api.module';
import { ChatModule } from './chat/chat.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { AIModule } from './ai/ai.module';
import { SecretaryTasksModule } from './secretary-tasks/secretary-tasks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupAutomationsModule } from './group-automations/group-automations.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { ContactAutomationModule } from './contact-automation/contact-automation.module';
import { ExternalWebhookModule } from './external-webhook/external-webhook.module';
import { CrmModule } from './crm/crm.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // BullMQ global configuration
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),

    // Application modules
    PrismaModule,
    AuthModule,
    ApiModule,
    QueueModule,
    WebhookModule,
    ChatModule,
    ChatbotModule,
    AIModule,
    SecretaryTasksModule,
    IntegrationsModule,
    NotificationsModule,
    GroupAutomationsModule,
    SubscriptionModule,
    ContactAutomationModule,
    ExternalWebhookModule,
    CrmModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
