import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class ExternalWebhookService {
  private readonly logger = new Logger(ExternalWebhookService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Processa um webhook recebido
   */
  async processWebhook(
    companyId: string,
    payload: any,
    headers?: Record<string, string>,
  ) {
    // Detectar fonte baseado nos headers ou payload
    const source = this.detectSource(payload, headers);

    // Buscar configuração da empresa
    const config = await this.getOrCreateConfig(companyId);

    // Criar log do webhook (se habilitado)
    let webhookLog = null;
    if (config.logEnabled) {
      webhookLog = await this.prisma.webhookLog.create({
        data: {
          companyId,
          source,
          payload,
          headers: headers ?? Prisma.JsonNull,
          status: 'received',
        },
      });
    }

    try {
      // Buscar contatos ativos
      const contacts = await this.prisma.webhookNotificationContact.findMany({
        where: {
          companyId,
          isActive: true,
        },
      });

      if (contacts.length === 0) {
        this.logger.warn(`No active webhook contacts for company ${companyId}`);
        return { success: true, message: 'No contacts configured', messagesSent: 0 };
      }

      // Formatar mensagem usando o template
      const message = this.formatMessage(config.messageTemplate, payload, source);

      // Enviar para cada contato
      let messagesSent = 0;
      for (const contact of contacts) {
        try {
          await this.sendWhatsAppMessage(companyId, contact.remoteJid, message);
          messagesSent++;
        } catch (error) {
          this.logger.error(`Failed to send to ${contact.remoteJid}: ${error.message}`);
        }
      }

      // Atualizar log
      if (webhookLog) {
        await this.prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: 'processed',
            messagesSent,
          },
        });
      }

      return { success: true, messagesSent };
    } catch (error) {
      // Registrar erro no log
      if (webhookLog) {
        await this.prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: 'failed',
            error: error.message,
          },
        });
      }
      throw error;
    }
  }

  /**
   * Detecta a fonte do webhook baseado nos headers ou payload
   */
  private detectSource(payload: any, headers?: Record<string, string>): string | null {
    // GitHub
    if (headers?.['x-github-event'] || payload?.repository?.html_url?.includes('github.com')) {
      return 'github';
    }

    // GitLab
    if (headers?.['x-gitlab-event'] || payload?.project?.web_url?.includes('gitlab')) {
      return 'gitlab';
    }

    // Coolify
    if (payload?.type?.includes('deployment') || payload?.project?.uuid) {
      return 'coolify';
    }

    // Uptime Kuma
    if (payload?.heartbeat || payload?.monitor) {
      return 'uptime-kuma';
    }

    // N8N
    if (headers?.['user-agent']?.includes('n8n') || payload?.executionId) {
      return 'n8n';
    }

    return null;
  }

  /**
   * Formata a mensagem usando o template configurado
   */
  private formatMessage(template: string, payload: any, source: string | null): string {
    let message = template;

    // Substituir {{payload}} pelo payload formatado
    if (message.includes('{{payload}}')) {
      message = message.replace('{{payload}}', this.formatPayload(payload));
    }

    // Substituir {{source}} pela fonte detectada
    if (message.includes('{{source}}')) {
      message = message.replace('{{source}}', source || 'Desconhecido');
    }

    // Substituir {{timestamp}} pela data/hora atual
    if (message.includes('{{timestamp}}')) {
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      message = message.replace('{{timestamp}}', now);
    }

    // Substituir placeholders dinâmicos do payload (ex: {{project.name}})
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    message = message.replace(placeholderRegex, (match, path) => {
      const value = this.getNestedValue(payload, path);
      return value !== undefined ? String(value) : match;
    });

    return message;
  }

  /**
   * Formata o payload como texto legível
   */
  private formatPayload(payload: any): string {
    try {
      // Formatar como JSON identado
      return '```\n' + JSON.stringify(payload, null, 2).substring(0, 2000) + '\n```';
    } catch {
      return String(payload);
    }
  }

  /**
   * Obtém valor aninhado de um objeto (ex: "project.name")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Envia mensagem via WhatsApp
   */
  private async sendWhatsAppMessage(companyId: string, remoteJid: string, message: string) {
    // Buscar uma instância ativa da empresa
    const instance = await this.prisma.instance.findFirst({
      where: {
        companyId,
        status: 'connected',
      },
    });

    if (!instance) {
      throw new Error('No connected WhatsApp instance found');
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://evolution:8080';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    await axios.post(
      `${evolutionUrl}/message/sendText/${instance.instanceKey}`,
      {
        number: remoteJid.replace(/\D/g, ''),
        text: message,
        delay: 1200,
      },
      { headers: { apikey: evolutionApiKey } },
    );
  }

  /**
   * Obtém ou cria configuração do webhook para a empresa
   */
  async getOrCreateConfig(companyId: string) {
    let config = await this.prisma.webhookConfig.findUnique({
      where: { companyId },
    });

    if (!config) {
      config = await this.prisma.webhookConfig.create({
        data: {
          companyId,
          messageTemplate: '🔔 *Notificação Webhook*\n\n📡 Fonte: {{source}}\n⏰ {{timestamp}}\n\n{{payload}}',
        },
      });
    }

    return config;
  }

  /**
   * Atualiza configuração do webhook
   */
  async updateConfig(companyId: string, data: { messageTemplate?: string; logEnabled?: boolean; secretToken?: string }) {
    return this.prisma.webhookConfig.upsert({
      where: { companyId },
      update: data,
      create: {
        companyId,
        ...data,
      },
    });
  }

  /**
   * Busca logs de webhooks
   */
  async getLogs(companyId: string, options: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = options;

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.webhookLog.count({ where: { companyId } }),
    ]);

    return { logs, total };
  }

  /**
   * Limpa logs antigos
   */
  async cleanupOldLogs(daysToKeep = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.webhookLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old webhook logs`);
    return result;
  }

  // ========================================
  // CRUD de Contatos
  // ========================================

  async getContacts(companyId: string) {
    return this.prisma.webhookNotificationContact.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContact(companyId: string, data: { name: string; remoteJid: string; categories?: string[] }) {
    return this.prisma.webhookNotificationContact.create({
      data: {
        companyId,
        name: data.name,
        remoteJid: data.remoteJid,
        categories: data.categories || [],
      },
    });
  }

  async updateContact(id: string, companyId: string, data: { name?: string; isActive?: boolean; categories?: string[] }) {
    return this.prisma.webhookNotificationContact.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async deleteContact(id: string, companyId: string) {
    return this.prisma.webhookNotificationContact.deleteMany({
      where: { id, companyId },
    });
  }
}
