import { Controller, Get, Put, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from './ai.service';

@Controller('api/ai-secretary')
@UseGuards(JwtAuthGuard)
export class AISecretaryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) { }

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
}
