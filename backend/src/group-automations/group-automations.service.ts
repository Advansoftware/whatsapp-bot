import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';

export interface AutomationMatchResult {
  matched: boolean;
  automation?: any;
  capturedData?: any;
  response?: string;
  skipAi?: boolean;
}

@Injectable()
export class GroupAutomationsService {
  private readonly logger = new Logger(GroupAutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) { }

  /**
   * Processa uma mensagem de grupo e verifica se há automações aplicáveis
   */
  async processGroupMessage(
    companyId: string,
    groupRemoteJid: string,
    groupName: string | null,
    participantJid: string,
    participantName: string | null,
    content: string,
    messageId: string,
    instanceKey: string,
  ): Promise<AutomationMatchResult> {
    // Buscar automações ativas para este grupo
    const automations = await this.getActiveAutomationsForGroup(companyId, groupRemoteJid, groupName);

    if (automations.length === 0) {
      return { matched: false };
    }

    // Processar cada automação em ordem de prioridade
    for (const automation of automations) {
      const matchResult = await this.matchAndExecuteAutomation(
        automation,
        groupRemoteJid,
        participantJid,
        participantName,
        content,
        messageId,
        instanceKey,
      );

      if (matchResult.matched) {
        return matchResult;
      }
    }

    return { matched: false };
  }

  /**
   * Busca automações ativas para um grupo específico
   */
  private async getActiveAutomationsForGroup(
    companyId: string,
    groupRemoteJid: string,
    groupName: string | null,
  ) {
    const now = new Date();

    // Buscar todas as automações ativas do company
    const automations = await this.prisma.groupAutomation.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: now } },
            ],
          },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    // Filtrar automações que se aplicam a este grupo
    return automations.filter((auto) => {
      // Se tem JID específico, verificar match exato
      if (auto.groupRemoteJid) {
        return auto.groupRemoteJid === groupRemoteJid;
      }

      // Se tem padrão de nome, verificar regex
      if (auto.groupNameMatch && groupName) {
        try {
          const regex = new RegExp(auto.groupNameMatch, 'i');
          return regex.test(groupName);
        } catch {
          // Se regex inválido, tentar match exato (case insensitive)
          return groupName.toLowerCase().includes(auto.groupNameMatch.toLowerCase());
        }
      }

      // Se não tem nem JID nem padrão de nome, não aplica
      return false;
    });
  }

  /**
   * Verifica se a mensagem dá match com a automação e executa a ação
   */
  private async matchAndExecuteAutomation(
    automation: any,
    groupRemoteJid: string,
    participantJid: string,
    participantName: string | null,
    content: string,
    messageId: string,
    instanceKey: string,
  ): Promise<AutomationMatchResult> {
    // Se tem padrão de captura, verificar match
    if (automation.capturePattern) {
      try {
        const regex = new RegExp(automation.capturePattern, 'gi');
        const matches = content.match(regex);

        if (!matches || matches.length === 0) {
          return { matched: false };
        }

        // Extrair dados capturados
        const capturedData = this.extractCapturedData(content, automation.capturePattern, automation.actionConfig);

        // Executar ação baseada no tipo
        const result = await this.executeAction(
          automation,
          groupRemoteJid,
          participantJid,
          participantName,
          content,
          messageId,
          instanceKey,
          capturedData,
        );

        return {
          matched: true,
          automation,
          capturedData,
          response: result.response,
          skipAi: automation.skipAiAfter,
        };
      } catch (error) {
        this.logger.warn(`Regex error in automation ${automation.id}: ${error.message}`);
        return { matched: false };
      }
    }

    // Se não tem padrão, match em qualquer mensagem do grupo
    const result = await this.executeAction(
      automation,
      groupRemoteJid,
      participantJid,
      participantName,
      content,
      messageId,
      instanceKey,
      { raw: content },
    );

    return {
      matched: true,
      automation,
      capturedData: { raw: content },
      response: result.response,
      skipAi: automation.skipAiAfter,
    };
  }

  /**
   * Extrai dados capturados baseado no regex e configuração
   */
  private extractCapturedData(content: string, pattern: string, actionConfig: any): any {
    const data: any = { raw: content };

    try {
      const regex = new RegExp(pattern, 'gi');

      // Padrão especial para números de loteria (6 números)
      if (actionConfig?.dataType === 'lottery_numbers') {
        // Encontrar todos os números no conteúdo
        const numberMatches = content.match(/\d+/g) || [];
        const numbers = numberMatches.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 60);

        if (numbers.length >= 6) {
          // Pegar os primeiros 6 números válidos
          data.numbers = numbers.slice(0, 6);
        } else {
          data.numbers = numbers;
        }
      }

      // Padrão para valores monetários
      if (actionConfig?.dataType === 'money') {
        const moneyMatch = content.match(/R?\$?\s*(\d+[.,]?\d*)/i);
        if (moneyMatch) {
          data.value = parseFloat(moneyMatch[1].replace(',', '.'));
        }
      }

      // Captura genérica via regex com grupos
      const matchWithGroups = regex.exec(content);
      if (matchWithGroups && matchWithGroups.groups) {
        Object.assign(data, matchWithGroups.groups);
      }
    } catch (error) {
      this.logger.warn(`Error extracting data: ${error.message}`);
    }

    return data;
  }

  /**
   * Executa a ação configurada na automação
   */
  private async executeAction(
    automation: any,
    groupRemoteJid: string,
    participantJid: string,
    participantName: string | null,
    content: string,
    messageId: string,
    instanceKey: string,
    capturedData: any,
  ): Promise<{ response?: string }> {
    const actionConfig = automation.actionConfig || {};

    switch (automation.actionType) {
      case 'collect_data':
        return this.executeCollectData(automation, groupRemoteJid, participantJid, participantName, messageId, capturedData);

      case 'auto_reply':
        return this.executeAutoReply(automation, participantName, capturedData, actionConfig);

      case 'webhook':
        return this.executeWebhook(automation, groupRemoteJid, participantJid, participantName, content, capturedData, actionConfig);

      case 'aggregate':
        return this.executeAggregate(automation, groupRemoteJid, participantJid, capturedData, actionConfig);

      case 'ai_process':
        return this.executeAiProcess(automation, content, instanceKey, groupRemoteJid, actionConfig);

      default:
        this.logger.warn(`Unknown action type: ${automation.actionType}`);
        return {};
    }
  }

  /**
   * Ação: Coletar dados e salvar no banco
   */
  private async executeCollectData(
    automation: any,
    groupRemoteJid: string,
    participantJid: string,
    participantName: string | null,
    messageId: string,
    capturedData: any,
  ): Promise<{ response?: string }> {
    // Verificar se deve responder apenas uma vez por participante
    if (automation.replyOnlyOnce) {
      const existing = await this.prisma.groupAutomationData.findFirst({
        where: {
          automationId: automation.id,
          participantJid,
        },
      });

      if (existing) {
        this.logger.log(`Participant ${participantJid} already submitted for automation ${automation.id}`);
        return {}; // Não responde novamente
      }
    }

    // Salvar dados coletados
    await this.prisma.groupAutomationData.create({
      data: {
        automationId: automation.id,
        groupRemoteJid,
        participantJid,
        participantName,
        messageId,
        data: capturedData,
      },
    });

    this.logger.log(`📊 Collected data for automation "${automation.name}": ${JSON.stringify(capturedData)}`);

    // Gerar resposta se configurado
    if (automation.shouldReply) {
      const response = this.generateResponse(automation.actionConfig, participantName, capturedData);
      return { response };
    }

    return {};
  }

  /**
   * Ação: Resposta automática
   */
  private async executeAutoReply(
    automation: any,
    participantName: string | null,
    capturedData: any,
    actionConfig: any,
  ): Promise<{ response?: string }> {
    if (!automation.shouldReply || !actionConfig.replyTemplate) {
      return {};
    }

    const response = this.interpolateTemplate(actionConfig.replyTemplate, {
      participantName: participantName || 'Participante',
      ...capturedData,
    });

    return { response };
  }

  /**
   * Ação: Webhook externo
   */
  private async executeWebhook(
    automation: any,
    groupRemoteJid: string,
    participantJid: string,
    participantName: string | null,
    content: string,
    capturedData: any,
    actionConfig: any,
  ): Promise<{ response?: string }> {
    if (!actionConfig.url) {
      return {};
    }

    try {
      const axios = require('axios');
      const payload = {
        automationId: automation.id,
        automationName: automation.name,
        groupRemoteJid,
        participantJid,
        participantName,
        content,
        capturedData,
        timestamp: new Date().toISOString(),
      };

      await axios({
        method: actionConfig.method || 'POST',
        url: actionConfig.url,
        data: payload,
        headers: actionConfig.headers || {},
        timeout: 10000,
      });

      this.logger.log(`📤 Webhook sent to ${actionConfig.url}`);

      if (automation.shouldReply && actionConfig.successReply) {
        return { response: actionConfig.successReply };
      }
    } catch (error) {
      this.logger.error(`Webhook failed: ${error.message}`);
    }

    return {};
  }

  /**
   * Ação: Agregar dados (soma, contagem, etc)
   */
  private async executeAggregate(
    automation: any,
    groupRemoteJid: string,
    participantJid: string,
    capturedData: any,
    actionConfig: any,
  ): Promise<{ response?: string }> {
    // Salvar dado primeiro
    await this.prisma.groupAutomationData.create({
      data: {
        automationId: automation.id,
        groupRemoteJid,
        participantJid,
        data: capturedData,
      },
    });

    // Calcular agregação
    const allData = await this.prisma.groupAutomationData.findMany({
      where: { automationId: automation.id },
    });

    let result: any = {};

    if (actionConfig.operation === 'count') {
      result.count = allData.length;
      result.uniqueParticipants = new Set(allData.map(d => d.participantJid)).size;
    }

    if (actionConfig.operation === 'sum' && actionConfig.field) {
      result.sum = allData.reduce((acc, d) => {
        const value = (d.data as any)?.[actionConfig.field] || 0;
        return acc + (typeof value === 'number' ? value : parseFloat(value) || 0);
      }, 0);
    }

    if (automation.shouldReply && actionConfig.replyTemplate) {
      const response = this.interpolateTemplate(actionConfig.replyTemplate, {
        ...result,
        ...capturedData,
      });
      return { response };
    }

    return {};
  }

  /**
   * Ação: Processar com IA customizada
   */
  private async executeAiProcess(
    automation: any,
    content: string,
    instanceKey: string,
    groupRemoteJid: string,
    actionConfig: any,
  ): Promise<{ response?: string }> {
    if (!actionConfig.prompt) {
      return {};
    }

    try {
      // Usar IA para processar
      const fullPrompt = `${actionConfig.prompt}\n\nMensagem recebida: "${content}"`;

      // Por enquanto, apenas retorna o prompt como resposta
      // TODO: Integrar com OpenAI/Anthropic para processamento real
      this.logger.log(`🤖 AI processing requested for automation ${automation.name}`);

      return {};
    } catch (error) {
      this.logger.error(`AI processing failed: ${error.message}`);
      return {};
    }
  }

  /**
   * Gera resposta baseada na configuração
   */
  private generateResponse(actionConfig: any, participantName: string | null, capturedData: any): string {
    if (actionConfig?.replyTemplate) {
      return this.interpolateTemplate(actionConfig.replyTemplate, {
        participantName: participantName || 'Participante',
        ...capturedData,
      });
    }

    // Resposta padrão para coleta de dados
    if (capturedData.numbers) {
      return `✅ Números registrados: ${capturedData.numbers.join(' - ')}\n👤 Participante: ${participantName || 'Anônimo'}`;
    }

    return `✅ Dados registrados com sucesso!`;
  }

  /**
   * Interpola variáveis em um template
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (data[key] !== undefined) {
        if (Array.isArray(data[key])) {
          return data[key].join(' - ');
        }
        return String(data[key]);
      }
      return match;
    });
  }

  // ================================
  // CRUD Operations
  // ================================

  async createAutomation(companyId: string, data: any) {
    return this.prisma.groupAutomation.create({
      data: {
        companyId,
        name: data.name,
        description: data.description,
        groupRemoteJid: data.groupRemoteJid,
        groupNameMatch: data.groupNameMatch,
        capturePattern: data.capturePattern,
        actionType: data.actionType,
        actionConfig: data.actionConfig || {},
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        priority: data.priority || 0,
        shouldReply: data.shouldReply ?? true,
        replyOnlyOnce: data.replyOnlyOnce ?? false,
        skipAiAfter: data.skipAiAfter ?? true,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateAutomation(id: string, companyId: string, data: any) {
    return this.prisma.groupAutomation.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        groupRemoteJid: data.groupRemoteJid,
        groupNameMatch: data.groupNameMatch,
        capturePattern: data.capturePattern,
        actionType: data.actionType,
        actionConfig: data.actionConfig,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        priority: data.priority,
        shouldReply: data.shouldReply,
        replyOnlyOnce: data.replyOnlyOnce,
        skipAiAfter: data.skipAiAfter,
        isActive: data.isActive,
      },
    });
  }

  async deleteAutomation(id: string, companyId: string) {
    return this.prisma.groupAutomation.delete({
      where: { id },
    });
  }

  async getAutomations(companyId: string) {
    return this.prisma.groupAutomation.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { collectedData: true },
        },
      },
    });
  }

  async getAutomation(id: string, companyId: string) {
    return this.prisma.groupAutomation.findFirst({
      where: { id, companyId },
      include: {
        collectedData: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
  }

  async getAutomationData(automationId: string, companyId: string) {
    // Verificar se a automação pertence ao company
    const automation = await this.prisma.groupAutomation.findFirst({
      where: { id: automationId, companyId },
    });

    if (!automation) {
      return [];
    }

    return this.prisma.groupAutomationData.findMany({
      where: { automationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroups(companyId: string) {
    // Buscar grupos únicos dos contatos
    return this.prisma.contact.findMany({
      where: {
        companyId,
        isGroup: true,
      },
      select: {
        remoteJid: true,
        groupName: true,
        groupDescription: true,
      },
      orderBy: { groupName: 'asc' },
    });
  }
}
