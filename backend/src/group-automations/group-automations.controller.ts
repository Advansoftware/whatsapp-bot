import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupAutomationsService } from './group-automations.service';

@Controller('api/group-automations')
@UseGuards(JwtAuthGuard)
export class GroupAutomationsController {
  constructor(private readonly groupAutomationsService: GroupAutomationsService) { }

  /**
   * Listar todas as automações de grupo
   */
  @Get()
  async getAutomations(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.groupAutomationsService.getAutomations(companyId);
  }

  /**
   * Buscar grupos disponíveis
   */
  @Get('groups')
  async getGroups(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.groupAutomationsService.getGroups(companyId);
  }

  /**
   * Buscar uma automação específica
   */
  @Get(':id')
  async getAutomation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    const automation = await this.groupAutomationsService.getAutomation(id, companyId);

    if (!automation) {
      throw new HttpException('Automation not found', HttpStatus.NOT_FOUND);
    }

    return automation;
  }

  /**
   * Buscar dados coletados por uma automação
   */
  @Get(':id/data')
  async getAutomationData(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.groupAutomationsService.getAutomationData(id, companyId);
  }

  /**
   * Criar nova automação
   */
  @Post()
  async createAutomation(@Request() req: any, @Body() body: any) {
    const companyId = req.user.companyId;

    if (!body.name) {
      throw new HttpException('Name is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.actionType) {
      throw new HttpException('Action type is required', HttpStatus.BAD_REQUEST);
    }

    if (!body.groupRemoteJid && !body.groupNameMatch) {
      throw new HttpException('Either groupRemoteJid or groupNameMatch is required', HttpStatus.BAD_REQUEST);
    }

    return this.groupAutomationsService.createAutomation(companyId, body);
  }

  /**
   * Atualizar automação
   */
  @Put(':id')
  async updateAutomation(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    const companyId = req.user.companyId;

    // Verificar se existe
    const existing = await this.groupAutomationsService.getAutomation(id, companyId);
    if (!existing) {
      throw new HttpException('Automation not found', HttpStatus.NOT_FOUND);
    }

    return this.groupAutomationsService.updateAutomation(id, companyId, body);
  }

  /**
   * Deletar automação
   */
  @Delete(':id')
  async deleteAutomation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    // Verificar se existe
    const existing = await this.groupAutomationsService.getAutomation(id, companyId);
    if (!existing) {
      throw new HttpException('Automation not found', HttpStatus.NOT_FOUND);
    }

    await this.groupAutomationsService.deleteAutomation(id, companyId);
    return { success: true };
  }

  /**
   * Toggle ativo/inativo
   */
  @Post(':id/toggle')
  async toggleAutomation(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;

    const existing = await this.groupAutomationsService.getAutomation(id, companyId);
    if (!existing) {
      throw new HttpException('Automation not found', HttpStatus.NOT_FOUND);
    }

    return this.groupAutomationsService.updateAutomation(id, companyId, {
      isActive: !existing.isActive,
    });
  }
}
