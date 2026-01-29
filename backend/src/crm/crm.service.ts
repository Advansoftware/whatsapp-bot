import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto } from './dto/pipeline.dto';
import { CreateStageDto, UpdateStageDto, ReorderStagesDto } from './dto/stage.dto';
import { CreateDealDto, UpdateDealDto, MoveDealDto } from './dto/deal.dto';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) { }

  // ==========================================
  // PIPELINES
  // ==========================================
  async findAllPipelines(companyId: string) {
    return this.prisma.pipeline.findMany({
      where: { companyId, isActive: true },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findPipelineById(id: string, companyId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, companyId, isActive: true },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          include: {
            deals: {
              orderBy: { position: 'asc' },
              include: {
                contact: {
                  select: {
                    id: true,
                    pushName: true,
                    profilePicUrl: true,
                    remoteJid: true,
                  }
                }
              }
            },
          },
        },
      },
    });

    if (!pipeline) throw new NotFoundException('Pipeline not found');
    return pipeline;
  }

  async createPipeline(companyId: string, dto: CreatePipelineDto) {
    // Check if it's the first pipeline, make it default if so
    const count = await this.prisma.pipeline.count({ where: { companyId } });
    const isDefault = dto.isDefault || count === 0;

    if (isDefault) {
      // Unset other defaults
      await this.prisma.pipeline.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const pipeline = await this.prisma.pipeline.create({
      data: {
        companyId,
        name: dto.name,
        isDefault,
      },
    });

    // Create default stages
    await this.prisma.pipelineStage.createMany({
      data: [
        { pipelineId: pipeline.id, name: 'Novo Lead', position: 0, color: '#3b82f6' },
        { pipelineId: pipeline.id, name: 'Contato Feito', position: 1, color: '#f59e0b' },
        { pipelineId: pipeline.id, name: 'Negociando', position: 2, color: '#8b5cf6' },
        { pipelineId: pipeline.id, name: 'Fechado', position: 3, color: '#10b981' },
      ]
    });

    return this.findPipelineById(pipeline.id, companyId);
  }

  async updatePipeline(id: string, companyId: string, dto: UpdatePipelineDto) {
    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: dto,
    });
  }

  async deletePipeline(id: string, companyId: string) {
    // Soft delete
    return this.prisma.pipeline.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==========================================
  // STAGES
  // ==========================================
  async createStage(companyId: string, dto: CreateStageDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: dto.pipelineId, companyId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const lastStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: dto.pipelineId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.pipelineStage.create({
      data: {
        pipelineId: dto.pipelineId,
        name: dto.name,
        color: dto.color,
        position: dto.position ?? (lastStage ? lastStage.position + 1 : 0),
      },
      include: { deals: true },
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    return this.prisma.pipelineStage.update({
      where: { id },
      data: dto,
    });
  }

  async deleteStage(id: string) {
    return this.prisma.pipelineStage.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reorderStages(companyId: string, dto: ReorderStagesDto) {
    const { pipelineId, stageIds } = dto;

    // Verify pipeline belongs to company
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, companyId }
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    // Transactional update
    return this.prisma.$transaction(
      stageIds.map((id, index) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { position: index },
        })
      )
    );
  }

  // ==========================================
  // DEALS
  // ==========================================
  async createDeal(companyId: string, dto: CreateDealDto) {
    // Verify stage belongs to a pipeline of this company
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipeline: { companyId } }
    });
    if (!stage) throw new NotFoundException('Stage not found');

    const lastDeal = await this.prisma.deal.findFirst({
      where: { stageId: dto.stageId },
      orderBy: { position: 'desc' },
    });

    return this.prisma.deal.create({
      data: {
        companyId,
        stageId: dto.stageId,
        title: dto.title,
        contactId: dto.contactId,
        value: dto.value,
        priority: dto.priority,
        notes: dto.notes,
        expectedCloseDate: dto.expectedCloseDate,
        position: lastDeal ? lastDeal.position + 1000 : 1000,
      },
      include: {
        contact: {
          select: {
            id: true,
            pushName: true,
            profilePicUrl: true,
            remoteJid: true,
          }
        }
      }
    });
  }

  async updateDeal(id: string, companyId: string, dto: UpdateDealDto) {
    return this.prisma.deal.update({
      where: { id, companyId },
      data: dto,
      include: {
        contact: {
          select: {
            id: true,
            pushName: true,
            profilePicUrl: true,
            remoteJid: true,
          }
        }
      }
    });
  }

  async deleteDeal(id: string, companyId: string) {
    return this.prisma.deal.deleteMany({
      where: { id, companyId },
    });
  }

  async moveDeal(id: string, companyId: string, dto: MoveDealDto) {
    // Get deal and verify ownership
    const deal = await this.prisma.deal.findFirst({
      where: { id, companyId }
    });
    if (!deal) throw new NotFoundException('Deal not found');

    // Verify target stage
    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipeline: { companyId } }
    });
    if (!targetStage) throw new NotFoundException('Target stage not found');

    // Calculate new position using a simple midpoint strategy or list reordering
    // For simplicity/robustness, we'll shift others if specific position requested
    // The frontend sends the desired index.
    // But implementing linked-list style or precise standard Kanban reordering:
    // We will perform a reorder of the target column to make space.

    // 1. Get all deals in target stage ordered by position
    // If moving within same stage:
    if (deal.stageId === dto.stageId) {
      // Simple reorder logic would go here, 
      // but for MVP let's just update position directly if provided, or handle simplistic swap
      // A better approach for concurrent usage is Lexorank or large gaps.
      // Here we will use fractional positioning or just set position directly.
      // However, to be safe with drag-drop libraries, usually we re-index the whole column.

      // Efficient approach: Just update stageId and position.
      // Frontend provides correct position? Frontend usually provides INDEX.
      // We need to fetch all deals in target column to determine numeric position.

      const dealsInStage = await this.prisma.deal.findMany({
        where: { stageId: dto.stageId, id: { not: id } },
        orderBy: { position: 'asc' }
      });

      // Insert local deal into array at dto.position
      const newOrder = [...dealsInStage];
      const placeholderDeal = { ...deal, position: 0 } as any;
      newOrder.splice(dto.position, 0, placeholderDeal); // insert at index

      // Update all changed positions
      return this.prisma.$transaction(
        newOrder.map((d, index) =>
          this.prisma.deal.update({
            where: { id: d.id },
            data: {
              position: index * 1000 + 1000,
              stageId: dto.stageId // ensure stage is correct
            }
          })
        )
      );
    } else {
      // Moving to different stage
      const dealsInTargetStage = await this.prisma.deal.findMany({
        where: { stageId: dto.stageId },
        orderBy: { position: 'asc' }
      });

      const newOrder = [...dealsInTargetStage];
      const placeholderDeal = { ...deal, position: 0 } as any;
      newOrder.splice(dto.position, 0, placeholderDeal);

      const updates = newOrder.map((d, index) =>
        this.prisma.deal.update({
          where: { id: d.id },
          data: {
            position: index * 1000 + 1000, // Leave gaps for future inserts
            stageId: dto.stageId
          }
        })
      );

      const results = await this.prisma.$transaction(updates);
      return results.find(d => d.id === id);
    }
  }

  // ==========================================
  // DEAL NOTES
  // ==========================================
  async getDealNotes(dealId: string, companyId: string) {
    // Verify deal belongs to company
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, companyId }
    });
    if (!deal) throw new NotFoundException('Deal not found');

    return this.prisma.dealNote.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createDealNote(dealId: string, companyId: string, content: string, userId?: string) {
    // Verify deal belongs to company
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, companyId }
    });
    if (!deal) throw new NotFoundException('Deal not found');

    return this.prisma.dealNote.create({
      data: {
        dealId,
        content,
        createdBy: userId,
      }
    });
  }

  async deleteDealNote(dealId: string, noteId: string, companyId: string) {
    // Verify deal belongs to company
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, companyId }
    });
    if (!deal) throw new NotFoundException('Deal not found');

    return this.prisma.dealNote.delete({
      where: { id: noteId }
    });
  }
}
