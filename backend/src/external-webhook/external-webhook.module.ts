import { Module } from '@nestjs/common';
import { ExternalWebhookController } from './external-webhook.controller';
import { ExternalWebhookService } from './external-webhook.service';
import { WebhookAppController } from './webhook-app.controller';
import { WebhookAppService } from './webhook-app.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalWebhookController, WebhookAppController],
  providers: [ExternalWebhookService, WebhookAppService],
  exports: [ExternalWebhookService, WebhookAppService],
})
export class ExternalWebhookModule { }

