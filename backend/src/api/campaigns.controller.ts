import { Controller, Get, Post, Put, Delete, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) { }

  /**
   * Get all campaigns
   */
  @Get()
  async getCampaigns(@Request() req: any) {
    const companyId = req.user.companyId;

    const campaigns = await this.prisma.campaign.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    // Get stats for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await this.prisma.campaignRecipient.groupBy({
          by: ['status'],
          where: { campaignId: campaign.id },
          _count: { status: true },
        });

        const statusMap: Record<string, number> = {};
        stats.forEach((s) => {
          statusMap[s.status] = s._count.status;
        });

        return {
          ...campaign,
          totalRecipients: campaign._count.recipients,
          sentCount: statusMap['sent'] || 0,
          pendingCount: statusMap['pending'] || 0,
          failedCount: statusMap['failed'] || 0,
        };
      })
    );

    return campaignsWithStats;
  }

  /**
   * Get single campaign with recipients
   */
  @Get(':id')
  async getCampaign(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId },
      include: {
        recipients: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    return campaign;
  }

  /**
   * Create new campaign
   */
  @Post()
  async createCampaign(
    @Request() req: any,
    @Body() data: {
      name: string;
      message: string;
      mediaUrl?: string;
      mediaType?: string;
      targetAll?: boolean;
      targetTags?: string[];
      targetGenders?: string[];
      targetCities?: string[];
      targetStates?: string[];
      targetUniversities?: string[];
      targetCourses?: string[];
      targetMinAge?: number;
      targetMaxAge?: number;
      instanceId?: string;
      scheduledAt?: string;
    },
  ) {
    const companyId = req.user.companyId;

    const campaign = await this.prisma.campaign.create({
      data: {
        name: data.name,
        message: data.message,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        targetAll: data.targetAll || false,
        targetTags: data.targetTags || [],
        targetGenders: data.targetGenders || [],
        targetCities: data.targetCities || [],
        targetStates: data.targetStates || [],
        targetUniversities: data.targetUniversities || [],
        targetCourses: data.targetCourses || [],
        targetMinAge: data.targetMinAge,
        targetMaxAge: data.targetMaxAge,
        instanceId: data.instanceId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : 'draft',
        companyId,
      },
    });

    return campaign;
  }

  /**
   * Update campaign
   */
  @Put(':id')
  async updateCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const companyId = req.user.companyId;

    const campaign = await this.prisma.campaign.updateMany({
      where: { id, companyId },
      data: {
        name: data.name,
        message: data.message,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        targetAll: data.targetAll,
        targetTags: data.targetTags,
        targetGenders: data.targetGenders,
        targetCities: data.targetCities,
        targetStates: data.targetStates,
        targetUniversities: data.targetUniversities,
        targetCourses: data.targetCourses,
        targetMinAge: data.targetMinAge,
        targetMaxAge: data.targetMaxAge,
        instanceId: data.instanceId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return campaign;
  }

  /**
   * Delete campaign
   */
  @Delete(':id')
  async deleteCampaign(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    await this.prisma.campaign.deleteMany({
      where: { id, companyId },
    });

    return { success: true };
  }

  /**
   * Start/Execute campaign
   */
  @Post(':id/start')
  async startCampaign(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, companyId },
    });

    if (!campaign) {
      return { error: 'Campaign not found' };
    }

    if (campaign.status === 'running') {
      return { error: 'Campaign is already running' };
    }

    // Build target contacts query with all segmentation filters
    const whereClause: any = { companyId };

    if (!campaign.targetAll) {
      const conditions: any[] = [];

      // Tags filter
      if (campaign.targetTags.length > 0) {
        conditions.push({ tags: { hasSome: campaign.targetTags } });
      }

      // Gender filter
      if (campaign.targetGenders.length > 0) {
        conditions.push({ gender: { in: campaign.targetGenders } });
      }

      // City filter
      if (campaign.targetCities.length > 0) {
        conditions.push({ city: { in: campaign.targetCities } });
      }

      // State filter
      if (campaign.targetStates.length > 0) {
        conditions.push({ state: { in: campaign.targetStates } });
      }

      // University filter
      if (campaign.targetUniversities.length > 0) {
        conditions.push({ university: { in: campaign.targetUniversities } });
      }

      // Course filter
      if (campaign.targetCourses.length > 0) {
        conditions.push({ course: { in: campaign.targetCourses } });
      }

      // Age filter based on birthDate
      if (campaign.targetMinAge || campaign.targetMaxAge) {
        const today = new Date();
        const birthDateCondition: any = {};

        if (campaign.targetMaxAge) {
          const minBirthDate = new Date(today.getFullYear() - campaign.targetMaxAge - 1, today.getMonth(), today.getDate());
          birthDateCondition.gte = minBirthDate;
        }
        if (campaign.targetMinAge) {
          const maxBirthDate = new Date(today.getFullYear() - campaign.targetMinAge, today.getMonth(), today.getDate());
          birthDateCondition.lte = maxBirthDate;
        }
        conditions.push({ birthDate: birthDateCondition });
      }

      // Apply conditions with AND logic
      if (conditions.length > 0) {
        whereClause.AND = conditions;
      }
    }

    const contacts = await this.prisma.contact.findMany({
      where: whereClause,
      select: { remoteJid: true },
    });

    if (contacts.length === 0) {
      return { error: 'No contacts match the target criteria' };
    }

    // Create recipients
    await this.prisma.campaignRecipient.createMany({
      data: contacts.map((c) => ({
        campaignId: campaign.id,
        remoteJid: c.remoteJid,
        status: 'pending',
      })),
      skipDuplicates: true,
    });

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    // Get instance for sending
    const instance = campaign.instanceId
      ? await this.prisma.instance.findUnique({ where: { id: campaign.instanceId } })
      : await this.prisma.instance.findFirst({
        where: { companyId, status: 'connected' },
      });

    if (!instance) {
      return { error: 'No connected instance available' };
    }

    // Process recipients in background (simplified - should use queue in production)
    this.processCampaignRecipients(campaign.id, instance.instanceKey, campaign.message);

    return {
      success: true,
      message: `Campaign started with ${contacts.length} recipients`,
      recipientCount: contacts.length,
    };
  }

  /**
   * Cancel campaign
   */
  @Post(':id/cancel')
  async cancelCampaign(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    await this.prisma.campaign.updateMany({
      where: { id, companyId },
      data: {
        status: 'cancelled',
      },
    });

    return { success: true };
  }

  /**
   * Get campaign stats
   */
  @Get('meta/stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;

    const [total, running, completed, scheduled] = await Promise.all([
      this.prisma.campaign.count({ where: { companyId } }),
      this.prisma.campaign.count({ where: { companyId, status: 'running' } }),
      this.prisma.campaign.count({ where: { companyId, status: 'completed' } }),
      this.prisma.campaign.count({ where: { companyId, status: 'scheduled' } }),
    ]);

    // Get total messages sent via campaigns
    const messagesSent = await this.prisma.campaignRecipient.count({
      where: {
        status: 'sent',
        campaign: { companyId },
      },
    });

    return {
      totalCampaigns: total,
      runningCampaigns: running,
      completedCampaigns: completed,
      scheduledCampaigns: scheduled,
      totalMessagesSent: messagesSent,
    };
  }

  /**
   * Process campaign recipients (background task)
   */
  private async processCampaignRecipients(campaignId: string, instanceKey: string, message: string) {
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'pending' },
    });

    this.logger.log(`Processing ${recipients.length} recipients for campaign ${campaignId}`);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        await this.aiService.sendWhatsAppMessage(instanceKey, recipient.remoteJid, message);

        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'sent', sentAt: new Date() },
        });

        sentCount++;

        // Delay between messages to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
      } catch (error) {
        this.logger.error(`Failed to send to ${recipient.remoteJid}: ${error.message}`);

        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'failed', error: error.message },
        });

        failedCount++;
      }

      // Check if campaign was cancelled
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (campaign?.status === 'cancelled') {
        this.logger.log(`Campaign ${campaignId} was cancelled`);
        break;
      }
    }

    // Mark campaign as completed
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
  }
}
