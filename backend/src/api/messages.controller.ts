import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpException, HttpStatus, UseInterceptors, UploadedFile, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import axios from 'axios';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AITranscriptionService } from '../ai/ai-transcription.service';
import * as FormData from 'form-data';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTranscriptionService: AITranscriptionService,
  ) { }

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

  /**
   * Transcreve manualmente uma mensagem de áudio
   */
  @Post(':id/transcribe')
  async transcribeAudio(@Request() req: any, @Param('id') messageId: string) {
    const companyId = req.user.companyId;

    // Buscar mensagem
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, companyId },
      include: { instance: true },
    });

    if (!message) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }

    if (message.mediaType !== 'audio') {
      throw new HttpException('Message is not an audio', HttpStatus.BAD_REQUEST);
    }

    if (!message.mediaData) {
      throw new HttpException('No media data available for transcription', HttpStatus.BAD_REQUEST);
    }

    try {
      // Transcrever usando AIService
      const transcription = await this.aiTranscriptionService.processAudioMessage(
        message.instance.instanceKey,
        message.mediaData,
      );

      // Verificar se a transcrição retornou erro
      if (transcription.includes('[Erro na transcrição do áudio]')) {
        throw new HttpException(transcription, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Atualizar mensagem com a transcrição
      const newContent = `[Áudio transcrito]: ${transcription}`;
      await this.prisma.message.update({
        where: { id: messageId },
        data: { content: newContent },
      });

      return {
        success: true,
        transcription,
        content: newContent,
      };
    } catch (error) {
      console.error('Error transcribing audio:', error.message);
      throw new HttpException(error.message || 'Failed to transcribe audio', HttpStatus.INTERNAL_SERVER_ERROR);
    }
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

      const messageId = response.data?.key?.id;

      // Save message immediately to DB so it persists when switching chats
      // The webhook may update it later with more info, but it will already exist
      if (messageId) {
        try {
          await this.prisma.message.upsert({
            where: { messageId },
            create: {
              messageId,
              remoteJid,
              content,
              direction: 'outgoing',
              status: 'sent',
              companyId: instance.companyId,
              instanceId: instance.id,
            },
            update: {
              // If webhook already created it, just update status
              status: 'sent',
            },
          });
        } catch (dbError) {
          // Log but don't fail - the webhook will handle it
          console.warn('Could not save message to DB:', dbError.message);
        }
      }

      return { success: true, messageId };
    } catch (error) {
      console.error('Error sending message:', error.message);
      throw new HttpException('Failed to send message', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('send-media')
  @UseInterceptors(FileInterceptor('file'))
  async sendMedia(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { instanceKey: string; remoteJid: string; caption?: string }
  ) {
    const companyId = req.user.companyId;
    const { instanceKey, remoteJid, caption } = body;

    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const instance = await this.prisma.instance.findFirst({
      where: { instanceKey, companyId },
    });

    if (!instance) {
      throw new HttpException('Instance not found', HttpStatus.NOT_FOUND);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    // Convert file to base64
    const base64 = file.buffer.toString('base64');
    const mimeType = file.mimetype;
    const fileName = file.originalname;

    // Determine media type
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');

    // Log para debug
    console.log('Sending media to:', remoteJid, 'type:', isImage ? 'image' : isVideo ? 'video' : 'document');

    try {
      const response = await axios.post(
        `${evolutionUrl}/message/sendMedia/${instanceKey}`,
        {
          number: remoteJid, // Usar remoteJid completo (funciona com @lid e @s.whatsapp.net)
          mediatype: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document',
          mimetype: mimeType,
          caption: caption || '',
          media: base64, // Base64 puro, sem data URI prefix
          fileName: fileName,
        },
        { headers: { 'apikey': evolutionApiKey } }
      );

      return { success: true, messageId: response.data?.key?.id };
    } catch (error) {
      console.error('Error sending media:', error.message);
      throw new HttpException('Failed to send media', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('recent')
  async getRecentConversations(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '30',
  ) {
    const companyId = req.user.companyId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count of unique remoteJids
    const totalResult = await this.prisma.message.groupBy({
      by: ['remoteJid'],
      where: { companyId },
    });
    const total = totalResult.length;

    // Get unique contacts with their last message
    const conversations = await this.prisma.message.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      distinct: ['remoteJid'],
      skip,
      take: limitNum,
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

    return {
      data: conversations.map((msg) => {
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
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('media/:messageId')
  async getMedia(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Res() res: Response
  ) {
    const companyId = req.user.companyId;

    // Find message
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, companyId },
      include: { instance: true }
    });

    if (!message) {
      throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
    }

    if (!message.mediaData && !message.mediaUrl) {
      throw new HttpException('No media data available', HttpStatus.BAD_REQUEST);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    try {
      // If we have mediaData, use Evolution API to download
      if (message.mediaData) {
        const response = await axios.post(
          `${evolutionUrl}/chat/getBase64FromMediaMessage/${message.instance.instanceKey}`,
          { message: message.mediaData },
          { headers: { 'apikey': evolutionApiKey } }
        );

        if (response.data?.base64) {
          const base64 = response.data.base64;
          const mimetype = response.data.mimetype || 'application/octet-stream';
          const buffer = Buffer.from(base64, 'base64');

          res.set({
            'Content-Type': mimetype,
            'Content-Length': buffer.length,
            'Cache-Control': 'public, max-age=31536000',
          });

          return res.send(buffer);
        }
      }

      // Fallback: try to proxy the mediaUrl directly
      if (message.mediaUrl) {
        const mediaResponse = await axios.get(message.mediaUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const contentType = mediaResponse.headers['content-type'] || 'application/octet-stream';

        res.set({
          'Content-Type': contentType,
          'Content-Length': mediaResponse.data.length,
          'Cache-Control': 'public, max-age=31536000',
        });

        return res.send(Buffer.from(mediaResponse.data));
      }

      throw new HttpException('Unable to fetch media', HttpStatus.INTERNAL_SERVER_ERROR);
    } catch (error) {
      console.error('Error fetching media:', error.message);
      throw new HttpException('Failed to fetch media', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  async searchConversations(
    @Request() req: any,
    @Query('q') query: string,
    @Query('limit') limit: string = '20',
  ) {
    if (!query || query.length < 2) {
      return { data: [] };
    }

    const companyId = req.user.companyId;
    const limitNum = parseInt(limit, 10);

    // Search in messages and contacts
    const [messageResults, contactResults] = await Promise.all([
      // Search in messages
      this.prisma.message.findMany({
        where: {
          companyId,
          OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { pushName: { contains: query, mode: 'insensitive' } },
            { remoteJid: { contains: query } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['remoteJid'],
        take: limitNum,
        include: {
          instance: {
            select: { name: true, instanceKey: true },
          },
        },
      }),
      // Search in contacts
      this.prisma.contact.findMany({
        where: {
          companyId,
          OR: [
            { pushName: { contains: query, mode: 'insensitive' } },
            { remoteJid: { contains: query } },
          ],
        },
        take: limitNum,
      }),
    ]);

    // Combine and dedupe results
    const resultMap = new Map();

    for (const msg of messageResults) {
      if (!resultMap.has(msg.remoteJid)) {
        resultMap.set(msg.remoteJid, {
          id: msg.id,
          contact: msg.pushName || this.formatPhoneNumber(msg.remoteJid),
          remoteJid: msg.remoteJid,
          lastMessage: msg.content.substring(0, 100),
          instanceName: msg.instance.name,
          instanceKey: msg.instance.instanceKey,
          timestamp: msg.createdAt,
          profilePicUrl: null,
        });
      }
    }

    for (const contact of contactResults) {
      if (!resultMap.has(contact.remoteJid)) {
        resultMap.set(contact.remoteJid, {
          id: contact.id,
          contact: contact.pushName || this.formatPhoneNumber(contact.remoteJid),
          remoteJid: contact.remoteJid,
          lastMessage: null,
          instanceName: null,
          instanceKey: contact.instanceId,
          timestamp: contact.createdAt,
          profilePicUrl: contact.profilePicUrl,
        });
      } else {
        // Update with contact info
        const existing = resultMap.get(contact.remoteJid);
        existing.contact = contact.pushName || existing.contact;
        existing.profilePicUrl = contact.profilePicUrl;
      }
    }

    return {
      data: Array.from(resultMap.values()).slice(0, limitNum),
    };
  }

  @Get('contacts')
  async getContacts(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('q') query?: string,
  ) {
    const companyId = req.user.companyId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { companyId };

    if (query && query.length >= 2) {
      where.OR = [
        { pushName: { contains: query, mode: 'insensitive' } },
        { remoteJid: { contains: query } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { pushName: 'asc' },
        skip,
        take: limitNum,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data: contacts.map((contact) => ({
        id: contact.id,
        remoteJid: contact.remoteJid,
        pushName: contact.pushName,
        displayName: contact.pushName || this.formatPhoneNumber(contact.remoteJid),
        profilePicUrl: contact.profilePicUrl,
        instanceId: contact.instanceId,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
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

  /**
   * Retorna conversas ativas com últimas mensagens para monitoramento
   */
  @Get('conversations')
  async getConversations(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit: string = '20',
  ) {
    const companyId = req.user.companyId;
    const limitNum = parseInt(limit, 10);

    const where: any = { companyId };
    if (status) {
      where.status = status;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: limitNum,
      include: {
        instance: { select: { name: true, instanceKey: true } },
      },
    });

    // Buscar contato e últimas mensagens para cada conversa
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const [contact, messages] = await Promise.all([
          this.prisma.contact.findFirst({
            where: { companyId, remoteJid: conv.remoteJid },
            select: { id: true, pushName: true, profilePicUrl: true },
          }),
          this.prisma.message.findMany({
            where: { companyId, remoteJid: conv.remoteJid },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              content: true,
              direction: true,
              createdAt: true,
              response: true,
            },
          }),
        ]);

        return {
          id: conv.id,
          remoteJid: conv.remoteJid,
          status: conv.status,
          priority: conv.priority,
          assignedTo: conv.assignedTo,
          aiEnabled: conv.aiEnabled,
          lastMessageAt: conv.lastMessageAt,
          summary: conv.summary,
          instanceName: conv.instance.name,
          instanceKey: conv.instance.instanceKey,
          contact: contact
            ? {
              id: contact.id,
              name: contact.pushName || this.formatPhoneNumber(conv.remoteJid),
              profilePicUrl: contact.profilePicUrl,
            }
            : {
              name: this.formatPhoneNumber(conv.remoteJid),
              profilePicUrl: null,
            },
          recentMessages: messages.reverse(),
        };
      }),
    );

    return { data: enrichedConversations };
  }

  /**
   * Alterna o status de aiEnabled para uma conversa
   */
  @Post('conversations/:id/toggle-ai')
  async toggleConversationAI(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() body: { aiEnabled?: boolean },
  ) {
    const companyId = req.user.companyId;

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, companyId },
    });

    if (!conversation) {
      throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);
    }

    // Se aiEnabled foi passado, usa o valor; senão, inverte o atual
    const newAiEnabled = body.aiEnabled !== undefined ? body.aiEnabled : !conversation.aiEnabled;

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        aiEnabled: newAiEnabled,
        // Se desabilitando IA, marca como atendimento humano
        assignedTo: newAiEnabled ? 'ai' : 'human',
      },
    });

    return {
      success: true,
      aiEnabled: updated.aiEnabled,
      assignedTo: updated.assignedTo,
    };
  }

  /**
   * Busca conversa por remoteJid (para uso no chat ao vivo)
   */
  @Get('conversations/by-jid/:remoteJid')
  async getConversationByJid(
    @Request() req: any,
    @Param('remoteJid') remoteJid: string,
  ) {
    const companyId = req.user.companyId;

    const conversation = await this.prisma.conversation.findFirst({
      where: { companyId, remoteJid },
    });

    if (!conversation) {
      // Retorna valores padrão se conversa ainda não existe
      return {
        exists: false,
        aiEnabled: true,
        assignedTo: null,
      };
    }

    return {
      exists: true,
      id: conversation.id,
      aiEnabled: conversation.aiEnabled,
      assignedTo: conversation.assignedTo,
      status: conversation.status,
      priority: conversation.priority,
    };
  }
}
