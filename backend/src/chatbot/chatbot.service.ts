import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatbotService {
  constructor(private readonly prisma: PrismaService) { }

  async createFlow(companyId: string, data: any) {
    const { name, keyword, nodes } = data;

    return this.prisma.chatFlow.create({
      data: {
        name,
        keyword,
        companyId,
        nodes: {
          create: nodes.map((node: any, index: number) => ({
            content: node.content,
            type: node.type || 'text',
            stepIndex: index,
            parentId: node.parentId,
          })),
        },
      },
      include: { nodes: true },
    });
  }

  async getFlows(companyId: string) {
    return this.prisma.chatFlow.findMany({
      where: { companyId },
      include: { nodes: { orderBy: { stepIndex: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFlow(id: string, companyId: string) {
    return this.prisma.chatFlow.findFirst({
      where: { id, companyId },
      include: { nodes: { orderBy: { stepIndex: 'asc' } } },
    });
  }

  async updateFlow(id: string, companyId: string, data: any) {
    const { name, keyword, isActive, nodes } = data;

    // Transaction to update flow and replace nodes
    return this.prisma.$transaction(async (tx) => {
      // 1. Update basic info
      const flow = await tx.chatFlow.update({
        where: { id, companyId },
        data: { name, keyword, isActive },
      });

      if (nodes) {
        // 2. Delete existing nodes
        await tx.chatNode.deleteMany({
          where: { flowId: id },
        });

        // 3. Create new nodes
        for (const [index, node] of nodes.entries()) {
          await tx.chatNode.create({
            data: {
              flowId: id,
              content: node.content,
              type: node.type || 'text',
              stepIndex: index, // Use loop index as order
              parentId: node.parentId,
            },
          });
        }
      }

      return flow;
    });
  }

  async deleteFlow(id: string, companyId: string) {
    return this.prisma.chatFlow.deleteMany({
      where: { id, companyId },
    });
  }

  /**
   * Encontra um fluxo que corresponda à mensagem recebida
   */
  async findMatchingFlow(companyId: string, messageContent: string) {
    const lowerContent = messageContent.toLowerCase().trim();

    // Buscar todos os fluxos ativos
    const flows = await this.prisma.chatFlow.findMany({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        nodes: {
          orderBy: { stepIndex: 'asc' },
        },
      },
    });

    // Procurar fluxo que corresponda à keyword
    for (const flow of flows) {
      const keywords = flow.keyword.toLowerCase().split(',').map(k => k.trim());
      for (const keyword of keywords) {
        if (lowerContent.includes(keyword) || lowerContent === keyword) {
          return flow;
        }
      }
    }

    return null;
  }

  /**
   * Executa um fluxo de chatbot, retornando as mensagens a serem enviadas
   */
  async executeFlow(
    flow: { id: string; nodes: Array<{ content: string; type: string; stepIndex: number }> },
    context: { customerName?: string; products?: any[] }
  ): Promise<string[]> {
    const messages: string[] = [];

    for (const node of flow.nodes) {
      if (node.type === 'text') {
        // Substituir variáveis no conteúdo
        let content = node.content;
        content = content.replace(/\{nome\}/gi, context.customerName || 'Cliente');
        content = content.replace(/\{name\}/gi, context.customerName || 'Cliente');

        messages.push(content);
      }
      // Outros tipos de nodes podem ser adicionados aqui (button, list, delay, etc.)
    }

    return messages;
  }

  /**
   * Processa uma mensagem contra os fluxos de chatbot
   * Retorna null se não houver fluxo correspondente
   */
  async processMessage(
    companyId: string,
    messageContent: string,
    context: { customerName?: string; products?: any[] }
  ): Promise<{ matched: boolean; responses: string[] }> {
    const flow = await this.findMatchingFlow(companyId, messageContent);

    if (!flow) {
      return { matched: false, responses: [] };
    }

    const responses = await this.executeFlow(flow, context);

    // Registrar execução do fluxo (opcional - para analytics)
    // await this.logFlowExecution(flow.id, companyId);

    return { matched: true, responses };
  }

  /**
   * Obtém o estado atual de uma conversa no fluxo (para fluxos multi-step)
   */
  async getConversationState(companyId: string, remoteJid: string) {
    // Por enquanto, sem estado - cada mensagem é processada independentemente
    // Futuramente pode salvar em que passo do fluxo o usuário está
    return null;
  }
}
