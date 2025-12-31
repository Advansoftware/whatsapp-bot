import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { WHATSAPP_QUEUE } from './constants';

export interface WhatsappJobData {
  instanceKey: string;
  remoteJid: string;
  messageId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaData?: any; // JSON data for downloading media via Evolution API
  pushName?: string;
  timestamp: number;
  fromMe?: boolean;
  isHistory?: boolean;
}

@Processor(WHATSAPP_QUEUE, {
  concurrency: 20, // Increased from 5 for faster processing
  limiter: {
    max: 50, // Increased from 5
    duration: 1000,
  },
})
export class WhatsappProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsappProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly chatbotService: ChatbotService,
  ) {
    super();
  }

  async process(job: Job<WhatsappJobData>): Promise<any> {
    const { instanceKey, remoteJid, messageId, content, mediaUrl, mediaType, mediaData, fromMe, isHistory } = job.data;
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
              mediaUrl,
              mediaType,
              mediaData,
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
            mediaUrl,
            mediaType,
            mediaData,
            direction: 'outgoing',
            status: 'processed',
            companyId: instance.companyId,
            instanceId: instance.id,
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
          mediaUrl,
          mediaType,
          mediaData,
          direction: 'incoming',
          status: 'pending',
          companyId: instance.companyId,
          instanceId: instance.id,
          pushName: job.data.pushName, // Save contact name
        },
      });

      // 4. Atualizar ou criar conversa
      await this.updateOrCreateConversation(instance.companyId, instance.id, remoteJid);

      // 5. PRIMEIRO: Tentar processar com Chatbot (fluxos baseados em keyword)
      const chatbotResult = await this.chatbotService.processMessage(
        instance.companyId,
        content,
        { customerName: job.data.pushName },
      );

      if (chatbotResult.matched && chatbotResult.responses.length > 0) {
        this.logger.log(`Chatbot flow matched for ${remoteJid}, sending ${chatbotResult.responses.length} messages`);

        // Enviar todas as respostas do fluxo
        for (const response of chatbotResult.responses) {
          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, response);
          // Pequeno delay entre mensagens para parecer mais natural
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Atualizar mensagem com resposta do chatbot
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            response: chatbotResult.responses.join('\n---\n'),
            status: 'processed',
            processedAt: new Date(),
          },
        });

        // Deduzir balance
        await this.prisma.company.update({
          where: { id: instance.companyId },
          data: {
            balance: { decrement: 0.01 * chatbotResult.responses.length },
          },
        });

        this.logger.log(`Job ${job.id} completed via Chatbot flow`);
        return { status: 'processed_chatbot', messageId: message.id };
      }

      // 6. Se chatbot não respondeu, processar com Secretária IA
      const secretaryResult = await this.aiService.processSecretaryMessage(
        content,
        instance.companyId,
        instanceKey,
        remoteJid,
        job.data.pushName,
      );

      // 7. Se deve responder, enviar resposta
      if (secretaryResult.shouldRespond && secretaryResult.response) {
        await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, secretaryResult.response);

        // Atualizar mensagem com resposta
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            response: secretaryResult.response,
            status: 'processed',
            processedAt: new Date(),
          },
        });

        // Deduzir balance
        await this.prisma.company.update({
          where: { id: instance.companyId },
          data: {
            balance: { decrement: 0.01 },
          },
        });
      } else {
        // Apenas marcar como processada
        await this.prisma.message.update({
          where: { id: message.id },
          data: {
            status: 'processed',
            processedAt: new Date(),
          },
        });
      }

      // 8. SISTEMA DE MEMÓRIA: Extrair e salvar memórias da mensagem
      try {
        const contact = await this.prisma.contact.findFirst({
          where: { companyId: instance.companyId, remoteJid },
          select: { id: true, totalMessages: true, aiAnalyzedAt: true },
        });

        if (contact) {
          // Extrair memórias da mensagem
          await this.aiService.extractAndSaveMemory(contact.id, content, message.id);

          // Atualizar contador de mensagens
          const updatedContact = await this.prisma.contact.update({
            where: { id: contact.id },
            data: { totalMessages: { increment: 1 } },
            select: { id: true, totalMessages: true, aiAnalyzedAt: true },
          });

          // Qualificação automática: dispara quando atingir 300 mensagens e ainda não foi analisado
          if (updatedContact.totalMessages >= 300 && !updatedContact.aiAnalyzedAt) {
            this.logger.log(`Auto-qualifying lead ${contact.id} with ${updatedContact.totalMessages} messages`);
            await this.aiService.analyzeAndQualifyLead(contact.id, instance.companyId);
          }
        }
      } catch (memoryError) {
        // Não falhar a mensagem por erro de memória
        this.logger.warn(`Memory extraction failed: ${memoryError.message}`);
      }

      // 9. Se deve notificar o dono
      if (secretaryResult.shouldNotifyOwner) {
        const aiConfig = await this.prisma.aISecretary.findUnique({
          where: { companyId: instance.companyId },
        });

        if (aiConfig?.ownerPhone) {
          // Buscar últimas mensagens para resumo
          const recentMessages = await this.prisma.message.findMany({
            where: { companyId: instance.companyId, remoteJid },
            orderBy: { createdAt: 'desc' },
            take: 5,
          });

          const summary = recentMessages
            .reverse()
            .map(m => `${m.direction === 'incoming' ? '👤' : '🤖'} ${m.content.substring(0, 100)}`)
            .join('\n');

          await this.aiService.notifyOwner({
            instanceKey,
            ownerPhone: aiConfig.ownerPhone,
            customerName: job.data.pushName || 'Cliente',
            customerPhone: remoteJid.replace('@s.whatsapp.net', ''),
            reason: secretaryResult.notificationReason || 'Atenção necessária',
            summary,
          });
        }
      }

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

  /**
   * Atualiza ou cria uma conversa para rastreamento
   */
  private async updateOrCreateConversation(
    companyId: string,
    instanceId: string,
    remoteJid: string,
  ): Promise<void> {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: { companyId, remoteJid },
    });

    if (existingConversation) {
      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'active',
        },
      });
    } else {
      await this.prisma.conversation.create({
        data: {
          companyId,
          instanceId,
          remoteJid,
          status: 'active',
          priority: 'normal',
          lastMessageAt: new Date(),
        },
      });
    }
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
