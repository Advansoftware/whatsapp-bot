import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface CreateQuickReplyDto {
  title: string;
  shortcut?: string;
  content: string;
  category?: string;
  icon?: string;
  order?: number;
}

interface UpdateQuickReplyDto {
  title?: string;
  shortcut?: string;
  content?: string;
  category?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
}

@Controller('api/quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  constructor(private prisma: PrismaService) { }

  @Get()
  async getAll(@Request() req: any) {
    const quickReplies = await this.prisma.quickReply.findMany({
      where: {
        companyId: req.user.companyId,
      },
      orderBy: [
        { order: 'asc' },
        { usageCount: 'desc' },
        { title: 'asc' },
      ],
    });

    return quickReplies;
  }

  @Get('active')
  async getActive(@Request() req: any) {
    const quickReplies = await this.prisma.quickReply.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
      },
      orderBy: [
        { order: 'asc' },
        { usageCount: 'desc' },
        { title: 'asc' },
      ],
    });

    return quickReplies;
  }

  @Get('categories')
  async getCategories() {
    return [
      { value: 'geral', label: 'Geral', icon: '📝' },
      { value: 'vendas', label: 'Vendas', icon: '💰' },
      { value: 'suporte', label: 'Suporte', icon: '🛠️' },
      { value: 'pagamento', label: 'Pagamento', icon: '💳' },
      { value: 'informacoes', label: 'Informações', icon: 'ℹ️' },
      { value: 'saudacao', label: 'Saudação', icon: '👋' },
      { value: 'despedida', label: 'Despedida', icon: '🙏' },
    ];
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    const quickReply = await this.prisma.quickReply.findFirst({
      where: {
        id,
        companyId: req.user.companyId,
      },
    });

    return quickReply;
  }

  @Post()
  async create(@Body() data: CreateQuickReplyDto, @Request() req: any) {
    const quickReply = await this.prisma.quickReply.create({
      data: {
        companyId: req.user.companyId,
        title: data.title,
        shortcut: data.shortcut,
        content: data.content,
        category: data.category || 'geral',
        icon: data.icon,
        order: data.order || 0,
      },
    });

    return quickReply;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateQuickReplyDto,
    @Request() req: any,
  ) {
    const quickReply = await this.prisma.quickReply.updateMany({
      where: {
        id,
        companyId: req.user.companyId,
      },
      data,
    });

    if (quickReply.count === 0) {
      return { error: 'Quick reply not found' };
    }

    return this.prisma.quickReply.findFirst({
      where: { id },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.prisma.quickReply.deleteMany({
      where: {
        id,
        companyId: req.user.companyId,
      },
    });
  }

  @Post(':id/use')
  async incrementUsage(@Param('id') id: string, @Request() req: any) {
    await this.prisma.quickReply.updateMany({
      where: {
        id,
        companyId: req.user.companyId,
      },
      data: {
        usageCount: { increment: 1 },
      },
    });

    return { success: true };
  }

  @Post('reorder')
  async reorder(@Body() data: { ids: string[] }, @Request() req: any) {
    const updates = data.ids.map((id, index) =>
      this.prisma.quickReply.updateMany({
        where: {
          id,
          companyId: req.user.companyId,
        },
        data: { order: index },
      }),
    );

    await Promise.all(updates);

    return { success: true };
  }
}
