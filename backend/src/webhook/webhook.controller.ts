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
      const remoteJid = data.key.remoteJid;
      const messageId = data.key.id;

      // IMPORTANT: Skip processing if this is an outgoing message that already exists
      // This prevents loop when AI responses are captured by webhook
      if (fromMe) {
        const existingMsg = await this.prisma.message.findFirst({
          where: { messageId, direction: 'outgoing' }
        });
        if (existingMsg) {
          this.logger.log(`Skipping message ${messageId} - already exists as outgoing (AI response)`);
          return { status: 'skipped', reason: 'already_processed_outgoing' };
        }
      }

      // Detectar se é mensagem de grupo
      const isGroup = remoteJid?.endsWith('@g.us') || false;
      const participant = isGroup ? data.key.participant : null; // JID do remetente no grupo

      // Log message structure for debugging media
      const message = data.message;
      if (message?.imageMessage || message?.videoMessage || message?.audioMessage || message?.documentMessage) {
        this.logger.log(`[MEDIA DEBUG] Full message structure: ${JSON.stringify(message, null, 2)}`);
        this.logger.log(`[MEDIA DEBUG] Data keys: ${JSON.stringify(Object.keys(data))}`);
        // Check if base64 is already provided
        if (message.base64) {
          this.logger.log(`[MEDIA DEBUG] base64 is present in message`);
        }
      }

      // Extract message content
      const messageData = this.extractMessageContent(payload);

      if (!messageData) {
        return { status: 'ignored', reason: 'no_text_content' };
      }

      // Prepare mediaData for later download via Evolution API getBase64FromMediaMessage
      let mediaData = null;
      if (messageData.mediaType) {
        mediaData = {
          key: data.key,
          message: data.message,
          messageType: messageData.mediaType + 'Message',
        };
      }

      // Create job data
      const jobData = {
        instanceKey: payload.instance,
        remoteJid: remoteJid,
        messageId: messageId,
        content: messageData.content,
        mediaUrl: messageData.mediaUrl,
        mediaType: messageData.mediaType,
        mediaData: mediaData,
        pushName: data.pushName,
        timestamp: data.messageTimestamp,
        fromMe,
        isHistory: false,
        // Campos de grupo
        isGroup,
        participant,
        participantName: isGroup ? data.pushName : null, // Nome de quem enviou no grupo
      };

      // Broadcast Real-Time Message
      this.chatGateway.broadcastMessage(jobData);

      // Add to queue immediately
      const job = await this.whatsappQueue.add('process-message', jobData, {
        jobId: messageId,
      });

      this.logger.log(`Job ${job.id} added to queue from ${remoteJid}${isGroup ? ' (GROUP)' : ''} (fromMe: ${fromMe})`);

      return {
        status: 'queued',
        jobId: job.id,
      };
    }

    // Handle History Sync (messages.set) - OPTIMIZED with bulk insert
    if (payload.event === 'messages.set') {
      const messages = Array.isArray(payload.data) ? payload.data : [];
      this.logger.log(`Processing history sync: ${messages.length} messages for ${payload.instance}`);

      // Get instance info first
      const instance = await this.prisma.instance.findUnique({
        where: { instanceKey: payload.instance },
        select: { id: true, companyId: true }
      });

      if (!instance) {
        this.logger.warn(`Instance not found for history sync: ${payload.instance}`);
        return { status: 'error', reason: 'instance_not_found' };
      }

      // Prepare bulk data
      const messagesToInsert: any[] = [];
      const existingIds = new Set<string>();

      // Get existing message IDs in batch to avoid duplicates
      if (messages.length > 0) {
        const messageIds = messages.map(m => m.key?.id).filter(Boolean);
        const existing = await this.prisma.message.findMany({
          where: { messageId: { in: messageIds } },
          select: { messageId: true }
        });
        existing.forEach(e => existingIds.add(e.messageId));
      }

      for (const msg of messages) {
        if (!msg.key?.id || existingIds.has(msg.key.id)) continue;

        const tempPayload = { ...payload, data: msg };
        const messageData = this.extractMessageContent(tempPayload as EvolutionWebhookDto);

        if (messageData) {
          const timestamp = msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000)
            : new Date();

          messagesToInsert.push({
            remoteJid: msg.key.remoteJid,
            messageId: msg.key.id,
            content: messageData.content,
            mediaUrl: messageData.mediaUrl || null,
            mediaType: messageData.mediaType || null,
            direction: msg.key.fromMe ? 'outgoing' : 'incoming',
            status: 'processed',
            companyId: instance.companyId,
            instanceId: instance.id,
            pushName: msg.pushName || null,
            createdAt: timestamp,
            processedAt: timestamp,
          });
        }
      }

      // Bulk insert in batches of 500
      const BATCH_SIZE = 500;
      let insertedCount = 0;

      for (let i = 0; i < messagesToInsert.length; i += BATCH_SIZE) {
        const batch = messagesToInsert.slice(i, i + BATCH_SIZE);
        try {
          const result = await this.prisma.message.createMany({
            data: batch,
            skipDuplicates: true, // Skip if messageId already exists
          });
          insertedCount += result.count;
        } catch (err) {
          this.logger.warn(`Batch insert error: ${err.message}`);
        }

        // Notify frontend about progress
        this.chatGateway.broadcastMessage({
          type: 'history_sync',
          instanceKey: payload.instance,
          status: 'processing',
          count: insertedCount,
          total: messagesToInsert.length,
          progress: Math.round((i + batch.length) / messagesToInsert.length * 100)
        });
      }

      this.logger.log(`Bulk inserted ${insertedCount}/${messages.length} history messages for ${payload.instance}`);

      // Notify frontend about completion
      this.chatGateway.broadcastMessage({
        type: 'history_sync',
        instanceKey: payload.instance,
        status: 'completed',
        count: insertedCount,
        total: messages.length
      });

      return { status: 'processed_history', count: insertedCount };
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
            // Detectar se é grupo
            const isGroup = contact.remoteJid.endsWith('@g.us');

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
                  pushName: isGroup ? null : contact.pushName,
                  profilePicUrl: contact.profilePicUrl,
                  companyId: instance.companyId,
                  instanceId: instance.id,
                  // Campos de grupo
                  isGroup,
                  groupName: isGroup ? (contact.pushName || contact.subject || contact.name) : null,
                },
                update: {
                  pushName: isGroup ? undefined : (contact.pushName || undefined),
                  profilePicUrl: contact.profilePicUrl || undefined,
                  // Atualizar nome do grupo se for grupo
                  groupName: isGroup ? (contact.pushName || contact.subject || contact.name || undefined) : undefined,
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

    // Handle groups.update - update group info
    if (payload.event === 'groups.update' || payload.event === 'groups.upsert') {
      const groups = Array.isArray(payload.data) ? payload.data : [payload.data];
      this.logger.log(`Processing ${groups.length} groups for ${payload.instance}`);

      const instance = await this.prisma.instance.findUnique({
        where: { instanceKey: payload.instance },
        select: { companyId: true, id: true }
      });

      if (instance) {
        for (const group of groups) {
          const groupJid = group.id || group.remoteJid;
          if (groupJid) {
            try {
              await this.prisma.contact.upsert({
                where: {
                  remoteJid_companyId: {
                    remoteJid: groupJid,
                    companyId: instance.companyId,
                  }
                },
                create: {
                  remoteJid: groupJid,
                  profilePicUrl: group.pictureUrl || null,
                  companyId: instance.companyId,
                  instanceId: instance.id,
                  isGroup: true,
                  groupName: group.subject || group.name || null,
                  groupDescription: group.desc || group.description || null,
                },
                update: {
                  profilePicUrl: group.pictureUrl || undefined,
                  groupName: group.subject || group.name || undefined,
                  groupDescription: group.desc || group.description || undefined,
                },
              });
              this.logger.log(`Updated group: ${groupJid} - ${group.subject || group.name}`);
            } catch (err) {
              this.logger.warn(`Failed to upsert group ${groupJid}: ${err.message}`);
            }
          }
        }
      }

      return { status: 'processed_groups', count: groups.length };
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
    const data = payload.data;

    if (!message) return null;

    // Text message
    if (message.conversation) {
      return { content: message.conversation };
    }

    // Extended text message (with link preview, etc)
    if (message.extendedTextMessage?.text) {
      return { content: message.extendedTextMessage.text };
    }

    // Image message - Evolution API v2 format
    if (message.imageMessage) {
      // Try multiple URL sources that Evolution might use
      const mediaUrl = message.imageMessage.url
        || data.media?.url
        || data.mediaUrl
        || message.imageMessage.directPath;

      return {
        content: message.imageMessage.caption || '[Imagem]',
        mediaUrl: mediaUrl,
        mediaType: 'image'
      };
    }

    // Video message
    if (message.videoMessage) {
      const mediaUrl = message.videoMessage.url
        || data.media?.url
        || data.mediaUrl
        || message.videoMessage.directPath;

      return {
        content: message.videoMessage.caption || '[Vídeo]',
        mediaUrl: mediaUrl,
        mediaType: 'video'
      };
    }

    // Audio message
    if (message.audioMessage) {
      const mediaUrl = message.audioMessage.url
        || data.media?.url
        || data.mediaUrl;

      return {
        content: '[Áudio]',
        mediaUrl: mediaUrl,
        mediaType: 'audio'
      };
    }

    // Document message
    if (message.documentMessage) {
      const mediaUrl = message.documentMessage.url
        || data.media?.url
        || data.mediaUrl;

      return {
        content: message.documentMessage.fileName || '[Documento]',
        mediaUrl: mediaUrl,
        mediaType: 'document'
      };
    }

    // Sticker message
    if (message.stickerMessage) {
      const mediaUrl = message.stickerMessage.url
        || data.media?.url
        || data.mediaUrl;

      return {
        content: '[Sticker]',
        mediaUrl: mediaUrl,
        mediaType: 'sticker'
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
