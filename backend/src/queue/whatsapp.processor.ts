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

      // Verificar configuração da secretária e se é o proprietário
      const aiConfig = await this.prisma.aISecretary.findUnique({
        where: { companyId: instance.companyId },
      });

      // Extrair número do remetente (sem @s.whatsapp.net)
      const senderNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      const ownerPhone = aiConfig?.ownerPhone?.replace(/\D/g, '') || ''; // Remove não-dígitos

      // Mensagens fromMe (enviadas por você) NUNCA devem ser respondidas pela IA
      // A IA só responde a mensagens RECEBIDAS (de clientes ou do dono via outro número)
      if (fromMe) {
        // Salvar mensagem outgoing e ignorar IA
        await this.prisma.message.upsert({
          where: { messageId },
          update: {
            content,
            mediaUrl,
            mediaType,
            mediaData,
            direction: 'outgoing',
            status: 'processed',
          },
          create: {
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

      // Verifica se é uma mensagem recebida do número do proprietário (ele mandando do celular pessoal)
      const isOwnerSendingToBot = !!ownerPhone && senderNumber === ownerPhone && aiConfig?.testMode === true && aiConfig?.enabled === true;

      const isPersonalAssistantMode = isOwnerSendingToBot;

      // Log se está em modo secretária pessoal
      if (isPersonalAssistantMode) {
        this.logger.log(`👤 PERSONAL ASSISTANT MODE: Processing owner message - acting as personal secretary`);
      }

      // ========================================
      // TRANSCRIÇÃO DE ÁUDIO
      // ========================================
      let processedContent = content;

      if (mediaType === 'audio' && mediaData && aiConfig?.transcribeAudio !== false) {
        this.logger.log(`🎤 Transcribing audio message from ${remoteJid}`);
        const transcription = await this.aiService.processAudioMessage(instanceKey, mediaData);
        processedContent = `[Áudio transcrito]: ${transcription}`;
        this.logger.log(`🎤 Transcription: ${transcription.substring(0, 100)}...`);
      }

      // 2. Check company balance
      if (instance.company.balance.lessThanOrEqualTo(0)) {
        this.logger.warn(`Company ${instance.company.name} has no balance`);
        return { status: 'skipped', reason: 'no_balance' };
      }

      // 3. Save incoming message (com transcrição se houver) - usando upsert para evitar duplicatas
      const message = await this.prisma.message.upsert({
        where: { messageId },
        update: {
          content: processedContent, // Atualiza com transcrição se for retry
        },
        create: {
          remoteJid,
          messageId,
          content: processedContent, // Usa conteúdo transcrito se for áudio
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

      // 4. Atualizar ou criar conversa e verificar se IA está habilitada
      const conversation = await this.updateOrCreateConversation(instance.companyId, instance.id, remoteJid);

      // Se a IA está desabilitada para esta conversa, apenas salvar
      if (conversation && !conversation.aiEnabled) {
        this.logger.log(`AI disabled for conversation ${conversation.id}, skipping AI processing`);
        await this.prisma.message.update({
          where: { id: message.id },
          data: { status: 'processed', processedAt: new Date() },
        });
        return { status: 'ai_disabled', messageId: message.id };
      }

      // ========================================
      // MODO SECRETÁRIA PESSOAL - Comandos do dono
      // ========================================
      if (isPersonalAssistantMode) {
        // ========================================
        // PROCESSAMENTO DE IMAGEM PARA INVENTÁRIO
        // ========================================
        if (mediaType === 'image' && mediaData) {
          const lowerContent = (content || '').toLowerCase();
          const isInventoryRequest = lowerContent.includes('adiciona') ||
            lowerContent.includes('cadastra') ||
            lowerContent.includes('inventário') ||
            lowerContent.includes('inventario') ||
            lowerContent.includes('estoque') ||
            lowerContent.includes('produto') ||
            lowerContent.match(/\d+\s*(unidade|item|peça|un|pç|desse)/i);

          if (isInventoryRequest) {
            this.logger.log(`📷 Processing image for inventory from owner`);

            const imageResult = await this.aiService.processImageForInventory(
              instanceKey,
              mediaData,
              content || '',
              instance.companyId,
            );

            if (imageResult.identified && imageResult.awaitingConfirmation) {
              // Salvar produto pendente no cache da conversa
              await this.prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                  summary: JSON.stringify({
                    type: 'pending_product',
                    data: imageResult.pendingProduct,
                    createdAt: new Date().toISOString(),
                  }),
                },
              });
            }

            await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, imageResult.response);

            await this.prisma.message.update({
              where: { id: message.id },
              data: {
                response: imageResult.response,
                status: 'processed',
                processedAt: new Date(),
              },
            });

            return { status: 'processed_inventory_image', messageId: message.id };
          }
        }

        // ========================================
        // VERIFICAR SE É CONFIRMAÇÃO DE PRODUTO PENDENTE
        // ========================================
        if (conversation?.summary) {
          try {
            const pendingData = JSON.parse(conversation.summary);
            if (pendingData.type === 'pending_product' && pendingData.data) {
              const confirmResult = await this.aiService.parseProductConfirmation(
                processedContent,
                pendingData.data,
              );

              if (confirmResult.confirmed && confirmResult.productData) {
                // Criar produto no inventário
                const createResult = await this.aiService.createProductFromConversation(
                  instance.companyId,
                  confirmResult.productData,
                );

                // Limpar produto pendente
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { summary: null },
                });

                await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, createResult.response);

                await this.prisma.message.update({
                  where: { id: message.id },
                  data: {
                    response: createResult.response,
                    status: 'processed',
                    processedAt: new Date(),
                  },
                });

                return { status: 'product_created', messageId: message.id };
              } else if (confirmResult.needsMoreInfo) {
                await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, confirmResult.needsMoreInfo);

                await this.prisma.message.update({
                  where: { id: message.id },
                  data: {
                    response: confirmResult.needsMoreInfo,
                    status: 'processed',
                    processedAt: new Date(),
                  },
                });

                return { status: 'awaiting_product_info', messageId: message.id };
              }
              // Se não confirmou, limpar e continuar fluxo normal
              if (!confirmResult.confirmed && !confirmResult.needsMoreInfo) {
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { summary: null },
                });
              }
            }
          } catch (e) {
            // summary não é JSON de produto pendente, ignorar
          }
        }

        // Verificar se é um comando/instrução
        const commandResult = await this.aiService.parseOwnerCommand(processedContent, instance.companyId);

        if (commandResult.isCommand && commandResult.response) {
          // Responder com confirmação do comando
          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, commandResult.response);

          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              response: commandResult.response,
              status: 'processed',
              processedAt: new Date(),
            },
          });

          this.logger.log(`Command processed for owner: ${processedContent.substring(0, 50)}...`);
          return { status: 'processed_command', messageId: message.id };
        }
      }

      // 5. PRIMEIRO: Tentar processar com Chatbot (fluxos baseados em keyword)
      // Pula chatbot se for modo secretária pessoal
      if (!isPersonalAssistantMode) {
        const chatbotResult = await this.chatbotService.processMessage(
          instance.companyId,
          processedContent, // Usa conteúdo transcrito
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
      }

      // 6. Se chatbot não respondeu (ou é modo secretária pessoal), processar com Secretária IA
      const secretaryResult = await this.aiService.processSecretaryMessage(
        processedContent, // Usa conteúdo transcrito
        instance.companyId,
        instanceKey,
        remoteJid,
        job.data.pushName,
        isPersonalAssistantMode, // Passa o flag indicando se é o dono falando
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

      // 8. SISTEMA DE MEMÓRIA: Extrair e salvar memórias da mensagem (pula se for secretária pessoal)
      if (!isPersonalAssistantMode) {
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
      }

      // 9. Se deve notificar o dono (nunca notifica no modo secretária pessoal)
      if (secretaryResult.shouldNotifyOwner && !isPersonalAssistantMode) {
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
   * Retorna a conversa para verificar aiEnabled
   */
  private async updateOrCreateConversation(
    companyId: string,
    instanceId: string,
    remoteJid: string,
  ): Promise<{ id: string; aiEnabled: boolean; summary: string | null }> {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: { companyId, remoteJid },
      select: { id: true, aiEnabled: true, summary: true },
    });

    if (existingConversation) {
      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'active',
        },
      });
      return existingConversation;
    } else {
      const newConversation = await this.prisma.conversation.create({
        data: {
          companyId,
          instanceId,
          remoteJid,
          status: 'active',
          priority: 'normal',
          lastMessageAt: new Date(),
        },
        select: { id: true, aiEnabled: true, summary: true },
      });
      return newConversation;
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
