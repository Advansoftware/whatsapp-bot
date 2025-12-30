import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { WHATSAPP_QUEUE } from '../queue/queue.module';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
  ) { }

  /**
   * Endpoint para receber eventos da Evolution API
   * PERFORMANCE: Este endpoint NÃO contém lógica pesada.
   * Apenas valida o DTO e injeta o job na fila imediatamente.
   */
  @Post('evolution')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleEvolutionWebhook(@Body() payload: EvolutionWebhookDto) {
    // Ignore non-message events
    if (payload.event !== 'messages.upsert') {
      return { status: 'ignored', reason: 'not_a_message_event' };
    }

    // Ignore outgoing messages (from bot)
    if (payload.data?.key?.fromMe) {
      return { status: 'ignored', reason: 'outgoing_message' };
    }

    // Extract message content
    const messageContent = this.extractMessageContent(payload);

    if (!messageContent) {
      return { status: 'ignored', reason: 'no_text_content' };
    }

    // Create job data - at this point we know data exists because extractMessageContent checked it
    const data = payload.data!;
    const jobData = {
      instanceKey: payload.instance,
      remoteJid: data.key.remoteJid,
      messageId: data.key.id,
      content: messageContent,
      pushName: data.pushName,
      timestamp: data.messageTimestamp,
    };

    // Add to queue immediately (Producer pattern)
    const job = await this.whatsappQueue.add('process-message', jobData, {
      jobId: data.key.id, // Prevent duplicate processing
    });

    this.logger.log(`Job ${job.id} added to queue from ${data.key.remoteJid}`);

    return {
      status: 'queued',
      jobId: job.id,
    };
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
