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
}

@Processor(WHATSAPP_QUEUE, {
  concurrency: 5, // Process 5 jobs at a time
  limiter: {
    max: 5,       // Max 5 jobs
    duration: 1000, // Per second (rate limit for AI API)
  },
})
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WhatsappJobData>): Promise<any> {
    this.logger.log(`Processing job ${job.id} from ${job.data.remoteJid}`);

    const { instanceKey, remoteJid, messageId, content } = job.data;

    try {
      // 1. Find instance and company
      const instance = await this.prisma.instance.findUnique({
        where: { instanceKey },
        include: { company: true },
      });

      if (!instance) {
        throw new Error(`Instance not found: ${instanceKey}`);
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
        },
      });

      // 4. Call AI API (placeholder - implement your AI logic here)
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

      // 6. Deduct balance (example: 0.01 per message)
      await this.prisma.company.update({
        where: { id: instance.companyId },
        data: {
          balance: { decrement: 0.01 },
        },
      });

      // 7. Send response via Evolution API (placeholder)
      await this.sendWhatsAppMessage(instanceKey, remoteJid, aiResponse);

      this.logger.log(`Job ${job.id} completed successfully`);
      return { status: 'processed', messageId: message.id };

    } catch (error) {
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
