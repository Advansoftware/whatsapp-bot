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
  // APPS
  // ================================

  async listApps(companyId: string) {
    return this.prisma.dailyMessageApp.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subscribers: true, messages: true },
        },
      },
    });
  }

  async getApp(id: string, companyId: string) {
    const app = await this.prisma.dailyMessageApp.findFirst({
      where: { id, companyId },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app;
  }

  async createApp(companyId: string, name: string) {
    return this.prisma.dailyMessageApp.create({
      data: {
        companyId,
        name,
      },
    });
  }

  async deleteApp(id: string, companyId: string) {
    const app = await this.prisma.dailyMessageApp.findFirst({
      where: { id, companyId },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return this.prisma.dailyMessageApp.delete({
      where: { id },
    });
  }

  // ================================
  // SUBSCRIBERS
  // ================================

  async listSubscribers(companyId: string, appId: string, status?: string) {
    // Verify app exists and belongs to company
    await this.getApp(appId, companyId);

    const where: any = { companyId, appId };
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
        app: true,
      },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscriber not found');
    }

    return subscriber;
  }

  async createSubscriber(companyId: string, dto: CreateSubscriberDto & { appId: string }) {
    // Verify app exists and belongs to company
    await this.getApp(dto.appId, companyId);

    // Normalize phone to E.164
    const phone = this.normalizePhone(dto.phone);
    const remoteJid = this.phoneToJid(phone);

    // Check if already exists in THIS app
    const existing = await this.prisma.dailyMessageSubscriber.findFirst({
      where: { companyId, appId: dto.appId, phone },
    });

    if (existing) {
      // If opted_out or completed, reactivate
      if (existing.status === 'opted_out' || existing.status === 'completed') {
        return this.prisma.dailyMessageSubscriber.update({
          where: { id: existing.id },
          data: {
            status: 'active',
            currentDay: 0,
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
        appId: dto.appId,
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

  async optOutSubscriber(companyId: string, phone: string, appId?: string) {
    const normalizedPhone = this.normalizePhone(phone);

    // Find ALL active subscriptions for this phone in this company
    // If appId is provided, restrict to that app
    const where: any = { companyId, phone: normalizedPhone, status: 'active' };
    if (appId) where.appId = appId;

    const subscribers = await this.prisma.dailyMessageSubscriber.findMany({
      where,
    });

    if (!subscribers.length) {
      return null;
    }

    // Opt-out all of them
    const updates = subscribers.map(sub =>
      this.prisma.dailyMessageSubscriber.update({
        where: { id: sub.id },
        data: { status: 'opted_out' },
      })
    );

    await this.prisma.$transaction(updates);

    return subscribers[0]; // Return one for reference
  }

  async refundSubscriber(companyId: string, phone: string, appId?: string) {
    const normalizedPhone = this.normalizePhone(phone);

    const where: any = { companyId, phone: normalizedPhone };
    if (appId) where.appId = appId;

    const subscribers = await this.prisma.dailyMessageSubscriber.findMany({
      where,
    });

    if (!subscribers.length) {
      return null;
    }

    const updates = subscribers.map(sub =>
      this.prisma.dailyMessageSubscriber.update({
        where: { id: sub.id },
        data: { status: 'refunded' },
      })
    );

    await this.prisma.$transaction(updates);

    return subscribers[0];
  }

  // ================================
  // MESSAGES
  // ================================

  async listMessages(companyId: string, appId: string) {
    // Verify app
    await this.getApp(appId, companyId);

    return this.prisma.dailyMessage.findMany({
      where: { companyId, appId },
      orderBy: { dayNumber: 'asc' },
    });
  }

  async getMessage(companyId: string, appId: string, dayNumber: number) {
    return this.prisma.dailyMessage.findFirst({
      where: { companyId, appId, dayNumber },
    });
  }

  async createOrUpdateMessage(companyId: string, appId: string, dto: CreateMessageDto) {
    // Verify app
    await this.getApp(appId, companyId);

    return this.prisma.dailyMessage.upsert({
      where: {
        appId_dayNumber: { // Update unique constraint name
          appId,
          dayNumber: dto.dayNumber,
        },
      },
      create: {
        companyId,
        appId,
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

  async updateMessage(companyId: string, appId: string, dayNumber: number, dto: UpdateMessageDto) {
    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, appId, dayNumber },
    });

    if (!message) {
      throw new NotFoundException(`Message for day ${dayNumber} not found`);
    }

    return this.prisma.dailyMessage.update({
      where: { id: message.id },
      data: dto,
    });
  }

  async deleteMessage(companyId: string, appId: string, dayNumber: number) {
    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, appId, dayNumber },
    });

    if (!message) {
      throw new NotFoundException(`Message for day ${dayNumber} not found`);
    }

    return this.prisma.dailyMessage.delete({
      where: { id: message.id },
    });
  }

  async importMessages(companyId: string, appId: string, messages: ImportMessageDto[]) {
    await this.getApp(appId, companyId);

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
          where: { companyId, appId, dayNumber: msg.dayNumber },
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
              appId,
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

  async listLogs(companyId: string, appId: string, options: { subscriberId?: string; status?: string; limit?: number; offset?: number } = {}) {
    const { subscriberId, status, limit = 100, offset = 0 } = options;

    const where: any = {};

    if (subscriberId) {
      where.subscriberId = subscriberId;
    } else {
      // Filter by app and company
      where.subscriber = { companyId, appId };
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

    const now = new Date();
    const oneDay = 1000 * 60 * 60 * 24;

    // Get all active subscribers
    const subscribers = await this.prisma.dailyMessageSubscriber.findMany({
      where: { companyId, status: 'active' },
      include: {
        app: true, // we need app info maybe?
      },
    });

    this.logger.log(`Found ${subscribers.length} active subscribers`);

    // Get the company's instance
    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
    });

    if (!instance) {
      this.logger.warn(`No connected instance found for company ${companyId}`);
      return { sent: 0, failed: 0, skipped: subscribers.length, completed: 0 };
    }

    let sent = 0;
    let failed = 0;
    let completed = 0;
    let skipped = 0;

    for (const subscriber of subscribers) {
      // Calculate the subscriber's journey day (days since purchase + 1)
      const daysSinceStart = Math.floor((now.getTime() - subscriber.startDate.getTime()) / oneDay);
      const journeyDay = daysSinceStart + 1; // +1 because day 1 is the purchase day

      this.logger.debug(`Subscriber ${subscriber.phone} (App: ${subscriber.appId}): started ${subscriber.startDate.toISOString()}, journey day ${journeyDay}`);

      // Check if subscriber has exceeded 365 days
      if (journeyDay > 365) {
        await this.prisma.dailyMessageSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
        this.logger.log(`Subscriber ${subscriber.phone} completed 365 days`);
        completed++;
        continue;
      }

      // Check if message was already sent today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const alreadySentToday = await this.prisma.dailyMessageSendLog.findFirst({
        where: {
          subscriberId: subscriber.id,
          status: 'sent',
          createdAt: { gte: todayStart },
        },
      });

      if (alreadySentToday) {
        this.logger.debug(`Message already sent to ${subscriber.phone} today`);
        skipped++;
        continue;
      }

      // Get message for this subscriber's journey day AND APP
      const message = await this.prisma.dailyMessage.findFirst({
        where: {
          companyId,
          appId: subscriber.appId,
          dayNumber: journeyDay,
          isActive: true
        },
      });

      if (!message) {
        this.logger.warn(`No message found for journey day ${journeyDay} in App ${subscriber.appId}`);
        skipped++;
        continue;
      }

      // Create log entry
      const log = await this.prisma.dailyMessageSendLog.create({
        data: {
          subscriberId: subscriber.id,
          dayNumber: journeyDay,
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

        // Update subscriber current day
        await this.prisma.dailyMessageSubscriber.update({
          where: { id: subscriber.id },
          data: {
            currentDay: journeyDay,
            lastSentAt: new Date(),
          },
        });

        sent++;
        this.logger.log(`Sent day ${journeyDay} message to ${subscriber.phone}`);
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

    this.logger.log(`Daily send complete: sent=${sent}, failed=${failed}, completed=${completed}, skipped=${skipped}`);

    return { sent, failed, completed, skipped };
  }

  async sendTestMessage(companyId: string, phone: string, dayNumber: number, appId: string) {
    // Verify app
    await this.getApp(appId, companyId);

    const message = await this.prisma.dailyMessage.findFirst({
      where: { companyId, appId, dayNumber },
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
  // STATS
  // ================================

  async getStats(companyId: string, appId?: string) {
    const whereClause: any = { companyId };
    if (appId) {
      whereClause.appId = appId;
    }

    const [totalSubscribers, activeSubscribers, messagesCount, todayLogs] = await Promise.all([
      this.prisma.dailyMessageSubscriber.count({ where: whereClause }),
      this.prisma.dailyMessageSubscriber.count({ where: { ...whereClause, status: 'active' } }),
      this.prisma.dailyMessage.count({ where: { ...whereClause, isActive: true } }),
      this.prisma.dailyMessageSendLog.count({
        where: {
          subscriber: whereClause,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      totalSubscribers,
      activeSubscribers,
      messagesCount,
      todayLogs,
    };
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

  // Get subscriber by phone (for opt-out checking) - checks ALL APPS
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

