import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WHATSAPP_QUEUE } from './constants';

export interface WhatsappJobData {
  instanceKey: string;
  remoteJid: string;
  messageId: string;
  content: string;
  pushName?: string;
  timestamp: number;
  fromMe?: boolean;
  isHistory?: boolean;
}

@Processor(WHATSAPP_QUEUE, {
  concurrency: 5,
  limiter: {
    max: 5,
    duration: 1000,
  },
})
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WhatsappJobData>): Promise<any> {
    const { instanceKey, remoteJid, messageId, content, fromMe, isHistory } = job.data;
    const direction = fromMe ? 'outgoing' : 'incoming';

    this.logger.log(`Processing job ${job.id} from ${remoteJid} (History: ${!!isHistory})`);

    try {
      // 1. Find instance and company
      const instance = await this.prisma.instance.findUnique({
        where: { instanceKey },
        include: { company: true },
      });

      if (!instance) {
        throw new Error(`Instance not found: ${instanceKey}`);
      }

      // If history sync, just save and exit
      if (isHistory) {
        // Check if exists to avoid duplicates (upsert-like behavior)
        const exists = await this.prisma.message.findFirst({
          where: { messageId }
        });

        if (!exists) {
          await this.prisma.message.create({
            data: {
              remoteJid,
              messageId,
              content,
              direction,
              status: 'processed', // History is already processed
              companyId: instance.companyId,
              instanceId: instance.id,
              processedAt: new Date(job.data.timestamp * 1000), // Use actual timestamp
              createdAt: new Date(job.data.timestamp * 1000),
              pushName: job.data.pushName, // Save contact name
            },
          });
        }
        return { status: 'processed_history', messageId };
      }

      // ... Normal AI Flow for NEW INCOMING messages only ...
      if (fromMe) {
        // If it's a new message but from ME (e.g. sent via phone), just save and ignore AI
        await this.prisma.message.create({
          data: {
            remoteJid,
            messageId,
            content,
            direction: 'outgoing',
            status: 'processed',
            companyId: instance.companyId,
            instanceId: instance.id,
            // pushName not needed for 'fromMe' usually, but can add if available
          },
        });
        return { status: 'saved_outgoing' };
      }

      // 2. Check company balance
      if (instance.company.balance.lessThanOrEqualTo(0)) {
        this.logger.warn(`Company ${instance.company.name} has no balance`);
        return { status: 'skipped', reason: 'no_balance' };
      }

      // 3. Save incoming message
      const message = await this.prisma.message.create({
        data: {
          remoteJid,
          messageId,
          content,
          direction: 'incoming',
          status: 'pending',
          companyId: instance.companyId,
          instanceId: instance.id,
          pushName: job.data.pushName, // Save contact name
        },
      });

      // 4. Call AI API (placeholder)
      const aiResponse = await this.callAIAPI(content, instance.company.id);

      // 5. Update message with response
      await this.prisma.message.update({
        where: { id: message.id },
        data: {
          response: aiResponse,
          status: 'processed',
          processedAt: new Date(),
        },
      });

      // 6. Deduct balance
      await this.prisma.company.update({
        where: { id: instance.companyId },
        data: {
          balance: { decrement: 0.01 },
        },
      });

      // 7. Send response
      await this.sendWhatsAppMessage(instanceKey, remoteJid, aiResponse);

      this.logger.log(`Job ${job.id} completed successfully`);
      return { status: 'processed', messageId: message.id };

    } catch (error) {
      // Silent error for history to not clog logs
      if (isHistory) {
        this.logger.warn(`History sync failed for ${messageId}: ${error.message}`);
        return { status: 'failed_history' };
      }
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }

  private async callAIAPI(message: string, companyId: string): Promise<string> {
    // TODO: Implement Gemini API call
    // const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-goog-api-key': process.env.GEMINI_API_KEY,
    //   },
    //   body: JSON.stringify({
    //     contents: [{ parts: [{ text: message }] }],
    //   }),
    // });

    this.logger.log(`AI API called for company ${companyId}`);
    return `Resposta automática para: "${message.substring(0, 50)}..."`;
  }

  private async sendWhatsAppMessage(instanceKey: string, remoteJid: string, message: string): Promise<void> {
    // TODO: Implement Evolution API call
    // const response = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceKey}`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'apikey': process.env.EVOLUTION_API_KEY,
    //   },
    //   body: JSON.stringify({
    //     number: remoteJid,
    //     text: message,
    //   }),
    // });

    this.logger.log(`Message sent to ${remoteJid} via instance ${instanceKey}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}
