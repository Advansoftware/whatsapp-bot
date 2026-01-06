import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';

export type NotificationType =
  | 'hot_lead'
  | 'escalation'
  | 'integration_error'
  | 'campaign_complete'
  | 'low_balance'
  | 'system'
  | 'task_reminder'
  | 'new_contact'
  | 'message_failed';

export type NotificationCategory = 'info' | 'warning' | 'error' | 'success';

export interface CreateNotificationDto {
  companyId: string;
  userId?: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) { }

  /**
   * Cria uma notificação e envia via WebSocket em tempo real
   */
  async create(dto: CreateNotificationDto) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          companyId: dto.companyId,
          userId: dto.userId,
          type: dto.type,
          category: dto.category || 'info',
          title: dto.title,
          message: dto.message,
          metadata: dto.metadata || {},
          actionUrl: dto.actionUrl,
          actionLabel: dto.actionLabel,
        },
      });

      // Emitir via WebSocket
      this.chatGateway.broadcastNotification({
        ...notification,
        isNew: true,
      });

      this.logger.log(`Notification created: ${dto.type} - ${dto.title}`);
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca notificações de uma empresa
   */
  async findAll(
    companyId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { unreadOnly = false, limit = 50, offset = 0 } = options;

    const where: any = { companyId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { companyId, read: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
    };
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(id: string, companyId: string) {
    const notification = await this.prisma.notification.updateMany({
      where: { id, companyId },
      data: { read: true, readAt: new Date() },
    });

    // Emitir atualização de contagem
    const unreadCount = await this.getUnreadCount(companyId);
    this.chatGateway.broadcastNotificationCount(companyId, unreadCount);

    return notification;
  }

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(companyId: string) {
    await this.prisma.notification.updateMany({
      where: { companyId, read: false },
      data: { read: true, readAt: new Date() },
    });

    // Emitir atualização de contagem zerada
    this.chatGateway.broadcastNotificationCount(companyId, 0);

    return { success: true };
  }

  /**
   * Remove uma notificação
   */
  async remove(id: string, companyId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, companyId },
    });
  }

  /**
   * Limpa notificações antigas (mais de 30 dias)
   */
  async cleanupOld() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        read: true,
      },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);
    return result;
  }

  /**
   * Retorna contagem de não lidas
   */
  async getUnreadCount(companyId: string) {
    return this.prisma.notification.count({
      where: { companyId, read: false },
    });
  }

  // ========================================
  // HELPERS PARA TIPOS ESPECÍFICOS
  // ========================================

  /**
   * Notificação de lead quente
   */
  async notifyHotLead(
    companyId: string,
    contactName: string,
    remoteJid: string,
    reason: string,
  ) {
    return this.create({
      companyId,
      type: 'hot_lead',
      category: 'success',
      title: '🔥 Lead Quente Detectado!',
      message: `${contactName} demonstrou alto interesse: ${reason}`,
      metadata: { remoteJid, contactName },
      actionUrl: `/chat/${remoteJid}`,
      actionLabel: 'Ver conversa',
    });
  }

  /**
   * Notificação de escalação (IA pedindo humano)
   */
  async notifyEscalation(
    companyId: string,
    contactName: string,
    remoteJid: string,
    reason: string,
  ) {
    return this.create({
      companyId,
      type: 'escalation',
      category: 'warning',
      title: '⚠️ Atenção Necessária',
      message: `${contactName} precisa de atendimento humano: ${reason}`,
      metadata: { remoteJid, contactName, reason },
      actionUrl: `/chat/${remoteJid}`,
      actionLabel: 'Assumir conversa',
    });
  }

  /**
   * Notificação de erro de integração
   */
  async notifyIntegrationError(
    companyId: string,
    provider: string,
    error: string,
  ) {
    return this.create({
      companyId,
      type: 'integration_error',
      category: 'error',
      title: `❌ Erro na integração ${provider}`,
      message: error,
      metadata: { provider },
      actionUrl: '/integrations',
      actionLabel: 'Ver integrações',
    });
  }

  /**
   * Notificação de campanha concluída
   */
  async notifyCampaignComplete(
    companyId: string,
    campaignName: string,
    sent: number,
    failed: number,
  ) {
    return this.create({
      companyId,
      type: 'campaign_complete',
      category: 'success',
      title: '✅ Campanha Finalizada',
      message: `"${campaignName}" enviou ${sent} mensagens${failed > 0 ? ` (${failed} falhas)` : ''}`,
      metadata: { campaignName, sent, failed },
      actionUrl: '/campaigns',
      actionLabel: 'Ver campanhas',
    });
  }

  /**
   * Notificação de saldo baixo
   */
  async notifyLowBalance(companyId: string, currentBalance: number) {
    return this.create({
      companyId,
      type: 'low_balance',
      category: 'warning',
      title: '💰 Saldo Baixo',
      message: `Seu saldo está em R$ ${currentBalance.toFixed(2)}. Recarregue para continuar usando a IA.`,
      metadata: { currentBalance },
      actionUrl: '/settings',
      actionLabel: 'Adicionar créditos',
    });
  }

  /**
   * Notificação de novo contato
   */
  async notifyNewContact(
    companyId: string,
    contactName: string,
    remoteJid: string,
  ) {
    return this.create({
      companyId,
      type: 'new_contact',
      category: 'info',
      title: '👤 Novo Contato',
      message: `${contactName} iniciou uma conversa`,
      metadata: { remoteJid, contactName },
      actionUrl: `/chat/${remoteJid}`,
      actionLabel: 'Ver conversa',
    });
  }

  /**
   * Notificação de lembrete de tarefa
   */
  async notifyTaskReminder(
    companyId: string,
    taskName: string,
    taskId: string,
  ) {
    return this.create({
      companyId,
      type: 'task_reminder',
      category: 'info',
      title: '📋 Lembrete de Tarefa',
      message: `Tarefa "${taskName}" precisa de atenção`,
      metadata: { taskId, taskName },
      actionUrl: '/ai-secretary',
      actionLabel: 'Ver tarefas',
    });
  }
}
