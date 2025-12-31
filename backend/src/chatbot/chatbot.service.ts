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
}
