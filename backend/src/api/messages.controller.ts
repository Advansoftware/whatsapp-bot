import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
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
    @Query('remoteJid') remoteJid?: string,
  ) {
    const companyId = req.user.companyId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { companyId };
    if (instanceId) {
      where.instanceId = instanceId;
    }
    if (remoteJid) {
      where.remoteJid = remoteJid;
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' }, // Latest first
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

    // Reverse for chat window if filtering by remoteJid (oldest first usually better for chat history, but UI might handle reverse)
    // Keeping desc for now as general list API

    return {
      data: messages.map((msg) => ({
        id: msg.id,
        remoteJid: msg.remoteJid,
        contact: msg.pushName || this.formatPhoneNumber(msg.remoteJid),
        content: msg.content,
        response: msg.response,
        direction: msg.direction,
        status: msg.status,
        instanceName: msg.instance.name,
        createdAt: msg.createdAt,
        processedAt: msg.processedAt,
        pushName: msg.pushName,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Post('send')
  async sendMessage(@Request() req: any, @Body() body: { instanceKey: string, remoteJid: string, content: string }) {
    const companyId = req.user.companyId;
    const { instanceKey, remoteJid, content } = body;

    const instance = await this.prisma.instance.findFirst({
      where: { instanceKey, companyId },
    });

    if (!instance) {
      throw new HttpException('Instance not found', HttpStatus.NOT_FOUND);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    try {
      const response = await axios.post(
        `${evolutionUrl}/message/sendText/${instanceKey}`,
        {
          number: remoteJid.replace(/\D/g, ''), // Evolution usually expects number or jid. If number, it formats.
          text: content,
          delay: 1200,
          linkPreview: true
        },
        { headers: { 'apikey': evolutionApiKey } }
      );

      // We don't save to DB here; we let the "messages.upsert" webhook handle the saving for consistency 
      // and to avoid duplication logic. Evolution sends a webhook for the message sent by the bot too.

      return { success: true, messageId: response.data?.key?.id };
    } catch (error) {
      console.error('Error sending message:', error.message);
      throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('recent')
  async getRecentConversations(@Request() req: any) {
    const companyId = req.user.companyId;

    // Get unique contacts with their last message
    const conversations = await this.prisma.message.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      distinct: ['remoteJid'],
      take: 50,
      include: {
        instance: {
          select: { name: true, instanceKey: true },
        },
      },
    });

    // Fetch all contacts for this company to join with messages
    const remoteJids = conversations.map(c => c.remoteJid);
    const contacts = await this.prisma.contact.findMany({
      where: {
        companyId,
        remoteJid: { in: remoteJids }
      }
    });

    const contactMap = new Map(contacts.map(c => [c.remoteJid, c]));

    return conversations.map((msg) => {
      const contact = contactMap.get(msg.remoteJid);
      return {
        id: msg.id,
        contact: contact?.pushName || msg.pushName || this.formatPhoneNumber(msg.remoteJid),
        remoteJid: msg.remoteJid,
        lastMessage: msg.content.substring(0, 100),
        status: msg.status,
        instanceName: msg.instance.name,
        instanceKey: msg.instance.instanceKey,
        timestamp: msg.createdAt,
        pushName: contact?.pushName || msg.pushName,
        profilePicUrl: contact?.profilePicUrl || null,
      };
    });
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
