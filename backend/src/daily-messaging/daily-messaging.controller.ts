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
  // SUBSCRIBERS
  // ================================

  @Get('subscribers')
  async listSubscribers(@Request() req: any, @Query('status') status?: string) {
    return this.service.listSubscribers(req.user.companyId, status);
  }

  @Get('subscribers/:id')
  async getSubscriber(@Request() req: any, @Param('id') id: string) {
    return this.service.getSubscriber(id, req.user.companyId);
  }

  @Post('subscribers')
  async createSubscriber(@Request() req: any, @Body() dto: CreateSubscriberDto) {
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
  async listMessages(@Request() req: any) {
    return this.service.listMessages(req.user.companyId);
  }

  @Get('messages/:day')
  async getMessage(@Request() req: any, @Param('day', ParseIntPipe) day: number) {
    return this.service.getMessage(req.user.companyId, day);
  }

  @Post('messages')
  async createOrUpdateMessage(@Request() req: any, @Body() dto: CreateMessageDto) {
    if (dto.dayNumber < 1 || dto.dayNumber > 365) {
      throw new BadRequestException('Day number must be between 1 and 365');
    }
    return this.service.createOrUpdateMessage(req.user.companyId, dto);
  }

  @Put('messages/:day')
  async updateMessage(@Request() req: any, @Param('day', ParseIntPipe) day: number, @Body() dto: UpdateMessageDto) {
    return this.service.updateMessage(req.user.companyId, day, dto);
  }

  @Delete('messages/:day')
  async deleteMessage(@Request() req: any, @Param('day', ParseIntPipe) day: number) {
    return this.service.deleteMessage(req.user.companyId, day);
  }

  @Post('messages/import')
  async importMessages(@Request() req: any, @Body() body: { messages: ImportMessageDto[] }) {
    if (!body.messages || !Array.isArray(body.messages)) {
      throw new BadRequestException('Messages array is required');
    }
    return this.service.importMessages(req.user.companyId, body.messages);
  }

  // ================================
  // LOGS
  // ================================

  @Get('logs')
  async listLogs(
    @Request() req: any,
    @Query('subscriberId') subscriberId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listLogs(req.user.companyId, {
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
  async sendTest(@Request() req: any, @Body() body: { phone: string; dayNumber: number }) {
    if (!body.phone || !body.dayNumber) {
      throw new BadRequestException('Phone and dayNumber are required');
    }
    return this.service.sendTestMessage(req.user.companyId, body.phone, body.dayNumber);
  }

  @Post('trigger-daily')
  async triggerDaily(@Request() req: any) {
    return this.scheduler.triggerManually(req.user.companyId);
  }

  // ================================
  // STATS
  // ================================

  @Get('stats')
  async getStats(@Request() req: any) {
    const companyId = req.user.companyId;

    const [totalSubscribers, activeSubscribers, messagesCount, todayLogs] = await Promise.all([
      this.service['prisma'].dailyMessageSubscriber.count({ where: { companyId } }),
      this.service['prisma'].dailyMessageSubscriber.count({ where: { companyId, status: 'active' } }),
      this.service['prisma'].dailyMessage.count({ where: { companyId } }),
      this.service['prisma'].dailyMessageSendLog.count({
        where: {
          subscriber: { companyId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      totalSubscribers,
      activeSubscribers,
      messagesCount,
      todayLogs,
    };
  }
}
