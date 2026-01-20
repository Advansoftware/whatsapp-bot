import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactAutomationService } from './contact-automation.service';

// DTOs
interface CreateProfileDto {
  remoteJid: string;
  contactName: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  navigationHints?: string;
  fields?: CreateFieldDto[];
}

interface UpdateProfileDto {
  contactName?: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  navigationHints?: string;
  isActive?: boolean;
}

interface CreateFieldDto {
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  botPromptPatterns?: string[];
  fieldType?: 'text' | 'number' | 'cpf' | 'phone' | 'date';
  priority?: number;
  isRequired?: boolean;
}

interface UpdateFieldDto {
  fieldLabel?: string;
  fieldValue?: string;
  botPromptPatterns?: string[];
  fieldType?: string;
  priority?: number;
  isRequired?: boolean;
}

interface StartSessionDto {
  profileId: string;
  query: string;
  requestedFrom?: string;
}

@Controller('api/contact-automation')
@UseGuards(JwtAuthGuard)
export class ContactAutomationController {
  private readonly logger = new Logger(ContactAutomationController.name);

  constructor(
    private readonly automationService: ContactAutomationService,
  ) { }

  // ========== PROFILES ==========

  /**
   * Listar todos os perfis de automação
   */
  @Get('profiles')
  async listProfiles(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.automationService.listProfiles(companyId);
  }

  /**
   * Buscar perfil por ID
   */
  @Get('profiles/:id')
  async getProfile(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.automationService.getProfile(companyId, id);
  }

  /**
   * Criar novo perfil de automação
   */
  @Post('profiles')
  async createProfile(@Request() req: any, @Body() dto: CreateProfileDto) {
    const companyId = req.user.companyId;
    this.logger.log(`Creating automation profile for ${dto.contactName}`);
    return this.automationService.createProfile(companyId, dto);
  }

  /**
   * Atualizar perfil
   */
  @Put('profiles/:id')
  async updateProfile(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const companyId = req.user.companyId;
    return this.automationService.updateProfile(companyId, id, dto);
  }

  /**
   * Excluir perfil
   */
  @Delete('profiles/:id')
  async deleteProfile(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.automationService.deleteProfile(companyId, id);
  }

  /**
   * Toggle ativo/inativo
   */
  @Post('profiles/:id/toggle')
  async toggleProfile(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.automationService.toggleProfile(companyId, id);
  }

  // ========== FIELDS ==========

  /**
   * Adicionar campo a um perfil
   */
  @Post('profiles/:profileId/fields')
  async addField(
    @Request() req: any,
    @Param('profileId') profileId: string,
    @Body() dto: CreateFieldDto,
  ) {
    const companyId = req.user.companyId;
    return this.automationService.addField(companyId, profileId, dto);
  }

  /**
   * Atualizar campo
   */
  @Put('profiles/:profileId/fields/:fieldId')
  async updateField(
    @Request() req: any,
    @Param('profileId') profileId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateFieldDto,
  ) {
    const companyId = req.user.companyId;
    return this.automationService.updateField(companyId, profileId, fieldId, dto);
  }

  /**
   * Remover campo
   */
  @Delete('profiles/:profileId/fields/:fieldId')
  async removeField(
    @Request() req: any,
    @Param('profileId') profileId: string,
    @Param('fieldId') fieldId: string,
  ) {
    const companyId = req.user.companyId;
    return this.automationService.removeField(companyId, profileId, fieldId);
  }

  // ========== SESSIONS ==========

  /**
   * Listar sessões de automação
   */
  @Get('sessions')
  async listSessions(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('profileId') profileId?: string,
  ) {
    const companyId = req.user.companyId;
    return this.automationService.listSessions(companyId, { status, profileId });
  }

  /**
   * Buscar sessão por ID
   */
  @Get('sessions/:id')
  async getSession(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.automationService.getSession(companyId, id);
  }

  /**
   * Iniciar uma nova sessão de automação manualmente
   */
  @Post('sessions/start')
  async startSession(@Request() req: any, @Body() dto: StartSessionDto) {
    const companyId = req.user.companyId;
    const userId = req.user.id;

    this.logger.log(`Starting automation session for profile ${dto.profileId}`);
    return this.automationService.startSession(companyId, {
      ...dto,
      requestedBy: `user_${userId}`,
      requestedFrom: dto.requestedFrom || 'dashboard',
    });
  }

  /**
   * Cancelar sessão ativa
   */
  @Post('sessions/:id/cancel')
  async cancelSession(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.automationService.cancelSession(companyId, id);
  }

  // ========== CONTACTS ==========

  /**
   * Buscar contatos disponíveis para criar perfis
   */
  @Get('available-contacts')
  async getAvailableContacts(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.automationService.getAvailableContacts(companyId);
  }
}
