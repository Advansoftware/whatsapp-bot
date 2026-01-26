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
import { WebhookAppService } from './webhook-app.service';
import {
  CreateWebhookAppDto,
  UpdateWebhookAppDto,
  CreateWebhookEventDto,
  UpdateWebhookEventDto,
  CreateWebhookContactDto,
  UpdateWebhookContactDto,
} from './dto/webhook-app.dto';

@Controller()
export class WebhookAppController {
  private readonly logger = new Logger(WebhookAppController.name);

  constructor(private readonly webhookService: WebhookAppService) { }

  // ========================================
  // ENDPOINT PÚBLICO - Recebe webhooks
  // ========================================

  @Post('webhook/app/:appId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('appId') appId: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Webhook received for app: ${appId}`);

    try {
      const result = await this.webhookService.processWebhook(appId, payload, headers);
      return result;
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // APLICAÇÕES
  // ========================================

  @Get('api/webhook-apps')
  @UseGuards(JwtAuthGuard)
  async listApplications(@Request() req: any) {
    return this.webhookService.listApplications(req.user.companyId);
  }

  @Post('api/webhook-apps')
  @UseGuards(JwtAuthGuard)
  async createApplication(@Request() req: any, @Body() dto: CreateWebhookAppDto) {
    return this.webhookService.createApplication(req.user.companyId, dto);
  }

  @Get('api/webhook-apps/:appId')
  @UseGuards(JwtAuthGuard)
  async getApplication(@Request() req: any, @Param('appId') appId: string) {
    return this.webhookService.getApplication(req.user.companyId, appId);
  }

  @Patch('api/webhook-apps/:appId')
  @UseGuards(JwtAuthGuard)
  async updateApplication(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() dto: UpdateWebhookAppDto,
  ) {
    return this.webhookService.updateApplication(req.user.companyId, appId, dto);
  }

  @Delete('api/webhook-apps/:appId')
  @UseGuards(JwtAuthGuard)
  async deleteApplication(@Request() req: any, @Param('appId') appId: string) {
    return this.webhookService.deleteApplication(req.user.companyId, appId);
  }

  @Patch('api/webhook-apps/:appId/origins')
  @UseGuards(JwtAuthGuard)
  async updateAllowedOrigins(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() body: { origins: string[] },
  ) {
    return this.webhookService.updateAllowedOrigins(req.user.companyId, appId, body.origins);
  }

  // ========================================
  // EVENTOS
  // ========================================

  @Post('api/webhook-apps/:appId/events')
  @UseGuards(JwtAuthGuard)
  async createEvent(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() dto: CreateWebhookEventDto,
  ) {
    return this.webhookService.createEvent(req.user.companyId, appId, dto);
  }

  @Patch('api/webhook-events/:eventId')
  @UseGuards(JwtAuthGuard)
  async updateEvent(
    @Request() req: any,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateWebhookEventDto,
  ) {
    return this.webhookService.updateEvent(req.user.companyId, eventId, dto);
  }

  @Delete('api/webhook-events/:eventId')
  @UseGuards(JwtAuthGuard)
  async deleteEvent(@Request() req: any, @Param('eventId') eventId: string) {
    return this.webhookService.deleteEvent(req.user.companyId, eventId);
  }

  // ========================================
  // LOGS
  // ========================================

  @Get('api/webhook-apps/:appId/logs')
  @UseGuards(JwtAuthGuard)
  async getApplicationLogs(
    @Request() req: any,
    @Param('appId') appId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.webhookService.getApplicationLogs(
      req.user.companyId,
      appId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Delete('api/webhook-logs/:logId')
  @UseGuards(JwtAuthGuard)
  async deleteLog(@Request() req: any, @Param('logId') logId: string) {
    return this.webhookService.deleteLog(req.user.companyId, logId);
  }

  @Delete('api/webhook-apps/:appId/logs')
  @UseGuards(JwtAuthGuard)
  async clearLogs(@Request() req: any, @Param('appId') appId: string) {
    return this.webhookService.clearLogs(req.user.companyId, appId);
  }

  // ========================================
  // CONTATOS POR APLICAÇÃO
  // ========================================

  @Get('api/webhook-apps/:appId/contacts')
  @UseGuards(JwtAuthGuard)
  async listContacts(@Request() req: any, @Param('appId') appId: string) {
    return this.webhookService.listContacts(req.user.companyId, appId);
  }

  @Post('api/webhook-apps/:appId/contacts')
  @UseGuards(JwtAuthGuard)
  async createContact(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() dto: CreateWebhookContactDto,
  ) {
    return this.webhookService.createContact(req.user.companyId, appId, dto);
  }

  @Patch('api/webhook-apps/:appId/contacts/:contactId')
  @UseGuards(JwtAuthGuard)
  async updateContact(
    @Request() req: any,
    @Param('appId') appId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateWebhookContactDto,
  ) {
    return this.webhookService.updateContact(req.user.companyId, appId, contactId, dto);
  }

  @Delete('api/webhook-apps/:appId/contacts/:contactId')
  @UseGuards(JwtAuthGuard)
  async deleteContact(
    @Request() req: any,
    @Param('appId') appId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.webhookService.deleteContact(req.user.companyId, appId, contactId);
  }

  // ========================================
  // UTILITÁRIOS
  // ========================================

  @Post('api/webhook-apps/:appId/extract-fields')
  @UseGuards(JwtAuthGuard)
  async extractPayloadFields(
    @Request() req: any,
    @Param('appId') appId: string,
    @Body() body: { payload: any },
  ) {
    // Verificar se app pertence ao usuário
    await this.webhookService.getApplication(req.user.companyId, appId);

    const fields = this.webhookService.extractPayloadFields(body.payload);
    return { fields };
  }
}
