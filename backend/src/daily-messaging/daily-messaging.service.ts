import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// DTOs
export interface CreateSubscriberDto {
  name: string;
  email?: string;
  phone: string;
  source?: string;
  transactionId?: string;
  productName?: string;
}

export interface UpdateSubscriberDto {
  name?: string;
  email?: string;
  status?: 'active' | 'paused' | 'completed' | 'refunded' | 'opted_out';
}

export interface CreateMessageDto {
  dayNumber: number;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface UpdateMessageDto {
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  isActive?: boolean;
}

export interface ImportMessageDto {
  dayNumber: number;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
}

@Injectable()
export class DailyMessagingService {
  private readonly logger = new Logger(DailyMessagingService.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.evolutionApiUrl = this.config.get<string>('EVOLUTION_API_URL') || 'http://evolution:8080';
    this.evolutionApiKey = this.config.get<string>('EVOLUTION_API_KEY') || '';
  }

  // ================================
  // SUBSCRIBERS
  // ================================

  async listSubscribers(companyId: string, status?: string) {
    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    return this.prisma.dailyMessageSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sendLogs: true },
        },
      },
    });
  }

  async getSubscriber(id: string, companyId: string) {
    const subscriber = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { id, companyId },
      include: {
        sendLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    return subscriber;
  }

  async createSubscriber(companyId: string, dto: CreateSubscriberDto) {
    // Normalize phone to E.164
    const phone = this.normalizePhone(dto.phone);
    const remoteJid = this.phoneToJid(phone);

    // Check if already exists
    const existing = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { companyId, phone },
    });

    if (existing) {
      // If opted_out or completed, reactivate
      if (existing.status === 'opted_out' || existing.status === 'completed') {
        return this.prisma.dailyMessageSubscriber.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            currentDay: 1,
            startDate: new Date(),
            lastSentAt: null,
            completedAt: null,
            name: dto.name,
            email: dto.email || existing.email,
          },
        });
      }

      throw new BadRequestException('Subscriber already exists');
    }

    return this.prisma.dailyMessageSubscriber.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        phone,
        remoteJid,
        source: dto.source || 'manual',
        transactionId: dto.transactionId,
        productName: dto.productName,
        startDate: new Date(),
      },
    });
  }

  async updateSubscriber(id: string, companyId: string, dto: UpdateSubscriberDto) {
    const subscriber = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { id, companyId },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    return this.prisma.dailyMessageSubscriber.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSubscriber(id: string, companyId: string) {
    const subscriber = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { id, companyId },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    return this.prisma.dailyMessageSubscriber.delete({
      where: { id },
    });
  }

  async optOutSubscriber(companyId: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const subscriber = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { companyId, phone: normalizedPhone, status: 'active' },
    });

    if (!subscriber) {
      return null;
    }

    return this.prisma.dailyMessageSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'opted_out' },
    });
  }

  async refundSubscriber(companyId: string, phone: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const subscriber = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { companyId, phone: normalizedPhone },
    });

    if (!subscriber) {
      return null;
    }

    return this.prisma.dailyMessageSubscriber.update({
      where: { id: subscriber.id },
      data: { status: 'refunded' },
    });
  }

  // ================================
  // MESSAGES
  // ================================

  async listMessages(companyId: string) {
    return this.prisma.dailyMessage.findMany({
      where: { companyId },
      orderBy: { dayNumber: 'asc' },
    });
  }

  async getMessage(companyId: string, dayNumber: number) {
    return this.prisma.dailyMessage.findFirst({
      where: { companyId, dayNumber },
    });
  }

  async createOrUpdateMessage(companyId: string, dto: CreateMessageDto) {
    return this.prisma.dailyMessage.upsert({
      where: {
        companyId_dayNumber: {
          companyId,
          dayNumber: dto.dayNumber,
        },
      },
      create: {
        companyId,
        dayNumber: dto.dayNumber,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
      },
      update: {
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
      },
    });
  }

  async updateMessage(companyId: string, dayNumber: number, dto: UpdateMessageDto) {
    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, dayNumber },
    });

    if (!message) {
      throw new NotFoundException(`Message for day ${dayNumber} not found`);
    }

    return this.prisma.dailyMessage.update({
      where: { id: message.id },
      data: dto,
    });
  }

  async deleteMessage(companyId: string, dayNumber: number) {
    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, dayNumber },
    });

    if (!message) {
      throw new NotFoundException(`Message for day ${dayNumber} not found`);
    }

    return this.prisma.dailyMessage.delete({
      where: { id: message.id },
    });
  }

  async importMessages(companyId: string, messages: ImportMessageDto[]) {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as { dayNumber: number; error: string }[],
    };

    for (const msg of messages) {
      try {
        if (msg.dayNumber < 1 || msg.dayNumber > 365) {
          results.errors.push({
            dayNumber: msg.dayNumber,
            error: 'Day number must be between 1 and 365',
          });
          continue;
        }

        const existing = await this.prisma.dailyMessage.findFirst({
          where: { companyId, dayNumber: msg.dayNumber },
        });

        if (existing) {
          await this.prisma.dailyMessage.update({
            where: { id: existing.id },
            data: {
              content: msg.content,
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType,
            },
          });
          results.updated++;
        } else {
          await this.prisma.dailyMessage.create({
            data: {
              companyId,
              dayNumber: msg.dayNumber,
              content: msg.content,
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType,
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({
          dayNumber: msg.dayNumber,
          error: error.message,
        });
      }
    }

    return results;
  }

  // ================================
  // SEND LOGS
  // ================================

  async listLogs(companyId: string, options: { subscriberId?: string; status?: string; limit?: number; offset?: number } = {}) {
    const { subscriberId, status, limit = 100, offset = 0 } = options;

    const where: any = {};

    if (subscriberId) {
      where.subscriberId = subscriberId;
    } else {
      // Filter by company through subscriber
      where.subscriber = { companyId };
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      this.prisma.dailyMessageSendLog.findMany({
        where,
        include: {
          subscriber: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.dailyMessageSendLog.count({ where }),
    ]);

    return { logs, total };
  }

  // ================================
  // SEND MESSAGE
  // ================================

  async sendDailyMessages(companyId: string) {
    this.logger.log(`Starting daily message send for company ${companyId}`);

    // Get all active subscribers
    const subscribers = await this.prisma.dailyMessageSubscriber.findMany({
      where: { companyId, status: 'active' },
    });

    this.logger.log(`Found ${subscribers.length} active subscribers`);

    // Get the company's instance
    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
    });

    if (!instance) {
      this.logger.warn(`No connected instance found for company ${companyId}`);
      return { sent: 0, failed: 0, skipped: subscribers.length };
    }

    let sent = 0;
    let failed = 0;
    let completed = 0;

    for (const subscriber of subscribers) {
      // Check if day > 365
      if (subscriber.currentDay > 365) {
        await this.prisma.dailyMessageSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
        completed++;
        continue;
      }

      // Get message for current day
      const message = await this.prisma.dailyMessage.findFirst({
        where: { companyId, dayNumber: subscriber.currentDay, isActive: true },
      });

      if (!message) {
        this.logger.warn(`No message found for day ${subscriber.currentDay}`);
        continue;
      }

      // Create log entry
      const log = await this.prisma.dailyMessageSendLog.create({
        data: {
          subscriberId: subscriber.id,
          dayNumber: subscriber.currentDay,
          status: 'pending',
        },
      });

      try {
        // Send via Evolution API
        await this.sendWhatsAppMessage(
          instance.instanceKey,
          subscriber.remoteJid,
          message.content,
          message.mediaUrl,
          message.mediaType,
        );

        // Update log as sent
        await this.prisma.dailyMessageSendLog.update({
          where: { id: log.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        // Update subscriber
        await this.prisma.dailyMessageSubscriber.update({
          where: { id: subscriber.id },
          data: {
            currentDay: subscriber.currentDay + 1,
            lastSentAt: new Date(),
          },
        });

        sent++;
      } catch (error: any) {
        this.logger.error(`Failed to send message to ${subscriber.phone}: ${error.message}`);

        await this.prisma.dailyMessageSendLog.update({
          where: { id: log.id },
          data: {
            status: 'failed',
            error: error.message,
            attempts: 1,
          },
        });

        failed++;
      }
    }

    this.logger.log(`Daily send complete: sent=${sent}, failed=${failed}, completed=${completed}`);

    return { sent, failed, completed };
  }

  async sendTestMessage(companyId: string, phone: string, dayNumber: number) {
    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, dayNumber },
    });

    if (!message) {
      throw new NotFoundException(`Message for day ${dayNumber} not found`);
    }

    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
    });

    if (!instance) {
      throw new BadRequestException('No connected WhatsApp instance');
    }

    const normalizedPhone = this.normalizePhone(phone);
    const remoteJid = this.phoneToJid(normalizedPhone);

    await this.sendWhatsAppMessage(
      instance.instanceKey,
      remoteJid,
      message.content,
      message.mediaUrl,
      message.mediaType,
    );

    return { success: true, message: 'Test message sent' };
  }

  // ================================
  // HELPERS
  // ================================

  private normalizePhone(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // Add Brazil country code if not present
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }

    return '+' + cleaned;
  }

  private phoneToJid(phone: string): string {
    const numbers = phone.replace(/\D/g, '');
    return `${numbers}@s.whatsapp.net`;
  }

  private async sendWhatsAppMessage(
    instanceKey: string,
    remoteJid: string,
    content: string,
    mediaUrl?: string | null,
    mediaType?: string | null,
  ) {
    const url = `${this.evolutionApiUrl}/message/sendText/${instanceKey}`;

    // If has media, use media endpoint
    if (mediaUrl && mediaType) {
      const mediaEndpoint = mediaType === 'image'
        ? 'sendMedia'
        : mediaType === 'video'
          ? 'sendMedia'
          : 'sendMedia';

      const mediaResponse = await axios.post(
        `${this.evolutionApiUrl}/message/${mediaEndpoint}/${instanceKey}`,
        {
          number: remoteJid,
          mediatype: mediaType,
          media: mediaUrl,
          caption: content,
        },
        {
          headers: {
            'apikey': this.evolutionApiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return mediaResponse.data;
    }

    // Text only
    const response = await axios.post(
      url,
      {
        number: remoteJid,
        text: content,
      },
      {
        headers: {
          'apikey': this.evolutionApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  // Check if message is opt-out request
  isOptOutMessage(content: string): boolean {
    const optOutKeywords = ['parar', 'stop', 'sair', 'cancelar', 'desinscrever'];
    const lowerContent = content.toLowerCase().trim();
    return optOutKeywords.some(keyword => lowerContent === keyword || lowerContent.includes(keyword));
  }

  // Get subscriber by phone (for opt-out checking)
  async getActiveSubscriberByPhone(companyId: string, remoteJid: string) {
    return this.prisma.dailyMessageSubscriber.findFirst({
      where: {
        companyId,
        remoteJid,
        status: 'active',
      },
    });
  }
}
