import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExternalWebhookService } from './external-webhook.service';
import {
  CreateWebhookContactDto,
  UpdateWebhookContactDto,
  UpdateWebhookConfigDto,
} from './dto/external-webhook.dto';

@Controller()
export class ExternalWebhookController {
  private readonly logger = new Logger(ExternalWebhookController.name);

  constructor(private readonly webhookService: ExternalWebhookService) { }

  // ========================================
  // ENDPOINT PÚBLICO - Recebe webhooks
  // ========================================

  /**
   * Endpoint público para receber webhooks de qualquer aplicação
   * URL: POST /webhook/external/:companyId
   */
  @Post('webhook/external/:companyId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('companyId') companyId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received external webhook for company ${companyId}`);

    try {
      const result = await this.webhookService.processWebhook(
        companyId,
        payload,
        headers,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // Retorna 200 mesmo com erro para não causar retries desnecessários
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ENDPOINTS AUTENTICADOS - Configuração
  // ========================================

  /**
   * Obtém configuração do webhook
   */
  @Get('api/webhook-config')
  @UseGuards(JwtAuthGuard)
  async getConfig(@Request() req: any) {
    const companyId = req.user.companyId;
    const config = await this.webhookService.getOrCreateConfig(companyId);

    // Gerar URL do webhook para o usuário
    const baseUrl = process.env.APP_URL || 'http://localhost:3001';
    const webhookUrl = `${baseUrl}/webhook/external/${companyId}`;

    return {
      ...config,
      webhookUrl,
    };
  }

  /**
   * Atualiza configuração do webhook
   */
  @Patch('api/webhook-config')
  @UseGuards(JwtAuthGuard)
  async updateConfig(
    @Request() req: any,
    @Body() dto: UpdateWebhookConfigDto,
  ) {
    const companyId = req.user.companyId;
    return this.webhookService.updateConfig(companyId, dto);
  }

  // ========================================
  // ENDPOINTS AUTENTICADOS - Logs
  // ========================================

  /**
   * Lista logs de webhooks recebidos
   */
  @Get('api/webhook-logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const companyId = req.user.companyId;
    return this.webhookService.getLogs(companyId, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  // ========================================
  // ENDPOINTS AUTENTICADOS - Contatos
  // ========================================

  /**
   * Lista contatos de notificação
   */
  @Get('api/webhook-contacts')
  @UseGuards(JwtAuthGuard)
  async getContacts(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.webhookService.getContacts(companyId);
  }

  /**
   * Adiciona um contato de notificação
   */
  @Post('api/webhook-contacts')
  @UseGuards(JwtAuthGuard)
  async createContact(
    @Request() req: any,
    @Body() dto: CreateWebhookContactDto,
  ) {
    const companyId = req.user.companyId;
    return this.webhookService.createContact(companyId, dto);
  }

  /**
   * Atualiza um contato de notificação
   */
  @Patch('api/webhook-contacts/:id')
  @UseGuards(JwtAuthGuard)
  async updateContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookContactDto,
  ) {
    const companyId = req.user.companyId;
    return this.webhookService.updateContact(id, companyId, dto);
  }

  /**
   * Remove um contato de notificação
   */
  @Delete('api/webhook-contacts/:id')
  @UseGuards(JwtAuthGuard)
  async deleteContact(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.webhookService.deleteContact(id, companyId);
  }
}
