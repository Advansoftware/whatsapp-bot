import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  /**
   * Lista notificações da empresa
   * GET /api/notifications?unreadOnly=true&limit=50&offset=0
   */
  @Get()
  async findAll(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const companyId = req.user.companyId;
    return this.notificationsService.findAll(companyId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * Retorna contagem de não lidas
   * GET /api/notifications/unread-count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const companyId = req.user.companyId;
    const count = await this.notificationsService.getUnreadCount(companyId);
    return { count };
  }

  /**
   * Marca uma notificação como lida
   * POST /api/notifications/:id/read
   */
  @Post(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.notificationsService.markAsRead(id, companyId);
  }

  /**
   * Marca todas as notificações como lidas
   * POST /api/notifications/read-all
   */
  @Post('read-all')
  async markAllAsRead(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.notificationsService.markAllAsRead(companyId);
  }

  /**
   * Remove uma notificação
   * DELETE /api/notifications/:id
   */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.notificationsService.remove(id, companyId);
  }

  /**
   * Remove todas as notificações
   * DELETE /api/notifications
   */
  @Delete()
  async removeAll(@Req() req: any) {
    const companyId = req.user.companyId;
    return this.notificationsService.removeAll(companyId);
  }
}
