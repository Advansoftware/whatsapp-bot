import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  location?: string;
  attendees?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: { method: 'email' | 'popup'; minutes: number }[];
  };
}

export interface CalendarEventResponse {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  htmlLink: string;
  status: string;
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private oauth2Client: OAuth2Client;
  private readonly PROVIDER = 'google_calendar';
  private readonly CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/api/integrations/google-calendar/callback';

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Gera URL de autorização OAuth2
   */
  getAuthUrl(companyId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: companyId, // Passa o companyId para identificar na callback
    });

    return authUrl;
  }

  /**
   * Processa callback do OAuth2 e salva tokens
   */
  async handleCallback(code: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      // Salvar tokens no banco
      await this.prisma.externalIntegration.upsert({
        where: {
          companyId_provider: { companyId, provider: this.PROVIDER },
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
          updatedAt: new Date(),
        },
        create: {
          companyId,
          provider: this.PROVIDER,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          isActive: true,
        },
      });

      this.logger.log(`Google Calendar connected for company ${companyId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to handle OAuth callback: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica status da integração
   */
  async getStatus(companyId: string): Promise<{
    connected: boolean;
    expiresAt?: Date;
    email?: string;
  }> {
    const integration = await this.prisma.externalIntegration.findUnique({
      where: {
        companyId_provider: { companyId, provider: this.PROVIDER },
      },
    });

    if (!integration || !integration.isActive || !integration.accessToken) {
      return { connected: false };
    }

    // Verificar se token expirou
    if (integration.expiresAt && new Date() > integration.expiresAt) {
      // Tentar renovar token
      const refreshed = await this.refreshToken(companyId);
      if (!refreshed) {
        return { connected: false };
      }
    }

    return {
      connected: true,
      expiresAt: integration.expiresAt || undefined,
    };
  }

  /**
   * Desconecta a integração
   */
  async disconnect(companyId: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.externalIntegration.update({
        where: {
          companyId_provider: { companyId, provider: this.PROVIDER },
        },
        data: {
          isActive: false,
          accessToken: null,
          refreshToken: null,
        },
      });

      this.logger.log(`Google Calendar disconnected for company ${companyId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to disconnect: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Renova o access token usando refresh token
   */
  private async refreshToken(companyId: string): Promise<boolean> {
    try {
      const integration = await this.prisma.externalIntegration.findUnique({
        where: {
          companyId_provider: { companyId, provider: this.PROVIDER },
        },
      });

      if (!integration?.refreshToken) {
        return false;
      }

      this.oauth2Client.setCredentials({
        refresh_token: integration.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      await this.prisma.externalIntegration.update({
        where: {
          companyId_provider: { companyId, provider: this.PROVIDER },
        },
        data: {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to refresh token: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtém access token válido
   */
  private async getValidToken(companyId: string): Promise<string | null> {
    const integration = await this.prisma.externalIntegration.findUnique({
      where: {
        companyId_provider: { companyId, provider: this.PROVIDER },
      },
    });

    if (!integration?.accessToken || !integration.isActive) {
      return null;
    }

    // Verificar expiração
    if (integration.expiresAt && new Date() > integration.expiresAt) {
      const refreshed = await this.refreshToken(companyId);
      if (!refreshed) return null;

      // Buscar token atualizado
      const updated = await this.prisma.externalIntegration.findUnique({
        where: {
          companyId_provider: { companyId, provider: this.PROVIDER },
        },
      });
      return updated?.accessToken || null;
    }

    return integration.accessToken;
  }

  /**
   * Lista eventos do calendário
   */
  async listEvents(
    companyId: string,
    options: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      calendarId?: string;
    } = {},
  ): Promise<CalendarEventResponse[]> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      throw new Error('Google Calendar não conectado');
    }

    const calendarId = options.calendarId || 'primary';
    const timeMin = options.timeMin || new Date();
    const timeMax = options.timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: String(options.maxResults || 50),
      singleEvents: 'true',
      orderBy: 'startTime',
      timeZone: 'America/Sao_Paulo', // Garantir timezone brasileiro
    });

    this.logger.log(`📅 Fetching calendar events: timeMin=${timeMin.toISOString()}, timeMax=${timeMax.toISOString()}`);

    const response = await fetch(
      `${this.CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list events: ${error}`);
    }

    const data = await response.json();
    this.logger.log(`📅 Calendar API returned ${data.items?.length || 0} events`);
    return data.items || [];
  }

  /**
   * Cria um evento no calendário
   */
  async createEvent(
    companyId: string,
    event: CalendarEvent,
    calendarId: string = 'primary',
  ): Promise<CalendarEventResponse> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      throw new Error('Google Calendar não conectado');
    }

    const startDate = event.start instanceof Date ? event.start : new Date(event.start);
    const endDate = event.end instanceof Date ? event.end : new Date(event.end);

    const eventBody = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: event.attendees?.map(email => ({ email })),
      reminders: event.reminders || {
        useDefault: true,
      },
    };

    const response = await fetch(
      `${this.CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create event: ${error}`);
    }

    const created = await response.json();
    this.logger.log(`Event created: ${created.id} - ${event.summary}`);
    return created;
  }

  /**
   * Atualiza um evento
   */
  async updateEvent(
    companyId: string,
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary',
  ): Promise<CalendarEventResponse> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      throw new Error('Google Calendar não conectado');
    }

    const updateBody: any = {};

    if (event.summary) updateBody.summary = event.summary;
    if (event.description) updateBody.description = event.description;
    if (event.location) updateBody.location = event.location;
    if (event.start) {
      const startDate = event.start instanceof Date ? event.start : new Date(event.start);
      updateBody.start = { dateTime: startDate.toISOString(), timeZone: 'America/Sao_Paulo' };
    }
    if (event.end) {
      const endDate = event.end instanceof Date ? event.end : new Date(event.end);
      updateBody.end = { dateTime: endDate.toISOString(), timeZone: 'America/Sao_Paulo' };
    }

    const response = await fetch(
      `${this.CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update event: ${error}`);
    }

    return await response.json();
  }

  /**
   * Deleta um evento
   */
  async deleteEvent(
    companyId: string,
    eventId: string,
    calendarId: string = 'primary',
  ): Promise<{ success: boolean }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      throw new Error('Google Calendar não conectado');
    }

    const response = await fetch(
      `${this.CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      throw new Error(`Failed to delete event: ${error}`);
    }

    return { success: true };
  }

  /**
   * Busca horários disponíveis (Free/Busy)
   */
  async getFreeBusy(
    companyId: string,
    timeMin: Date,
    timeMax: Date,
    calendarId: string = 'primary',
  ): Promise<{ busy: { start: string; end: string }[] }> {
    const token = await this.getValidToken(companyId);
    if (!token) {
      throw new Error('Google Calendar não conectado');
    }

    const response = await fetch(`${this.CALENDAR_API_URL}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get free/busy: ${error}`);
    }

    const data = await response.json();
    return { busy: data.calendars?.[calendarId]?.busy || [] };
  }

  /**
   * Cria evento de agendamento via secretária IA
   * Método simplificado para uso da IA
   */
  async scheduleAppointment(
    companyId: string,
    details: {
      title: string;
      description?: string;
      date: string; // formato: 'YYYY-MM-DD'
      time: string; // formato: 'HH:mm'
      duration: number; // em minutos
      customerName?: string;
      customerPhone?: string;
    },
  ): Promise<{
    success: boolean;
    event?: CalendarEventResponse;
    message: string;
  }> {
    try {
      const status = await this.getStatus(companyId);
      if (!status.connected) {
        return {
          success: false,
          message: 'Google Calendar não está conectado. Peça ao proprietário para configurar.',
        };
      }

      // Montar data/hora
      const [year, month, day] = details.date.split('-').map(Number);
      const [hour, minute] = details.time.split(':').map(Number);

      const startDate = new Date(year, month - 1, day, hour, minute);
      const endDate = new Date(startDate.getTime() + details.duration * 60 * 1000);

      // Verificar se horário está disponível
      const freeBusy = await this.getFreeBusy(companyId, startDate, endDate);
      if (freeBusy.busy.length > 0) {
        return {
          success: false,
          message: `Horário não disponível. Já existe um compromisso das ${freeBusy.busy[0].start} às ${freeBusy.busy[0].end}.`,
        };
      }

      // Criar evento
      const event = await this.createEvent(companyId, {
        summary: details.title,
        description: [
          details.description,
          details.customerName ? `Cliente: ${details.customerName}` : null,
          details.customerPhone ? `Telefone: ${details.customerPhone}` : null,
          'Agendado via Secretária IA',
        ]
          .filter(Boolean)
          .join('\n'),
        start: startDate,
        end: endDate,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 10 },
          ],
        },
      });

      const formattedDate = startDate.toLocaleDateString('pt-BR');
      const formattedTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      return {
        success: true,
        event,
        message: `✅ Agendamento confirmado para ${formattedDate} às ${formattedTime}!`,
      };
    } catch (error) {
      this.logger.error(`Failed to schedule appointment: ${error.message}`);
      return {
        success: false,
        message: `Erro ao agendar: ${error.message}`,
      };
    }
  }
}
