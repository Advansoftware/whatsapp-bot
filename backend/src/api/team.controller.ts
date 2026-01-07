import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { User, Conversation, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Interface para o payload do JWT
interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
}

interface RequestWithUser {
  user: JwtPayload;
}

// DTOs
interface AddMemberDto {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'manager' | 'agent';
}

interface UpdateMemberDto {
  name?: string;
  role?: 'admin' | 'manager' | 'agent';
  isActive?: boolean;
  password?: string;
}

interface AssignConversationDto {
  agentId: string | null;
}

@Controller('api/team')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private prisma: PrismaService) { }

  // Listar todos os membros da equipe
  @Get('members')
  async getMembers(@Request() req: RequestWithUser) {
    const members = await this.prisma.user.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { createdAt: 'asc' },
    });

    // Contar conversas ativas para cada membro
    const membersWithStats = await Promise.all(
      members.map(async (member: User) => {
        const activeConversations = await this.prisma.conversation.count({
          where: {
            assignedAgentId: member.id,
            status: { in: ['active', 'in_progress', 'waiting'] },
          },
        });
        return {
          id: member.id,
          email: member.email,
          name: member.name,
          picture: member.picture,
          role: member.role,
          isActive: member.isActive,
          createdAt: member.createdAt,
          activeConversations,
        };
      }),
    );

    return membersWithStats;
  }

  // Adicionar membro à equipe
  @Post('members')
  async addMember(@Request() req: RequestWithUser, @Body() body: AddMemberDto) {
    // Apenas admin pode adicionar membros
    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Apenas administradores podem adicionar membros');
    }

    const { email, name, password, role = 'agent' } = body;

    if (!email || !name || !password) {
      throw new BadRequestException('Email, nome e senha são obrigatórios');
    }

    // Verificar se email já existe
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Este email já está cadastrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const member = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        companyId: req.user.companyId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return member;
  }

  // Atualizar membro
  @Put('members/:id')
  async updateMember(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateMemberDto,
  ) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (currentUser.role !== 'admin' && currentUser.id !== id) {
      throw new ForbiddenException('Sem permissão para editar este usuário');
    }

    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || member.companyId !== req.user.companyId) {
      throw new BadRequestException('Membro não encontrado');
    }

    const { name, role, isActive, password } = body;

    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined && currentUser.role === 'admin') updateData.role = role;
    if (typeof isActive === 'boolean' && currentUser.role === 'admin') {
      updateData.isActive = isActive;
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return updated;
  }

  // Remover membro
  @Delete('members/:id')
  async removeMember(@Request() req: RequestWithUser, @Param('id') id: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Apenas administradores podem remover membros');
    }

    if (currentUser.id === id) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member || member.companyId !== req.user.companyId) {
      throw new BadRequestException('Membro não encontrado');
    }

    // Reatribuir conversas para IA antes de remover
    await this.prisma.conversation.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null, assignedTo: 'ai' },
    });

    await this.prisma.user.delete({ where: { id } });

    return { success: true };
  }

  // Atribuir conversa a um membro
  @Post('conversations/:conversationId/assign')
  async assignConversation(
    @Request() req: RequestWithUser,
    @Param('conversationId') conversationId: string,
    @Body() body: AssignConversationDto,
  ) {
    const { agentId } = body; // null para devolver para IA

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.companyId !== req.user.companyId) {
      throw new BadRequestException('Conversa não encontrada');
    }

    if (agentId) {
      const agent = await this.prisma.user.findUnique({ where: { id: agentId } });
      if (!agent || agent.companyId !== req.user.companyId) {
        throw new BadRequestException('Atendente não encontrado');
      }

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          assignedAgentId: agentId,
          assignedTo: agentId,
          assignedAt: new Date(),
          status: 'in_progress',
          aiEnabled: false,
        },
      });
    } else {
      // Devolver para IA
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          assignedAgentId: null,
          assignedTo: 'ai',
          assignedAt: null,
          aiEnabled: true,
        },
      });
    }

    return { success: true };
  }

  // Listar conversas por atendente
  @Get('conversations')
  async getTeamConversations(@Request() req: RequestWithUser) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const where: Prisma.ConversationWhereInput = {
      companyId: req.user.companyId,
      status: { in: ['active', 'waiting', 'in_progress'] },
    };

    // Agentes só veem suas próprias conversas
    if (currentUser.role === 'agent') {
      where.assignedAgentId = currentUser.id;
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, name: true, picture: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations;
  }

  // Estatísticas da equipe
  @Get('stats')
  async getTeamStats(@Request() req: RequestWithUser) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!currentUser) {
      throw new BadRequestException('Usuário não encontrado');
    }

    if (currentUser.role === 'agent') {
      throw new ForbiddenException('Sem permissão para ver estatísticas da equipe');
    }

    const members = await this.prisma.user.findMany({
      where: { companyId: req.user.companyId, isActive: true },
      select: {
        id: true,
        name: true,
        picture: true,
        role: true,
        _count: {
          select: {
            assignedConversations: true,
          },
        },
      },
    });

    const conversationStats = await this.prisma.conversation.groupBy({
      by: ['status'],
      where: { companyId: req.user.companyId },
      _count: true,
    });

    const aiHandled = await this.prisma.conversation.count({
      where: {
        companyId: req.user.companyId,
        assignedTo: 'ai',
        status: { in: ['active', 'waiting', 'in_progress'] },
      },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        picture: m.picture,
        role: m.role,
        totalConversations: m._count.assignedConversations,
      })),
      conversationStats: conversationStats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count }),
        {} as Record<string, number>,
      ),
      aiHandledConversations: aiHandled,
    };
  }
}
