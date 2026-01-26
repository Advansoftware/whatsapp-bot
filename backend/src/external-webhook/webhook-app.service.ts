import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import {
  CreateWebhookAppDto,
  UpdateWebhookAppDto,
  CreateWebhookEventDto,
  UpdateWebhookEventDto,
  CreateWebhookContactDto,
  UpdateWebhookContactDto,
} from './dto/webhook-app.dto';

@Injectable()
export class WebhookAppService {
  private readonly logger = new Logger(WebhookAppService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ========================================
  // APLICAÇÕES
  // ========================================

  async createApplication(companyId: string, dto: CreateWebhookAppDto) {
    // Gerar slug único a partir do nome
    const baseSlug = this.generateSlug(dto.name);
    let slug = baseSlug;
    let counter = 1;

    // Garantir slug único
    while (await this.prisma.webhookApplication.findUnique({
      where: { companyId_slug: { companyId, slug } },
    })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return this.prisma.webhookApplication.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        description: dto.description,
        icon: dto.icon || '🔔',
        color: dto.color || '#6366f1',
      },
      include: {
        events: true,
        _count: { select: { logs: true } },
      },
    });
  }

  async listApplications(companyId: string) {
    const apps = await this.prisma.webhookApplication.findMany({
      where: { companyId },
      include: {
        events: { where: { isActive: true } },
        _count: { select: { logs: true, events: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const baseUrl = process.env.APP_URL || 'http://localhost:4000';

    return apps.map(app => ({
      ...app,
      webhookUrl: `${baseUrl}/webhook/app/${app.id}`,
    }));
  }

  async getApplication(companyId: string, appId: string) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
      include: {
        events: { orderBy: { createdAt: 'desc' } },
        _count: { select: { logs: true } },
      },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:4000';

    return {
      ...app,
      webhookUrl: `${baseUrl}/webhook/app/${app.id}`,
    };
  }

  async updateApplication(companyId: string, appId: string, dto: UpdateWebhookAppDto) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    return this.prisma.webhookApplication.update({
      where: { id: appId },
      data: dto,
      include: {
        events: true,
        _count: { select: { logs: true } },
      },
    });
  }

  async deleteApplication(companyId: string, appId: string) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    await this.prisma.webhookApplication.delete({ where: { id: appId } });
    return { success: true };
  }

  async updateAllowedOrigins(companyId: string, appId: string, origins: string[]) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    return this.prisma.webhookApplication.update({
      where: { id: appId },
      data: { allowedOrigins: origins },
    });
  }

  // ========================================
  // EVENTOS
  // ========================================

  async createEvent(companyId: string, appId: string, dto: CreateWebhookEventDto) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    return this.prisma.webhookEvent.create({
      data: {
        applicationId: appId,
        name: dto.name,
        description: dto.description,
        eventField: dto.eventField,
        eventValue: dto.eventValue,
        messageTemplate: dto.messageTemplate,
        contactIds: dto.contactIds || [],
      },
    });
  }

  async updateEvent(companyId: string, eventId: string, dto: UpdateWebhookEventDto) {
    const event = await this.prisma.webhookEvent.findFirst({
      where: { id: eventId },
      include: { application: true },
    });

    if (!event || event.application.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado');
    }

    return this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: dto,
    });
  }

  async deleteEvent(companyId: string, eventId: string) {
    const event = await this.prisma.webhookEvent.findFirst({
      where: { id: eventId },
      include: { application: true },
    });

    if (!event || event.application.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado');
    }

    await this.prisma.webhookEvent.delete({ where: { id: eventId } });
    return { success: true };
  }

  // ========================================
  // LOGS
  // ========================================

  async getApplicationLogs(companyId: string, appId: string, limit = 50, offset = 0) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    const [logs, total] = await Promise.all([
      this.prisma.webhookApplicationLog.findMany({
        where: { applicationId: appId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookApplicationLog.count({ where: { applicationId: appId } }),
    ]);

    return { logs, total, limit, offset };
  }

  async deleteLog(companyId: string, logId: string) {
    const log = await this.prisma.webhookApplicationLog.findFirst({
      where: { id: logId },
      include: { application: true },
    });

    if (!log || log.application.companyId !== companyId) {
      throw new NotFoundException('Log não encontrado');
    }

    await this.prisma.webhookApplicationLog.delete({ where: { id: logId } });
    return { success: true };
  }

  async clearLogs(companyId: string, appId: string) {
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    await this.prisma.webhookApplicationLog.deleteMany({
      where: { applicationId: appId },
    });

    return { success: true };
  }

  // ========================================
  // CONTATOS POR APLICAÇÃO
  // ========================================

  async listContacts(companyId: string, appId: string) {
    // Verificar se app pertence à empresa
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    return this.prisma.webhookContact.findMany({
      where: { applicationId: appId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContact(companyId: string, appId: string, dto: CreateWebhookContactDto) {
    // Verificar se app pertence à empresa
    const app = await this.prisma.webhookApplication.findFirst({
      where: { id: appId, companyId },
    });

    if (!app) {
      throw new NotFoundException('Aplicação não encontrada');
    }

    const existing = await this.prisma.webhookContact.findUnique({
      where: { applicationId_remoteJid: { applicationId: appId, remoteJid: dto.remoteJid } },
    });

    if (existing) {
      throw new BadRequestException('Contato já existe nesta aplicação');
    }

    return this.prisma.webhookContact.create({
      data: {
        companyId,
        applicationId: appId,
        name: dto.name,
        remoteJid: dto.remoteJid,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateContact(companyId: string, appId: string, contactId: string, dto: UpdateWebhookContactDto) {
    const contact = await this.prisma.webhookContact.findFirst({
      where: { id: contactId, applicationId: appId },
      include: { application: true },
    });

    if (!contact || contact.application.companyId !== companyId) {
      throw new NotFoundException('Contato não encontrado');
    }

    return this.prisma.webhookContact.update({
      where: { id: contactId },
      data: dto,
    });
  }

  async deleteContact(companyId: string, appId: string, contactId: string) {
    const contact = await this.prisma.webhookContact.findFirst({
      where: { id: contactId, applicationId: appId },
      include: { application: true },
    });

    if (!contact || contact.application.companyId !== companyId) {
      throw new NotFoundException('Contato não encontrado');
    }

    await this.prisma.webhookContact.delete({ where: { id: contactId } });
    return { success: true };
  }

  // ========================================
  // PROCESSAMENTO DE WEBHOOK
  // ========================================

  async processWebhook(appId: string, payload: any, headers: Record<string, string>) {
    // Buscar aplicação
    const app = await this.prisma.webhookApplication.findUnique({
      where: { id: appId },
      include: { events: { where: { isActive: true } } },
    });

    if (!app) {
      this.logger.warn(`Webhook received for unknown app: ${appId}`);
      return { success: false, error: 'Application not found' };
    }

    if (!app.isActive) {
      return { success: false, error: 'Application is disabled' };
    }

    // Validar origem se configurado
    if (app.allowedOrigins.length > 0) {
      // Tentar obter a origem de vários headers possíveis
      const origin = headers['origin'] || headers['referer'] || '';
      const forwardedFor = headers['x-forwarded-for'] || headers['x-real-ip'] || '';
      const host = headers['host'] || '';
      const payloadUrl = payload?.url || '';

      // Normalizar para comparação (remover protocolo e trailing slash)
      const normalize = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();

      // Verificar se alguma origem configurada corresponde
      const isAllowed = app.allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        const normalizedAllowed = normalize(allowed);

        // Verificar no header origin/referer
        if (origin && normalize(origin).includes(normalizedAllowed)) return true;
        // Verificar no IP de origem
        if (forwardedFor && forwardedFor.includes(allowed)) return true;
        // Verificar no host
        if (host && host.includes(normalizedAllowed)) return true;
        // Verificar se o payload contém a URL (para Coolify que envia url no body)
        if (payloadUrl && normalize(payloadUrl).includes(normalizedAllowed)) return true;
        return false;
      });

      if (!isAllowed) {
        this.logger.warn(`Webhook rejected - origin not allowed. Origin: ${origin}, IP: ${forwardedFor}, Host: ${host}`);
        return { success: false, error: 'Origin not allowed' };
      }
    }

    // Validar token secreto se configurado
    if (app.secretToken) {
      const token = headers['x-webhook-secret'] || headers['authorization'];
      if (token !== app.secretToken && token !== `Bearer ${app.secretToken}`) {
        this.logger.warn(`Webhook rejected - invalid secret token`);
        return { success: false, error: 'Invalid secret token' };
      }
    }

    // Criar log
    let log = null;
    if (app.logEnabled) {
      log = await this.prisma.webhookApplicationLog.create({
        data: {
          applicationId: appId,
          payload,
          headers,
          status: 'received',
        },
      });
    }

    try {
      // Encontrar evento que corresponde ao payload
      const matchedEvent = this.findMatchingEvent(app.events, payload);

      if (!matchedEvent) {
        // Nenhum evento configurado para este payload
        if (log) {
          await this.prisma.webhookApplicationLog.update({
            where: { id: log.id },
            data: { status: 'no_match' },
          });
        }
        return {
          success: true,
          message: 'No matching event configured',
          payload: payload, // Retorna payload para o usuário configurar
        };
      }

      // Buscar contatos do evento (ou todos da aplicação se vazio)
      const contacts = await this.getEventContacts(appId, matchedEvent.contactIds);

      if (contacts.length === 0) {
        if (log) {
          await this.prisma.webhookApplicationLog.update({
            where: { id: log.id },
            data: {
              status: 'matched',
              matchedEventId: matchedEvent.id,
              matchedEventName: matchedEvent.name,
            },
          });
        }
        return { success: true, message: 'No contacts configured', messagesSent: 0 };
      }

      // Formatar mensagem usando template
      const message = this.formatMessage(matchedEvent.messageTemplate, payload);

      // Enviar mensagens
      let messagesSent = 0;
      for (const contact of contacts) {
        try {
          await this.sendWhatsAppMessage(app.companyId, contact.remoteJid, message);
          messagesSent++;
        } catch (err) {
          this.logger.error(`Failed to send to ${contact.remoteJid}: ${err.message}`);
        }
      }

      // Atualizar log
      if (log) {
        await this.prisma.webhookApplicationLog.update({
          where: { id: log.id },
          data: {
            status: 'sent',
            matchedEventId: matchedEvent.id,
            matchedEventName: matchedEvent.name,
            messagesSent,
          },
        });
      }

      return { success: true, messagesSent, event: matchedEvent.name };

    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);

      if (log) {
        await this.prisma.webhookApplicationLog.update({
          where: { id: log.id },
          data: { status: 'failed', error: error.message },
        });
      }

      return { success: false, error: error.message };
    }
  }

  // ========================================
  // HELPERS
  // ========================================

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private findMatchingEvent(events: any[], payload: any): any | null {
    for (const event of events) {
      const value = this.getNestedValue(payload, event.eventField);
      if (value !== undefined && String(value) === event.eventValue) {
        return event;
      }
    }
    return null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatMessage(template: string, payload: any): string {
    // Substituir todos os placeholders {{campo}} ou {{campo.subcampo}}
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(payload, path.trim());
      if (value === undefined || value === null) {
        return match; // Manter placeholder se não encontrar
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    });
  }

  private async getEventContacts(appId: string, contactIds: string[]) {
    if (contactIds.length === 0) {
      // Retorna todos os contatos ativos da aplicação
      return this.prisma.webhookContact.findMany({
        where: { applicationId: appId, isActive: true },
      });
    }

    return this.prisma.webhookContact.findMany({
      where: {
        id: { in: contactIds },
        applicationId: appId,
        isActive: true,
      },
    });
  }

  private async sendWhatsAppMessage(companyId: string, remoteJid: string, message: string) {
    const instance = await this.prisma.instance.findFirst({
      where: { companyId, status: 'connected' },
    });

    if (!instance) {
      throw new Error('No connected WhatsApp instance');
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    await axios.post(
      `${evolutionUrl}/message/sendText/${instance.instanceKey}`,
      {
        number: remoteJid.replace(/\D/g, ''),
        text: message,
      },
      {
        headers: { apikey: evolutionApiKey },
      },
    );
  }

  // Extrair campos do payload para sugestão no frontend
  extractPayloadFields(payload: any, prefix = ''): string[] {
    const fields: string[] = [];

    for (const [key, value] of Object.entries(payload)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      fields.push(fieldPath);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        fields.push(...this.extractPayloadFields(value, fieldPath));
      }
    }

    return fields;
  }
}
