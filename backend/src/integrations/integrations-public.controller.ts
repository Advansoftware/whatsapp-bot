import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GoogleCalendarService } from './google-calendar.service';

/**
 * Controller público para callbacks OAuth (sem autenticação JWT)
 */
@Controller('api/integrations')
export class IntegrationsPublicController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
  ) { }

  /**
   * Callback do OAuth2 do Google Calendar
   * Este endpoint é chamado pelo Google após autorização do usuário
   * NÃO pode ter autenticação JWT pois vem diretamente do Google
   */
  @Get('google-calendar/callback')
  async googleCalendarCallback(
    @Query('code') code: string,
    @Query('state') companyId: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Se houve erro no Google (ex: usuário cancelou)
    if (error) {
      return res.redirect(`${frontendUrl}/integrations?google_calendar=error&message=${encodeURIComponent(error)}`);
    }

    // Processar o código de autorização
    const result = await this.googleCalendarService.handleCallback(code, companyId);

    // Redirecionar para o frontend com status
    if (result.success) {
      return res.redirect(`${frontendUrl}/integrations?google_calendar=success`);
    } else {
      return res.redirect(`${frontendUrl}/integrations?google_calendar=error&message=${encodeURIComponent(result.error || 'Erro desconhecido')}`);
    }
  }
}
