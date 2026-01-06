import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { AITranscriptionService } from '../ai/ai-transcription.service';
import { AITasksService } from '../ai/ai-tasks.service';
import { AIExpensesService } from '../ai/ai-expenses.service';
import { AIExpensesFlowService } from '../ai/ai-expenses-flow.service';
import { ChatbotService } from '../chatbot/chatbot.service';
import { SecretaryTasksService } from '../secretary-tasks/secretary-tasks.service';
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
    private readonly aiTranscriptionService: AITranscriptionService,
    private readonly aiTasksService: AITasksService,
    private readonly aiExpensesService: AIExpensesService,
    private readonly aiExpensesFlowService: AIExpensesFlowService,
    private readonly chatbotService: ChatbotService,
    private readonly secretaryTasksService: SecretaryTasksService,
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

      // Helper para comparar números de telefone (lidando com o 9º dígito do Brasil)
      // Ex: 553584216196 (API) vs 5535984216196 (Config)
      const isPhoneMatch = (phone1: string, phone2: string) => {
        if (!phone1 || !phone2) return false;

        // Se forem iguais, retorna true
        if (phone1 === phone2) return true;

        // Normaliza removendo o 9º dígito se for número brasileiro (começa com 55 e tem 13 dígitos)
        // 55 35 9 8421 6196 -> remove índice 4 (o '9')
        const normalize = (p: string) => {
          if (p.length === 13 && p.startsWith('55') && p[4] === '9') {
            return p.slice(0, 4) + p.slice(5);
          }
          return p;
        };

        const p1Norm = normalize(phone1);
        const p2Norm = normalize(phone2);

        if (p1Norm === p2Norm) return true;

        // Fallback: verifica sufixo (últimos 8 dígitos e DDD)
        // Se ambos tiverem pelo menos 10 dígitos (DDD + 8 números)
        if (phone1.length >= 10 && phone2.length >= 10) {
          return phone1.endsWith(phone2.slice(-8)) && phone1.slice(0, 4) === phone2.slice(0, 4); // Mesmo DDD e finais iguais? (simplificado)
        }

        return phone1.includes(phone2) || phone2.includes(phone1);
      };

      // DEBUG: Verificar por que não está entrando no modo secretária pessoal
      if (fromMe) {
        this.logger.log(`DEBUG Check SelfChat: sender=${senderNumber}, owner=${ownerPhone}, match=${isPhoneMatch(senderNumber, ownerPhone)}, enabled=${aiConfig?.enabled}, testMode=${aiConfig?.testMode}`);
      }

      // Verificar se é o dono mandando mensagem para si mesmo (chat pessoal com a secretária)
      // Nesse caso, remoteJid é o número do bot/dono e fromMe é true
      // Requer que "Secretária Pessoal" (testMode) esteja ativado
      const isOwnerSelfChat = fromMe && isPhoneMatch(senderNumber, ownerPhone) && aiConfig?.enabled === true && aiConfig?.testMode === true;

      // Mensagens fromMe (enviadas por você) NUNCA devem ser respondidas pela IA
      // EXCETO: quando é o dono mandando para si mesmo (self-chat como secretária pessoal)
      if (fromMe && !isOwnerSelfChat) {
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

      // Verifica se é uma mensagem recebida do número do proprietário
      // Pode ser: 1) fromMe && self-chat, ou 2) de outro número igual ao do dono
      // Requer que "Secretária Pessoal" (testMode) esteja ativado
      const isOwnerSendingToBot = isOwnerSelfChat || (isPhoneMatch(senderNumber, ownerPhone) && aiConfig?.enabled === true && aiConfig?.testMode === true);

      const isPersonalAssistantMode = isOwnerSendingToBot;

      // Log se está em modo secretária pessoal
      if (isPersonalAssistantMode) {
        this.logger.log(`👤 PERSONAL ASSISTANT MODE: Processing owner message (self-chat: ${isOwnerSelfChat}) - acting as personal secretary`);
      }

      // ========================================
      // TRANSCRIÇÃO DE ÁUDIO
      // ========================================
      let processedContent = content;

      if (mediaType === 'audio' && mediaData && aiConfig?.transcribeAudio !== false) {
        this.logger.log(`🎤 Transcribing audio message from ${remoteJid}`);
        const transcription = await this.aiTranscriptionService.processAudioMessage(instanceKey, mediaData);
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
        // VERIFICAR FLUXO ATIVO (Despesas, etc)
        // ========================================
        const hasActiveExpenseFlow = await this.aiExpensesFlowService.hasActiveFlow(
          instance.companyId,
          remoteJid,
        );

        if (hasActiveExpenseFlow) {
          this.logger.log(`💬 Processing expense flow response from owner`);

          const flowResult = await this.aiExpensesFlowService.processFlowMessage(
            instance.companyId,
            remoteJid,
            processedContent,
          );

          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, flowResult.response);

          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              response: flowResult.response,
              status: 'processed',
              processedAt: new Date(),
            },
          });

          return { status: 'processed_expense_flow', messageId: message.id, flowEnded: flowResult.flowEnded };
        }

        // ========================================
        // CRIAÇÃO DE TAREFAS VIA CHAT
        // ========================================
        if (this.aiTasksService.isTaskRequest(processedContent)) {
          this.logger.log(`📋 Detected task creation request from owner`);

          const taskResult = await this.aiTasksService.processTaskRequest(
            processedContent,
            instance.companyId,
          );

          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, taskResult.response);

          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              response: taskResult.response,
              status: 'processed',
              processedAt: new Date(),
            },
          });

          if (taskResult.taskCreated) {
            this.logger.log(`✅ Task created via chat: ${taskResult.taskId}`);
          }

          return { status: 'processed_task_request', messageId: message.id, taskCreated: taskResult.taskCreated };
        }

        // ========================================
        // LISTAR TAREFAS (comando "minhas tarefas")
        // ========================================
        const lowerContent = processedContent.toLowerCase();
        if (lowerContent.includes('minhas tarefas') || lowerContent.includes('listar tarefas') || lowerContent.includes('quais tarefas')) {
          const tasksList = await this.aiTasksService.listTasksForOwner(instance.companyId);

          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, tasksList);

          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              response: tasksList,
              status: 'processed',
              processedAt: new Date(),
            },
          });

          return { status: 'processed_list_tasks', messageId: message.id };
        }

        // ========================================
        // COMANDOS DE GASTOS (Gastometria)
        // ========================================
        if (this.aiExpensesService.isExpenseCommand(processedContent)) {
          this.logger.log(`💰 Detected expense command from owner`);

          const expenseResult = await this.aiExpensesService.processExpenseCommand(
            processedContent,
            instance.companyId,
          );

          await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, expenseResult.response);

          await this.prisma.message.update({
            where: { id: message.id },
            data: {
              response: expenseResult.response,
              status: 'processed',
              processedAt: new Date(),
            },
          });

          return { status: 'processed_expense', messageId: message.id, success: expenseResult.success };
        }

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

          // Verificação de Recibo/Despesa (Imagem) - Usa novo fluxo com itens individuais
          const isExpenseReceipt = lowerContent.includes('nota') ||
            lowerContent.includes('recibo') ||
            lowerContent.includes('gasto') ||
            lowerContent.includes('compra') ||
            lowerContent.includes('pagamento') ||
            lowerContent.includes('carteira') ||
            lowerContent.includes('lance') ||
            lowerContent.includes('lança');

          if (isExpenseReceipt || !isInventoryRequest) {
            // Se não for inventário, tenta como despesa usando novo fluxo com confirmação
            this.logger.log(`📷 Starting expense flow with image from owner`);

            const expenseResult = await this.aiExpensesFlowService.startExpenseFlowFromImage(
              instance.companyId,
              remoteJid,
              instanceKey,
              mediaData,
              content || '',
            );

            await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, expenseResult.response);

            await this.prisma.message.update({
              where: { id: message.id },
              data: {
                response: expenseResult.response,
                status: 'processed',
                processedAt: new Date(),
              },
            });

            return { status: 'processed_expense_flow', messageId: message.id };
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
            // summary não é JSON, ignorar
          }
        }

        // ========================================
        // VERIFICAR SE É CONFIRMAÇÃO DE DESPESA PENDENTE (CARTEIRA)
        // ========================================
        if (conversation?.summary) {
          try {
            const pendingData = JSON.parse(conversation.summary);
            if (pendingData.type === 'pending_expense' && pendingData.data) {
              const resolveResult = await this.aiExpensesService.resolvePendingExpense(
                instance.companyId,
                processedContent, // O texto do usuário é a seleção da carteira
                pendingData.data
              );

              if (resolveResult.success) {
                // Limpar estado
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { summary: null },
                });
              }

              // Se falhar (ex: carteira n encontrada), mantemos o estado para ele tentar de novo?
              // Decisão: Manter, a menos que ele diga "cancelar". 
              if (processedContent.toLowerCase() === 'cancelar') {
                await this.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { summary: null },
                });
                resolveResult.response = '❌ Operação cancelada.';
              }

              await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, resolveResult.response);

              await this.prisma.message.update({
                where: { id: message.id },
                data: {
                  response: resolveResult.response,
                  status: 'processed',
                  processedAt: new Date(),
                },
              });

              return { status: 'processed_pending_expense', messageId: message.id };
            }
          } catch (e) {
            // erro ao parsear ou processar
          }
        }

        // Verificar se é um comando/instrução
        const commandResult = await this.aiService.parseOwnerCommand(processedContent, instance.companyId);

        if (commandResult.response) {
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

      // ========================================
      // VERIFICAR TAREFAS AUTOMATIZADAS
      // ========================================
      let finalResponse = secretaryResult.response;

      // Só executar tarefas para mensagens de contatos (não do dono)
      if (!isPersonalAssistantMode && secretaryResult.shouldRespond) {
        try {
          // Verificar se é primeira mensagem do contato
          const isFirstMessage = await this.prisma.message.count({
            where: {
              remoteJid,
              companyId: instance.companyId,
              direction: 'incoming',
            },
          }) <= 1;

          // Buscar tarefas que correspondem ao contexto atual
          const matchingTasks = await this.secretaryTasksService.getMatchingTasks(
            instance.companyId,
            {
              messageContent: processedContent,
              isFirstMessage,
              currentTime: new Date(),
            },
          );

          // Executar tarefas correspondentes
          for (const task of matchingTasks) {
            this.logger.log(`📋 Executing task: ${task.name}`);

            const taskResult = await this.secretaryTasksService.executeAction(task, {
              originalResponse: finalResponse,
              remoteJid,
            });

            // Modificar resposta se necessário
            if (taskResult.modifiedResponse) {
              finalResponse = taskResult.modifiedResponse;
            }

            // Enviar mensagem direta se configurado
            if (taskResult.directMessage) {
              await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, taskResult.directMessage);
            }

            // Adicionar tags ao contato se configurado
            if (taskResult.tagsToAdd && taskResult.tagsToAdd.length > 0) {
              await this.prisma.contact.updateMany({
                where: { remoteJid, companyId: instance.companyId },
                data: {
                  tags: {
                    push: taskResult.tagsToAdd,
                  },
                },
              });
            }
          }
        } catch (taskError) {
          this.logger.error(`Error executing tasks: ${taskError.message}`);
          // Continua com a resposta original em caso de erro
        }
      }

      // 7. Se deve responder, enviar resposta
      if (secretaryResult.shouldRespond && finalResponse) {
        await this.aiService.sendWhatsAppMessage(instanceKey, remoteJid, finalResponse);

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
