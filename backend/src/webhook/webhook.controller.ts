import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { WHATSAPP_QUEUE } from '../queue/queue.module';
import { ChatGateway } from '../chat/chat.gateway';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
    private readonly chatGateway: ChatGateway,
  ) { }

  /**
   * Endpoint para receber eventos da Evolution API
   * PERFORMANCE: Este endpoint NÃO contém lógica pesada.
   * Apenas valida o DTO e injeta o job na fila imediatamente.
   * Aceita tanto /webhook/evolution quanto /webhook/evolution/* paths
   */
  @Post('evolution')
  @HttpCode(HttpStatus.OK)  // Always return 200 to Evolution
  async handleEvolutionWebhook(@Body() payload: EvolutionWebhookDto) {
    return this.processWebhook(payload);
  }

  /**
   * Wildcard route for specific event paths like /webhook/evolution/connection-update
   */
  @Post('evolution/*')
  @HttpCode(HttpStatus.OK)
  async handleEvolutionWebhookWildcard(@Body() payload: EvolutionWebhookDto) {
    return this.processWebhook(payload);
  }

  private async processWebhook(payload: EvolutionWebhookDto) {
    this.logger.log(`Received webhook event: ${payload.event} from ${payload.instance}`);

    // Handle connection updates
    if (payload.event === 'connection.update') {
      const state = payload.data?.state || payload.data?.status;
      this.logger.log(`Connection update for ${payload.instance}: ${state}`);
      // TODO: Update instance status in database
      this.chatGateway.broadcastMessage({
        type: 'connection_update',
        instanceKey: payload.instance,
        state: state,
      });
      return { status: 'processed', event: payload.event };
    }

    // Handle QR Code updates (for real-time QR display)
    if (payload.event === 'qrcode.updated') {
      this.logger.log(`QR Code updated for ${payload.instance}`);
      this.chatGateway.broadcastMessage({
        type: 'qrcode_update',
        instanceKey: payload.instance,
        qrcode: payload.data?.qrcode?.base64 || payload.data?.base64,
      });
      return { status: 'processed', event: payload.event };
    }

    // Handle messages
    if (payload.event === 'messages.upsert') {
      const data = payload.data!;
      const fromMe = data.key.fromMe || false;

      // Extract message content
      const messageContent = this.extractMessageContent(payload);

      if (!messageContent) {
        return { status: 'ignored', reason: 'no_text_content' };
      }

      // Create job data
      const jobData = {
        instanceKey: payload.instance,
        remoteJid: data.key.remoteJid,
        messageId: data.key.id,
        content: messageContent,
        pushName: data.pushName,
        timestamp: data.messageTimestamp,
        fromMe,
        isHistory: false,
      };

      // Broadcast Real-Time Message
      this.chatGateway.broadcastMessage(jobData);

      // Add to queue immediately
      const job = await this.whatsappQueue.add('process-message', jobData, {
        jobId: data.key.id,
      });

      this.logger.log(`Job ${job.id} added to queue from ${data.key.remoteJid} (fromMe: ${fromMe})`);

      return {
        status: 'queued',
        jobId: job.id,
      };
    }

    // Handle History Sync (messages.set)
    if (payload.event === 'messages.set') {
      const messages = Array.isArray(payload.data) ? payload.data : [];
      this.logger.log(`Processing history sync: ${messages.length} messages for ${payload.instance}`);

      let queuedCount = 0;

      for (const msg of messages) {
        // Construct a pseudo-payload to reuse extractMessageContent if structure matches, 
        // OR manually extract since 'msg' matches "payload.data" structure of upsert usually.
        // Evolution 'messages.set' is often an array of the same objects as 'upsert'.

        // Quick helper wrapper
        const tempPayload = { ...payload, data: msg };
        const content = this.extractMessageContent(tempPayload as EvolutionWebhookDto);

        if (content) {
          const jobData = {
            instanceKey: payload.instance,
            remoteJid: msg.key.remoteJid,
            messageId: msg.key.id,
            content: content,
            pushName: msg.pushName,
            timestamp: msg.messageTimestamp,
            fromMe: msg.key.fromMe || false,
            isHistory: true,
          };

          await this.whatsappQueue.add('process-message', jobData, {
            jobId: msg.key.id, // ID deduplication by BullMQ
            removeOnComplete: true, // Auto-remove history jobs to save Redis space
          });
          queuedCount++;
        }
      }

      this.logger.log(`Queued ${queuedCount}/${messages.length} history messages for ${payload.instance}`);

      // Notify frontend about history sync progress
      this.chatGateway.broadcastMessage({
        type: 'history_sync',
        instanceKey: payload.instance,
        status: 'processing',
        count: queuedCount,
        total: messages.length
      });

      return { status: 'processed_history', count: queuedCount };
    }

    // For all other events (contacts.update, chats.update, etc), just acknowledge
    return { status: 'acknowledged', event: payload.event };
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: WHATSAPP_QUEUE,
    };
  }

  /**
   * Extrai o conteúdo de texto da mensagem (suporta vários tipos)
   */
  private extractMessageContent(payload: EvolutionWebhookDto): string | null {
    const message = payload.data?.message;

    if (!message) return null;

    // Text message
    if (message.conversation) {
      return message.conversation;
    }

    // Extended text message (with link preview, etc)
    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }

    // Image/video with caption
    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }

    if (message.videoMessage?.caption) {
      return message.videoMessage.caption;
    }

    // Button response
    if (message.buttonsResponseMessage?.selectedDisplayText) {
      return message.buttonsResponseMessage.selectedDisplayText;
    }

    // List response
    if (message.listResponseMessage?.title) {
      return message.listResponseMessage.title;
    }

    return null;
  }
}
