import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpException, HttpStatus, UseInterceptors, UploadedFile, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import axios from 'axios';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AITranscriptionService } from '../ai/ai-transcription.service';
import { ChatGateway } from '../chat/chat.gateway';
import * as FormData from 'form-data';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiTranscriptionService: AITranscriptionService,
    private readonly chatGateway: ChatGateway,
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
          quotedMessage: {
            select: {
              id: true,
              content: true,
              pushName: true,
              direction: true,
            }
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
        senderType: msg.senderType || 'manual',
        instanceName: msg.instance.name,
        createdAt: msg.createdAt,
        processedAt: msg.processedAt,
        pushName: msg.pushName,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        // Campos de grupo
        isGroup: msg.isGroup || false,
        participant: msg.participant || null,
        participantName: msg.participantName || null,
        // Mensagem respondida
        quotedMessage: msg.quotedMessage ? {
          id: msg.quotedMessage.id,
          content: msg.quotedMessage.content,
          senderName: msg.quotedMessage.pushName || (msg.quotedMessage.direction === 'outgoing' ? 'Você' : null),
        } : null,
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
  async sendMessage(
    @Body() body: { instanceKey: string; remoteJid: string; content: string; options?: { quotedMessageId?: string; mediaUrl?: string; mediaType?: string; senderType?: string } }
  ) {
    const { instanceKey, remoteJid, content, options } = body;

    const instance = await this.prisma.instance.findFirst({
      where: { instanceKey },
    });

    if (!instance) {
      throw new HttpException('Instance not found', HttpStatus.NOT_FOUND);
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    try {
      let response;

      // Determine if sending media (sticker) or text
      if (options?.mediaUrl && options?.mediaType === 'sticker') {
        response = await axios.post(
          `${evolutionUrl}/message/sendSticker/${instanceKey}`,
          {
            number: remoteJid.replace(/\D/g, ''),
            sticker: options.mediaUrl,
          },
          { headers: { 'apikey': evolutionApiKey } }
        );
      } else {
        // Prepare text payload
        const payload: any = {
          number: remoteJid.replace(/\D/g, ''),
          text: content,
          delay: 1200,
          linkPreview: true
        };

        // Add quote if replying
        if (options?.quotedMessageId) {
          // Fetch the original message to get its WhatsApp ID
          const quotedMsg = await this.prisma.message.findUnique({
            where: { id: options.quotedMessageId },
            select: { messageId: true }
          });

          if (quotedMsg?.messageId) {
            payload.quoted = {
              key: {
                id: quotedMsg.messageId,
              }
            };
          }
        }

        try {
          response = await axios.post(
            `${evolutionUrl}/message/sendText/${instanceKey}`,
            payload,
            { headers: { 'apikey': evolutionApiKey } }
          );
        } catch (axiosError) {
          console.error('Error sending text to Evolution API:', axiosError.response?.data || axiosError.message);
          throw new HttpException(
            `Failed to send message via Evolution API: ${JSON.stringify(axiosError.response?.data || axiosError.message)}`,
            HttpStatus.BAD_GATEWAY
          );
        }
      }

      const messageId = response.data?.key?.id;

      let savedId = null;

      // Save message immediately
      if (messageId) {
        try {
          const savedMsg = await this.prisma.message.upsert({
            where: { messageId },
            create: {
              messageId,
              remoteJid,
              content,
              direction: 'outgoing',
              status: 'sent',
              senderType: options?.senderType || 'manual',
              companyId: instance.companyId,
              instanceId: instance.id,
              mediaUrl: options?.mediaUrl,
              mediaType: options?.mediaType,
              quotedMessageId: options?.quotedMessageId,
            },
            update: {
              status: 'sent',
              mediaUrl: options?.mediaUrl,
              mediaType: options?.mediaType,
              senderType: options?.senderType || 'manual',
            },
          });

          savedId = savedMsg.id;

          // Fetch quoted message details for broadcast if needed
          let quotedMessageData = null;
          if (options?.quotedMessageId) {
            const qm = await this.prisma.message.findUnique({
              where: { id: options.quotedMessageId }
            });
            if (qm) {
              quotedMessageData = {
                id: qm.id,
                content: qm.content,
                senderName: qm.pushName || (qm.direction === 'outgoing' ? 'Você' : null)
              };
            }
          }

          // Emit WebSocket event
          this.chatGateway.broadcastMessage({
            id: savedMsg.id,
            remoteJid,
            content,
            direction: 'outgoing',
            status: 'sent',
            senderType: options?.senderType || 'manual',
            mediaUrl: options?.mediaUrl,
            mediaType: options?.mediaType,
            quotedMessageId: options?.quotedMessageId,
            quotedMessage: quotedMessageData,
            createdAt: savedMsg.createdAt,
          });
        } catch (dbError) {
          console.error('Error saving sent message to DB:', dbError);
        }
      }

      return { success: true, messageId: savedId || messageId };
    } catch (error: any) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data || 'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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

    // Get total count of unique remoteJids usando query raw otimizada
    const totalResult = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT remote_jid) as count
      FROM messages
      WHERE company_id = ${companyId}
    `;
    const total = Number(totalResult[0].count);

    // Get unique contacts with their last message usando subquery otimizada
    // Usando subquery para ordenar por createdAt DESC após o DISTINCT ON
    const conversations = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM (
        SELECT DISTINCT ON (m.remote_jid) 
          m.id, m.remote_jid as "remoteJid", m.content, m.direction, 
          m.push_name as "pushName", m.created_at as "createdAt",
          m.instance_id as "instanceId", m.is_group as "isGroup",
          m.status as "status",
          i.name as "instanceName", i.instance_key as "instanceKey"
        FROM messages m
        LEFT JOIN instances i ON m.instance_id = i.id
        WHERE m.company_id = ${companyId}
        ORDER BY m.remote_jid, m.created_at DESC
      ) sub
      ORDER BY sub."createdAt" DESC
      LIMIT ${limitNum} OFFSET ${skip}
    `;

    // Converter createdAt para Date objects
    conversations.forEach(conv => {
      if (conv.createdAt) {
        conv.createdAt = new Date(conv.createdAt);
      }
      conv.instance = {
        name: conv.instanceName,
        instanceKey: conv.instanceKey
      };
      delete conv.instanceName;
      delete conv.instanceKey;
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
        const isGroup = msg.remoteJid.endsWith('@g.us') || contact?.isGroup || false;

        // Para grupos, usar o nome do grupo; para contatos, usar pushName
        // Ignorar pushName se for "Você" (próprio usuário salvo nos contatos)
        let displayName: string;
        if (isGroup) {
          displayName = contact?.groupName || 'Grupo';
        } else {
          const contactName = contact?.pushName && contact.pushName !== 'Você' ? contact.pushName : null;
          const msgName = msg.pushName && msg.pushName !== 'Você' ? msg.pushName : null;
          displayName = contactName || msgName || this.formatPhoneNumber(msg.remoteJid);
        }

        return {
          id: msg.id,
          contact: displayName,
          remoteJid: msg.remoteJid,
          lastMessage: msg.content.substring(0, 100),
          status: msg.status,
          instanceName: msg.instance.name,
          instanceKey: msg.instance.instanceKey,
          timestamp: msg.createdAt,
          pushName: contact?.pushName || msg.pushName,
          profilePicUrl: contact?.profilePicUrl || null,
          // Campos de grupo
          isGroup,
          groupName: contact?.groupName || null,
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

    // Helper function to get proper filename based on message type and content
    const getFileName = (mimetype: string): string => {
      // For documents, use the content which contains the original filename
      if (message.mediaType === 'document' && message.content && !message.content.startsWith('[')) {
        return message.content;
      }

      // Generate filename based on mimetype
      const extensionMap: Record<string, string> = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
        'audio/mpeg': '.mp3',
        'audio/ogg': '.ogg',
      };

      const extension = extensionMap[mimetype] || '';
      const prefix = message.mediaType || 'arquivo';
      const timestamp = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();

      return `${prefix}_${timestamp}${extension}`;
    };

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
          const fileName = getFileName(mimetype);

          res.set({
            'Content-Type': mimetype,
            'Content-Length': buffer.length,
            'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
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
        const fileName = getFileName(contentType);

        res.set({
          'Content-Type': contentType,
          'Content-Length': mediaResponse.data.length,
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
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
