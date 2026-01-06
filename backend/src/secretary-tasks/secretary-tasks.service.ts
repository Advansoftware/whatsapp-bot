import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Tipos de trigger
export type TriggerType = 'time_range' | 'keyword' | 'first_message' | 'owner_inactive' | 'always';

// Tipos de ação
export type ActionType = 'send_message' | 'add_to_response' | 'forward_owner' | 'set_tag';

// Configurações de trigger
export interface TimeRangeTriggerConfig {
  startHour: number;      // 0-23
  endHour: number;        // 0-23
  days: string[];         // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  timezone?: string;      // Default: America/Sao_Paulo
}

export interface KeywordTriggerConfig {
  keywords: string[];     // Lista de palavras-chave
  matchType: 'any' | 'all'; // Qualquer ou todas
}

export interface FirstMessageTriggerConfig {
  onlyNewContacts: boolean; // Apenas contatos nunca vistos
}

export interface OwnerInactiveTriggerConfig {
  inactiveMinutes: number;  // Minutos sem resposta do dono
}

// Configurações de ação
export interface SendMessageActionConfig {
  message: string;          // Mensagem a enviar
  replaceResponse?: boolean; // Se true, substitui resposta da IA
}

export interface AddToResponseActionConfig {
  prefix?: string;          // Texto antes da resposta
  suffix?: string;          // Texto depois da resposta
}

export interface ForwardOwnerActionConfig {
  notifyMessage?: string;   // Mensagem de notificação
  urgentOnly?: boolean;     // Só encaminha se urgente
}

export interface SetTagActionConfig {
  tags: string[];           // Tags a adicionar ao contato
}

export interface CreateTaskDto {
  name: string;
  description: string;
  triggerType: TriggerType;
  triggerConfig: any;
  actionType: ActionType;
  actionConfig: any;
  priority?: number;
  isActive?: boolean;
}

export interface UpdateTaskDto {
  name?: string;
  description?: string;
  triggerType?: TriggerType;
  triggerConfig?: any;
  actionType?: ActionType;
  actionConfig?: any;
  priority?: number;
  isActive?: boolean;
}

@Injectable()
export class SecretaryTasksService {
  private readonly logger = new Logger(SecretaryTasksService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Lista todas as tarefas de uma empresa
   */
  async findAll(companyId: string) {
    return this.prisma.secretaryTask.findMany({
      where: { companyId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Busca uma tarefa por ID
   */
  async findOne(id: string, companyId: string) {
    return this.prisma.secretaryTask.findFirst({
      where: { id, companyId },
    });
  }

  /**
   * Cria uma nova tarefa
   */
  async create(companyId: string, data: CreateTaskDto, createdBy?: string) {
    return this.prisma.secretaryTask.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        actionType: data.actionType,
        actionConfig: data.actionConfig,
        priority: data.priority || 5,
        isActive: data.isActive ?? true,
        createdBy: createdBy || 'dashboard',
      },
    });
  }

  /**
   * Atualiza uma tarefa
   */
  async update(id: string, companyId: string, data: UpdateTaskDto) {
    return this.prisma.secretaryTask.updateMany({
      where: { id, companyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Exclui uma tarefa
   */
  async delete(id: string, companyId: string) {
    return this.prisma.secretaryTask.deleteMany({
      where: { id, companyId },
    });
  }

  /**
   * Ativa/desativa uma tarefa
   */
  async toggle(id: string, companyId: string) {
    const task = await this.findOne(id, companyId);
    if (!task) return null;

    return this.prisma.secretaryTask.update({
      where: { id },
      data: { isActive: !task.isActive },
    });
  }

  /**
   * Busca tarefas ativas que devem ser executadas para o contexto atual
   */
  async getMatchingTasks(
    companyId: string,
    context: {
      messageContent: string;
      isFirstMessage: boolean;
      ownerLastActiveAt?: Date;
      currentTime?: Date;
    },
  ) {
    const tasks = await this.prisma.secretaryTask.findMany({
      where: { companyId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    const now = context.currentTime || new Date();
    const matchingTasks: typeof tasks = [];

    for (const task of tasks) {
      if (this.shouldExecuteTask(task, context, now)) {
        matchingTasks.push(task);
      }
    }

    return matchingTasks;
  }

  /**
   * Verifica se uma tarefa deve ser executada baseado no contexto
   */
  private shouldExecuteTask(
    task: any,
    context: {
      messageContent: string;
      isFirstMessage: boolean;
      ownerLastActiveAt?: Date;
    },
    now: Date,
  ): boolean {
    const config = task.triggerConfig as any;

    switch (task.triggerType) {
      case 'time_range':
        return this.checkTimeRange(config, now);

      case 'keyword':
        return this.checkKeywords(config, context.messageContent);

      case 'first_message':
        return context.isFirstMessage && (!config.onlyNewContacts || context.isFirstMessage);

      case 'owner_inactive':
        if (!context.ownerLastActiveAt) return true; // Se não há registro, considera inativo
        const inactiveMinutes = (now.getTime() - context.ownerLastActiveAt.getTime()) / 60000;
        return inactiveMinutes >= (config.inactiveMinutes || 30);

      case 'always':
        return true;

      default:
        return false;
    }
  }

  /**
   * Verifica se o horário atual está dentro do range configurado
   */
  private checkTimeRange(config: TimeRangeTriggerConfig, now: Date): boolean {
    const currentHour = now.getHours();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[now.getDay()];

    // Verifica dia da semana
    if (config.days && config.days.length > 0 && !config.days.includes(currentDay)) {
      return false;
    }

    // Verifica horário (lida com ranges que cruzam meia-noite)
    const { startHour, endHour } = config;

    if (startHour <= endHour) {
      // Range normal (ex: 8 às 18)
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Range que cruza meia-noite (ex: 22 às 8)
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  /**
   * Verifica se a mensagem contém as palavras-chave configuradas
   */
  private checkKeywords(config: KeywordTriggerConfig, messageContent: string): boolean {
    const lowerMessage = messageContent.toLowerCase();
    const keywords = config.keywords.map(k => k.toLowerCase());

    if (config.matchType === 'all') {
      return keywords.every(k => lowerMessage.includes(k));
    } else {
      return keywords.some(k => lowerMessage.includes(k));
    }
  }

  /**
   * Executa a ação de uma tarefa
   */
  async executeAction(
    task: any,
    context: {
      originalResponse?: string;
      remoteJid: string;
    },
  ): Promise<{
    modifiedResponse?: string;
    directMessage?: string;
    shouldForwardOwner?: boolean;
    tagsToAdd?: string[];
  }> {
    const config = task.actionConfig as any;
    const result: any = {};

    switch (task.actionType) {
      case 'send_message':
        if (config.replaceResponse) {
          result.modifiedResponse = config.message;
        } else {
          result.directMessage = config.message;
        }
        break;

      case 'add_to_response':
        if (context.originalResponse) {
          let modified = context.originalResponse;
          if (config.prefix) modified = `${config.prefix}\n\n${modified}`;
          if (config.suffix) modified = `${modified}\n\n${config.suffix}`;
          result.modifiedResponse = modified;
        }
        break;

      case 'forward_owner':
        result.shouldForwardOwner = true;
        if (config.notifyMessage) {
          result.ownerNotification = config.notifyMessage;
        }
        break;

      case 'set_tag':
        result.tagsToAdd = config.tags || [];
        break;
    }

    return result;
  }
}
