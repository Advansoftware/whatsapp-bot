import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

@Module({
  providers: [ChatGateway],
  exports: [ChatGateway], // Export so WebhookModule can use it
})
export class ChatModule { }
