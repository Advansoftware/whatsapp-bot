import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DailyMessagingService, CreateSubscriberDto, UpdateSubscriberDto, CreateMessageDto, UpdateMessageDto, ImportMessageDto } from './daily-messaging.service';
import { DailyMessagingScheduler } from './daily-messaging.scheduler';

@Controller('api/daily-messaging')
@UseGuards(JwtAuthGuard)
export class DailyMessagingController {
  constructor(
    private readonly service: DailyMessagingService,
    private readonly scheduler: DailyMessagingScheduler,
  ) { }

  // ================================
  // APPS
  // ================================

  @Get('apps')
  async listApps(@Request() req: any) {
    return this.service.listApps(req.user.companyId);
  }

  @Post('apps')
  async createApp(@Request() req: any, @Body() body: { name: string }) {
    if (!body.name) {
      throw new BadRequestException('Name is required');
    }
    return this.service.createApp(req.user.companyId, body.name);
  }

  @Delete('apps/:id')
  async deleteApp(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteApp(id, req.user.companyId);
  }

  // ================================
  // SUBSCRIBERS
  // ================================

  @Get('subscribers')
  async listSubscribers(@Request() req: any, @Query('appId') appId: string, @Query('status') status?: string) {
    if (!appId) throw new BadRequestException('appId is required');
    return this.service.listSubscribers(req.user.companyId, appId, status);
  }

  @Get('subscribers/:id')
  async getSubscriber(@Request() req: any, @Param('id') id: string) {
    return this.service.getSubscriber(id, req.user.companyId);
  }

  @Post('subscribers')
  async createSubscriber(@Request() req: any, @Body() dto: CreateSubscriberDto & { appId: string }) {
    if (!dto.appId) throw new BadRequestException('appId is required');
    return this.service.createSubscriber(req.user.companyId, dto);
  }

  @Put('subscribers/:id')
  async updateSubscriber(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSubscriberDto) {
    return this.service.updateSubscriber(id, req.user.companyId, dto);
  }

  @Delete('subscribers/:id')
  async deleteSubscriber(@Request() req: any, @Param('id') id: string) {
    return this.service.deleteSubscriber(id, req.user.companyId);
  }

  // ================================
  // MESSAGES
  // ================================

  @Get('messages')
  async listMessages(@Request() req: any, @Query('appId') appId: string) {
    if (!appId) throw new BadRequestException('appId is required');
    return this.service.listMessages(req.user.companyId, appId);
  }

  @Get('messages/:day')
  async getMessage(@Request() req: any, @Query('appId') appId: string, @Param('day', ParseIntPipe) day: number) {
    if (!appId) throw new BadRequestException('appId is required');
    return this.service.getMessage(req.user.companyId, appId, day);
  }

  @Post('messages')
  async createOrUpdateMessage(@Request() req: any, @Body() dto: CreateMessageDto & { appId: string }) {
    if (!dto.appId) throw new BadRequestException('appId is required');
    if (dto.dayNumber < 1 || dto.dayNumber > 365) {
      throw new BadRequestException('Day number must be between 1 and 365');
    }
    return this.service.createOrUpdateMessage(req.user.companyId, dto.appId, dto);
  }

  @Put('messages/:day')
  async updateMessage(@Request() req: any, @Query('appId') appId: string, @Param('day', ParseIntPipe) day: number, @Body() dto: UpdateMessageDto) {
    if (!appId) throw new BadRequestException('appId is required');
    return this.service.updateMessage(req.user.companyId, appId, day, dto);
  }

  @Delete('messages/:day')
  async deleteMessage(@Request() req: any, @Query('appId') appId: string, @Param('day', ParseIntPipe) day: number) {
    if (!appId) throw new BadRequestException('appId is required');
    return this.service.deleteMessage(req.user.companyId, appId, day);
  }

  @Post('messages/import')
  async importMessages(@Request() req: any, @Body() body: { appId: string; messages: ImportMessageDto[] }) {
    if (!body.appId) throw new BadRequestException('appId is required');
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new BadRequestException('Messages array is required');
    }
    return this.service.importMessages(req.user.companyId, body.appId, body.messages);
  }

  // ================================
  // LOGS
  // ================================

  @Get('logs')
  async listLogs(
    @Request() req: any,
    @Query('appId') appId: string,
    @Query('subscriberId') subscriberId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!appId && !subscriberId) throw new BadRequestException('appId is required');
    // If subscriberId is provided, we can infer app, but better to enforce appId for consistency if known

    return this.service.listLogs(req.user.companyId, appId, {
      subscriberId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ================================
  // ACTIONS
  // ================================

  @Post('send-test')
  async sendTest(@Request() req: any, @Body() body: { phone: string; dayNumber: number; appId: string }) {
    if (!body.phone || !body.dayNumber || !body.appId) {
      throw new BadRequestException('Phone, dayNumber and appId are required');
    }
    return this.service.sendTestMessage(req.user.companyId, body.phone, body.dayNumber, body.appId);
  }

  @Post('trigger-daily')
  async triggerDaily(@Request() req: any) {
    return this.scheduler.triggerManually(req.user.companyId);
  }

  // ================================
  // STATS
  // ================================

  @Get('stats')
  async getStats(@Request() req: any, @Query('appId') appId: string) {
    return this.service.getStats(req.user.companyId, appId);
  }
}
