import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto';
import { WHATSAPP_QUEUE } from '../queue/queue.module';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    @InjectQueue(WHATSAPP_QUEUE) private readonly whatsappQueue: Queue,
    private readonly chatGateway: ChatGateway,
    private readonly prisma: PrismaService,
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

      // Update instance status in database
      let dbStatus = 'disconnected';
      if (state === 'open' || state === 'connected') {
        dbStatus = 'connected';
      } else if (state === 'connecting' || state === 'syncing') {
        dbStatus = 'syncing';
      }

      try {
        await this.prisma.instance.updateMany({
          where: { instanceKey: payload.instance },
          data: { status: dbStatus },
        });
        this.logger.log(`Updated instance ${payload.instance} status to ${dbStatus}`);
      } catch (err) {
        this.logger.error(`Failed to update instance status: ${err.message}`);
      }

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
      const messageData = this.extractMessageContent(payload);

      if (!messageData) {
        return { status: 'ignored', reason: 'no_text_content' };
      }

      // Create job data
      const jobData = {
        instanceKey: payload.instance,
        remoteJid: data.key.remoteJid,
        messageId: data.key.id,
        content: messageData.content,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
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
        const messageData = this.extractMessageContent(tempPayload as EvolutionWebhookDto);

        if (messageData) {
          const jobData = {
            instanceKey: payload.instance,
            remoteJid: msg.key.remoteJid,
            messageId: msg.key.id,
            content: messageData.content,
            mediaUrl: messageData.mediaUrl,
            mediaType: messageData.mediaType,
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

    // Handle contacts.update - save contact names and profile pictures
    if (payload.event === 'contacts.update' || payload.event === 'contacts.upsert') {
      const contacts = Array.isArray(payload.data) ? payload.data : [payload.data];
      this.logger.log(`Processing ${contacts.length} contacts for ${payload.instance}`);

      // Find the instance to get companyId
      const instance = await this.prisma.instance.findUnique({
        where: { instanceKey: payload.instance },
        select: { companyId: true, id: true }
      });

      if (instance) {
        for (const contact of contacts) {
          if (contact.remoteJid) {
            try {
              await this.prisma.contact.upsert({
                where: {
                  remoteJid_companyId: {
                    remoteJid: contact.remoteJid,
                    companyId: instance.companyId,
                  }
                },
                create: {
                  remoteJid: contact.remoteJid,
                  pushName: contact.pushName,
                  profilePicUrl: contact.profilePicUrl,
                  companyId: instance.companyId,
                  instanceId: instance.id,
                },
                update: {
                  pushName: contact.pushName || undefined,
                  profilePicUrl: contact.profilePicUrl || undefined,
                },
              });
            } catch (err) {
              this.logger.warn(`Failed to upsert contact ${contact.remoteJid}: ${err.message}`);
            }
          }
        }
        this.logger.log(`Updated ${contacts.length} contacts`);
      }

      return { status: 'processed_contacts', count: contacts.length };
    }

    // Handle messages.update - status updates (delivered, read, etc)
    if (payload.event === 'messages.update') {
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data];
      this.logger.log(`Messages update: ${updates.length} updates for ${payload.instance}`);

      for (const update of updates) {
        if (update?.key?.id && update?.update?.status) {
          // Map Evolution API status codes to readable status
          let status = 'sent';
          switch (update.update.status) {
            case 0: status = 'error'; break;
            case 1: status = 'pending'; break;
            case 2: status = 'sent'; break;
            case 3: status = 'delivered'; break;
            case 4: status = 'read'; break;
            case 5: status = 'played'; break;
            default: status = String(update.update.status);
          }

          // Update message status in database
          try {
            await this.prisma.message.updateMany({
              where: { messageId: update.key.id },
              data: { status },
            });
          } catch (err) {
            this.logger.warn(`Failed to update message status: ${err.message}`);
          }

          // Broadcast to frontend
          this.chatGateway.broadcastMessage({
            type: 'message_update',
            messageId: update.key.id,
            remoteJid: update.key.remoteJid,
            status,
            instanceKey: payload.instance,
          });
        }
      }

      return { status: 'processed_message_updates', count: updates.length };
    }

    // Handle presence update - online/offline/typing status
    if (payload.event === 'presence.update') {
      const presenceData = payload.data;
      this.logger.log(`Presence update for ${presenceData?.id}: ${JSON.stringify(presenceData?.presences)}`);

      // Broadcast presence update to frontend
      this.chatGateway.broadcastMessage({
        type: 'presence_update',
        instanceKey: payload.instance,
        remoteJid: presenceData?.id,
        presences: presenceData?.presences,
      });

      return { status: 'processed_presence' };
    }

    // For all other events (chats.update, etc), just acknowledge
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
  private extractMessageContent(payload: EvolutionWebhookDto): { content: string; mediaUrl?: string; mediaType?: string } | null {
    const message = payload.data?.message;

    if (!message) return null;

    // Text message
    if (message.conversation) {
      return { content: message.conversation };
    }

    // Extended text message (with link preview, etc)
    if (message.extendedTextMessage?.text) {
      return { content: message.extendedTextMessage.text };
    }

    // Image/video with caption
    if (message.imageMessage) {
      return {
        content: message.imageMessage.caption || '[Imagem]',
        mediaUrl: message.imageMessage.url,
        mediaType: 'image'
      };
    }

    if (message.videoMessage) {
      return {
        content: message.videoMessage.caption || '[Vídeo]',
        mediaUrl: message.videoMessage.url,
        mediaType: 'video'
      };
    }

    // Button response
    if (message.buttonsResponseMessage?.selectedDisplayText) {
      return { content: message.buttonsResponseMessage.selectedDisplayText };
    }

    // List response
    if (message.listResponseMessage?.title) {
      return { content: message.listResponseMessage.title };
    }

    return null;
  }
}
