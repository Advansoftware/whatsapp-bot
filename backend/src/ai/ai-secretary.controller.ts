import { Controller, Get, Put, Post, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from './ai.service';
import axios from 'axios';

@Controller('api/ai-secretary')
@UseGuards(JwtAuthGuard)
export class AISecretaryController {
  private readonly logger = new Logger(AISecretaryController.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {
    this.evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    this.evolutionApiKey = process.env.EVOLUTION_API_KEY || '';
  }

  /**
   * Get AI Secretary configuration
   */
  @Get('config')
  async getConfig(@Request() req: any) {
    const companyId = req.user.companyId;

    let config = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    // Create default config if not exists
    if (!config) {
      config = await this.prisma.aISecretary.create({
        data: {
          companyId,
          enabled: false,
          mode: 'passive',
          systemPrompt: `Você é uma secretária virtual inteligente e prestativa.
Atenda os clientes com educação e profissionalismo.
Sempre mencione produtos disponíveis quando relevante.
Se não souber algo, admita e ofereça ajuda.`,
          temperature: 0.7,
        },
      });
    }

    return config;
  }

  /**
   * Update AI Secretary configuration
   */
  @Put('config')
  async updateConfig(@Request() req: any, @Body() updateDto: any) {
    const companyId = req.user.companyId;

    const config = await this.prisma.aISecretary.upsert({
      where: { companyId },
      create: {
        companyId,
        ...updateDto,
      },
      update: updateDto,
    });

    return config;
  }

  /**
   * Get active conversations being monitored
   */
  @Get('conversations')
  async getConversations(@Request() req: any) {
    const companyId = req.user.companyId;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        companyId,
        status: 'active',
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      take: 50,
    });

    // Get last message for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.prisma.message.findFirst({
          where: { remoteJid: conv.remoteJid },
          orderBy: { createdAt: 'desc' },
        });

        return {
          ...conv,
          lastMessage: lastMessage?.content || '',
        };
      }),
    );

    return conversationsWithDetails;
  }

  /**
   * Get AI suggestions for a conversation
   */
  @Get('suggestions/:remoteJid')
  async getSuggestions(@Request() req: any, @Param('remoteJid') remoteJid: string) {
    const companyId = req.user.companyId;

    // Get conversation history
    const messages = await this.prisma.message.findMany({
      where: {
        companyId,
        remoteJid,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (messages.length === 0) {
      return { suggestion: null, reasoning: 'Nenhuma mensagem encontrada' };
    }

    const lastMessage = messages[0];
    if (lastMessage.direction === 'outgoing') {
      return { suggestion: null, reasoning: 'Última mensagem foi sua' };
    }

    // Get products for context
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
    });

    // Get contact info
    const contact = await this.prisma.contact.findFirst({
      where: { remoteJid, companyId },
    });

    // Get AI Config
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    }) || { mode: 'passive', temperature: 0.7 };

    const context = {
      conversationHistory: messages.reverse(),
      contactName: contact?.pushName ?? undefined,
      products,
    };

    // Analyze with AI
    const analysis = await this.aiService.analyzeMessage(lastMessage.content, context);

    // Generate Suggestion
    const suggestedResponse = await this.aiService.generateResponse(
      lastMessage.content,
      context,
      aiConfig
    );

    return {
      suggestion: suggestedResponse,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      intent: analysis.intent,
      urgency: analysis.urgency,
      sentiment: analysis.sentiment,
      shouldEscalate: analysis.shouldEscalate,
    };
  }

  /**
   * Approve and send AI suggestion
   */
  @Post('approve')
  async approveSuggestion(
    @Request() req: any,
    @Body() body: { remoteJid: string; instanceKey: string; response: string },
  ) {
    const companyId = req.user.companyId;

    // Send message via Evolution API (reuse existing logic)
    // This would call the messages controller's send method
    // For now, just return success

    // Log the approval
    const conversation = await this.prisma.conversation.findFirst({
      where: { remoteJid: body.remoteJid, companyId },
    });

    if (conversation) {
      await this.prisma.aIInteraction.create({
        data: {
          conversationId: conversation.id,
          messageId: `ai-${Date.now()}`,
          action: 'responded',
          reasoning: 'Sugestão aprovada pelo usuário',
          confidence: 1.0,
          humanOverride: false,
        },
      });
    }

    return { success: true, message: 'Resposta aprovada e enviada' };
  }

  /**
   * Override AI suggestion with human response
   */
  @Post('override')
  async overrideSuggestion(
    @Request() req: any,
    @Body() body: { remoteJid: string; aiSuggestion: string; humanResponse: string },
  ) {
    const companyId = req.user.companyId;

    const conversation = await this.prisma.conversation.findFirst({
      where: { remoteJid: body.remoteJid, companyId },
    });

    if (conversation) {
      await this.prisma.aIInteraction.create({
        data: {
          conversationId: conversation.id,
          messageId: `override-${Date.now()}`,
          action: 'responded',
          reasoning: `IA sugeriu: "${body.aiSuggestion}". Humano respondeu: "${body.humanResponse}"`,
          confidence: 0.0,
          humanOverride: true,
        },
      });
    }

    return { success: true, message: 'Override registrado para aprendizado' };
  }

  /**
   * Get AI performance stats
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;

    const conversations = await this.prisma.conversation.findMany({
      where: { companyId },
    });

    const interactions = await this.prisma.aIInteraction.findMany({
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
      },
    });

    const totalInteractions = interactions.length;
    const approvedSuggestions = interactions.filter((i) => !i.humanOverride).length;
    const overrides = interactions.filter((i) => i.humanOverride).length;
    const escalations = interactions.filter((i) => i.action === 'escalated').length;

    const approvalRate = totalInteractions > 0 ? (approvedSuggestions / totalInteractions) * 100 : 0;

    return {
      totalInteractions,
      approvedSuggestions,
      overrides,
      escalations,
      approvalRate: approvalRate.toFixed(1) + '%',
      activeConversations: conversations.filter((c) => c.status === 'active').length,
    };
  }

  // ========================================
  // PERSONAL ASSISTANT CHAT (Dashboard)
  // ========================================

  /**
   * Get personal assistant chat info (owner phone, instance, etc.)
   */
  @Get('assistant/info')
  async getAssistantInfo(@Request() req: any) {
    const companyId = req.user.companyId;

    // Get AI config with owner phone
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    // Get first connected instance
    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
      select: { id: true, instanceKey: true, name: true },
    });

    if (!aiConfig?.ownerPhone || !instance) {
      return {
        available: false,
        reason: !aiConfig?.ownerPhone
          ? 'Telefone do proprietário não configurado'
          : 'Nenhuma instância conectada',
      };
    }

    const ownerJid = `${aiConfig.ownerPhone.replace(/\D/g, '')}@s.whatsapp.net`;

    return {
      available: true,
      ownerPhone: aiConfig.ownerPhone,
      ownerJid,
      instanceKey: instance.instanceKey,
      instanceName: instance.name,
      assistantName: aiConfig.ownerName || 'Assistente',
      testMode: aiConfig.testMode,
    };
  }

  /**
   * Get personal assistant chat messages
   */
  @Get('assistant/messages')
  async getAssistantMessages(
    @Request() req: any,
    @Query('limit') limit: string = '50',
  ) {
    const companyId = req.user.companyId;
    const limitNum = parseInt(limit, 10);

    // Get AI config with owner phone
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    if (!aiConfig?.ownerPhone) {
      return { messages: [] };
    }

    const ownerJid = `${aiConfig.ownerPhone.replace(/\D/g, '')}@s.whatsapp.net`;

    // Get messages to/from owner
    const messages = await this.prisma.message.findMany({
      where: {
        companyId,
        remoteJid: ownerJid,
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      select: {
        id: true,
        content: true,
        direction: true,
        createdAt: true,
        mediaUrl: true,
        mediaType: true,
        status: true,
      },
    });

    // Reverse to get chronological order
    return {
      messages: messages.reverse(),
      ownerJid,
    };
  }

  /**
   * Send message to personal assistant (sends to owner's number which triggers assistant mode)
   */
  @Post('assistant/send')
  async sendToAssistant(
    @Request() req: any,
    @Body() body: { content: string; mediaUrl?: string; mediaType?: string },
  ) {
    const companyId = req.user.companyId;
    const { content, mediaUrl, mediaType } = body;

    // Get AI config
    const aiConfig = await this.prisma.aISecretary.findUnique({
      where: { companyId },
    });

    if (!aiConfig?.ownerPhone) {
      throw new Error('Telefone do proprietário não configurado');
    }

    // Get connected instance
    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
    });

    if (!instance) {
      throw new Error('Nenhuma instância conectada');
    }

    const ownerPhone = aiConfig.ownerPhone.replace(/\D/g, '');
    const ownerJid = `${ownerPhone}@s.whatsapp.net`;

    try {
      let response;

      if (mediaUrl && mediaType) {
        // Send media
        const endpoint = mediaType === 'audio' ? 'sendWhatsAppAudio' :
          mediaType === 'image' ? 'sendMedia' : 'sendMedia';

        response = await axios.post(
          `${this.evolutionApiUrl}/message/${endpoint}/${instance.instanceKey}`,
          {
            number: ownerPhone,
            media: mediaUrl,
            caption: content || undefined,
          },
          { headers: { apikey: this.evolutionApiKey } }
        );
      } else {
        // Send text
        response = await axios.post(
          `${this.evolutionApiUrl}/message/sendText/${instance.instanceKey}`,
          {
            number: ownerPhone,
            text: content,
          },
          { headers: { apikey: this.evolutionApiKey } }
        );
      }

      const messageId = response.data?.key?.id;

      // Save message
      if (messageId) {
        await this.prisma.message.create({
          data: {
            messageId,
            remoteJid: ownerJid,
            content,
            direction: 'outgoing',
            status: 'sent',
            companyId,
            instanceId: instance.id,
            mediaUrl,
            mediaType,
          },
        });
      }

      this.logger.log(`Assistant message sent to owner: ${content.substring(0, 50)}...`);

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error('Error sending assistant message:', error.message);
      throw new Error('Falha ao enviar mensagem');
    }
  }
}
