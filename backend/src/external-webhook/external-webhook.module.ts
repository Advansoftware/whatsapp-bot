import { Module } from '@nestjs/common';
import { ExternalWebhookController } from './external-webhook.controller';
import { ExternalWebhookService } from './external-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalWebhookController],
  providers: [ExternalWebhookService],
  exports: [ExternalWebhookService],
})
export class ExternalWebhookModule { }
