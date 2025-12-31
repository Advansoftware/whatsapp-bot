import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { QueueModule } from '../queue/queue.module';

import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [QueueModule, ChatModule],
  controllers: [WebhookController],
})
export class WebhookModule { }
