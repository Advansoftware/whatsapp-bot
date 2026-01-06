import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GastometriaService } from './gastometria.service';
import { GoogleCalendarService } from './google-calendar.service';

@Controller('api/integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly gastometriaService: GastometriaService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) { }

  // ========================================
  // GASTOMETRIA
  // ========================================

  @Get('gastometria/status')
  async getGastometriaStatus(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getStatus(companyId);
  }

  @Post('gastometria/connect')
  async connectGastometria(
    @Request() req: any,
    @Body() body: { email: string; password: string },
  ) {
    const companyId = req.user.companyId;
    return this.gastometriaService.connect(companyId, body.email, body.password);
  }

  @Delete('gastometria')
  async disconnectGastometria(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.disconnect(companyId);
  }

  @Get('gastometria/wallets')
  async getGastometriaWallets(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getWallets(companyId);
  }

  @Put('gastometria/config')
  async setGastometriaConfig(
    @Request() req: any,
    @Body() body: { defaultWalletId: string },
  ) {
    const companyId = req.user.companyId;
    const success = await this.gastometriaService.setDefaultWallet(companyId, body.defaultWalletId);
    return { success };
  }

  @Get('gastometria/balance')
  async getGastometriaBalance(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.gastometriaService.getBalance(companyId);
  }

  @Post('gastometria/transactions')
  async createGastometriaTransaction(
    @Request() req: any,
    @Body() body: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      item: string;
      date?: string;
      establishment?: string;
    },
  ) {
    const companyId = req.user.companyId;
    return this.gastometriaService.createTransaction(companyId, body);
  }

  // ========================================
  // GOOGLE CALENDAR
  // ========================================

  /**
   * Retorna status da integração com Google Calendar
   */
  @Get('google-calendar/status')
  async getGoogleCalendarStatus(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.getStatus(companyId);
  }

  /**
   * Inicia o fluxo OAuth2 - retorna URL para autorização
   */
  @Get('google-calendar/auth-url')
  async getGoogleCalendarAuthUrl(@Request() req: any) {
    const companyId = req.user.companyId;
    const authUrl = this.googleCalendarService.getAuthUrl(companyId);
    return { authUrl };
  }

  // Callback do OAuth2 está em IntegrationsPublicController (sem autenticação JWT)

  /**
   * Desconecta a integração com Google Calendar
   */
  @Delete('google-calendar')
  async disconnectGoogleCalendar(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.disconnect(companyId);
  }

  /**
   * Lista eventos do calendário
   */
  @Get('google-calendar/events')
  async listGoogleCalendarEvents(
    @Request() req: any,
    @Query('timeMin') timeMin?: string,
    @Query('timeMax') timeMax?: string,
    @Query('maxResults') maxResults?: string,
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.listEvents(companyId, {
      timeMin: timeMin ? new Date(timeMin) : undefined,
      timeMax: timeMax ? new Date(timeMax) : undefined,
      maxResults: maxResults ? parseInt(maxResults) : undefined,
    });
  }

  /**
   * Cria um evento no calendário
   */
  @Post('google-calendar/events')
  async createGoogleCalendarEvent(
    @Request() req: any,
    @Body() body: {
      summary: string;
      description?: string;
      start: string;
      end: string;
      location?: string;
      attendees?: string[];
    },
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.createEvent(companyId, {
      summary: body.summary,
      description: body.description,
      start: new Date(body.start),
      end: new Date(body.end),
      location: body.location,
      attendees: body.attendees,
    });
  }

  /**
   * Atualiza um evento do calendário
   */
  @Put('google-calendar/events/:eventId')
  async updateGoogleCalendarEvent(
    @Request() req: any,
    @Param('eventId') eventId: string,
    @Body() body: {
      summary?: string;
      description?: string;
      start?: string;
      end?: string;
      location?: string;
    },
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.updateEvent(companyId, eventId, {
      summary: body.summary,
      description: body.description,
      start: body.start ? new Date(body.start) : undefined,
      end: body.end ? new Date(body.end) : undefined,
      location: body.location,
    });
  }

  /**
   * Deleta um evento do calendário
   */
  @Delete('google-calendar/events/:eventId')
  async deleteGoogleCalendarEvent(
    @Request() req: any,
    @Param('eventId') eventId: string,
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.deleteEvent(companyId, eventId);
  }

  /**
   * Verifica disponibilidade (free/busy)
   */
  @Get('google-calendar/free-busy')
  async getGoogleCalendarFreeBusy(
    @Request() req: any,
    @Query('timeMin') timeMin: string,
    @Query('timeMax') timeMax: string,
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.getFreeBusy(
      companyId,
      new Date(timeMin),
      new Date(timeMax),
    );
  }

  /**
   * Agenda um compromisso (método simplificado para IA)
   */
  @Post('google-calendar/schedule')
  async scheduleAppointment(
    @Request() req: any,
    @Body() body: {
      title: string;
      description?: string;
      date: string;
      time: string;
      duration: number;
      customerName?: string;
      customerPhone?: string;
    },
  ) {
    const companyId = req.user.companyId;
    return this.googleCalendarService.scheduleAppointment(companyId, body);
  }
}
