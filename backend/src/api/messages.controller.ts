import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly prisma: PrismaService) { }

  @Get()
  async getMessages(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('instanceId') instanceId?: string,
  ) {
    const companyId = req.user.companyId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { companyId };
    if (instanceId) {
      where.instanceId = instanceId;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          instance: {
            select: { name: true },
          },
        },
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        remoteJid: msg.remoteJid,
        contact: this.formatPhoneNumber(msg.remoteJid),
        content: msg.content,
        response: msg.response,
        direction: msg.direction,
        status: msg.status,
        instanceName: msg.instance.name,
        createdAt: msg.createdAt,
        processedAt: msg.processedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('recent')
  async getRecentConversations(@Request() req: any) {
    const companyId = req.user.companyId;

    // Get unique contacts with their last message
    const conversations = await this.prisma.message.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      distinct: ['remoteJid'],
      take: 10,
      include: {
        instance: {
          select: { name: true },
        },
      },
    });

    return conversations.map((msg) => ({
      id: msg.id,
      contact: this.formatPhoneNumber(msg.remoteJid),
      remoteJid: msg.remoteJid,
      lastMessage: msg.content.substring(0, 100),
      status: msg.status,
      instanceName: msg.instance.name,
      timestamp: msg.createdAt,
    }));
  }

  private formatPhoneNumber(jid: string): string {
    // Remove @s.whatsapp.net or @g.us
    const number = jid.replace(/@.*/, '');

    // Format as phone number if valid
    if (number.length >= 10) {
      const countryCode = number.slice(0, 2);
      const areaCode = number.slice(2, 4);
      const firstPart = number.slice(4, 9);
      const secondPart = number.slice(9);
      return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
    }

    return number;
  }
}
