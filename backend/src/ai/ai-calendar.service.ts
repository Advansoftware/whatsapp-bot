import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleCalendarService } from '../integrations/google-calendar.service';

interface CalendarQuery {
  messageContent: string;
  companyId: string;
  contactName?: string;
  contactPhone?: string;
}

interface CalendarActionResult {
  handled: boolean;
  response?: string;
  action?: 'list_events' | 'schedule' | 'check_availability' | 'none';
}

@Injectable()
export class AICalendarService {
  private readonly logger = new Logger(AICalendarService.name);
  private genAI: GoogleGenerativeAI;
  private readonly MODEL_NAME: string;

  constructor(
    private readonly config: ConfigService,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {
    const apiKey = this.config.get('GEMINI_API_KEY');
    this.genAI = new GoogleGenerativeAI(apiKey || '');
    this.MODEL_NAME = this.config.get('GEMINI_MODEL') || 'gemini-2.0-flash';
  }

  /**
   * Verifica se a mensagem é relacionada a calendário e processa
   */
  async processCalendarQuery(query: CalendarQuery): Promise<CalendarActionResult> {
    try {
      // Primeiro, verificar se o Google Calendar está conectado
      const status = await this.googleCalendarService.getStatus(query.companyId);
      if (!status.connected) {
        return { handled: false };
      }

      // Analisar se a mensagem é sobre calendário
      const calendarIntent = await this.detectCalendarIntent(query.messageContent);

      if (!calendarIntent.isCalendarRelated) {
        return { handled: false };
      }

      this.logger.log(`Calendar intent detected: ${calendarIntent.action}`);

      // Executar ação baseada na intenção
      switch (calendarIntent.action) {
        case 'list_events':
          return await this.handleListEvents(query, calendarIntent);

        case 'schedule':
          return await this.handleScheduleRequest(query, calendarIntent);

        case 'check_availability':
          return await this.handleCheckAvailability(query, calendarIntent);

        default:
          return { handled: false };
      }
    } catch (error) {
      this.logger.error(`Calendar query processing failed: ${error.message}`);
      return { handled: false };
    }
  }

  /**
   * Detecta se a mensagem é sobre calendário
   * OTIMIZADO: Usa detecção local por padrões para consultas simples (evita chamada à IA)
   */
  private async detectCalendarIntent(messageContent: string): Promise<{
    isCalendarRelated: boolean;
    action: 'list_events' | 'schedule' | 'check_availability' | 'none';
    date?: string;
    time?: string;
    duration?: number;
    title?: string;
  }> {
    const lowerMessage = messageContent.toLowerCase().trim();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // ========================================
    // DETECÇÃO RÁPIDA LOCAL (sem IA) - economiza créditos
    // ========================================

    // Padrões para listar agenda de HOJE
    const todayListPatterns = [
      /\b(minha\s+)?agenda\s*(de\s+)?hoje\b/,
      /\bhoje\s*(tem\s+)?(algo|compromisso|evento|reunião)\b/,
      /\bo\s+que\s+(eu\s+)?tenho\s+hoje\b/,
      /\btem\s+algo\s+(na\s+)?(minha\s+)?agenda\s*(de\s+)?hoje\b/,
      /\bcompromissos?\s*(de\s+)?hoje\b/,
      /\breunião\s*(de\s+)?hoje\b/,
      /\beverificar?\s*(minha\s+)?agenda\b/,
      /\bver\s*(minha\s+)?agenda\b/,
      /\bcomo\s+(tá|está)\s+(minha\s+)?agenda\b/,
      /\bquais?\s+(são\s+)?(os\s+)?(meus\s+)?compromissos\b/,
    ];

    for (const pattern of todayListPatterns) {
      if (pattern.test(lowerMessage)) {
        this.logger.log(`📅 Quick detection: list_events for today (pattern match)`);
        return {
          isCalendarRelated: true,
          action: 'list_events',
          date: todayStr,
        };
      }
    }

    // Padrões para listar agenda de AMANHÃ
    const tomorrowListPatterns = [
      /\b(minha\s+)?agenda\s*(de\s+)?amanhã\b/,
      /\bamanhã\s*(tem\s+)?(algo|compromisso|evento|reunião)\b/,
      /\bo\s+que\s+(eu\s+)?tenho\s+amanhã\b/,
      /\bcompromissos?\s*(de\s+)?amanhã\b/,
    ];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const pattern of tomorrowListPatterns) {
      if (pattern.test(lowerMessage)) {
        this.logger.log(`📅 Quick detection: list_events for tomorrow (pattern match)`);
        return {
          isCalendarRelated: true,
          action: 'list_events',
          date: tomorrowStr,
        };
      }
    }

    // Padrões para verificar disponibilidade
    const availabilityPatterns = [
      /\b(tem\s+)?horário\s*(livre|disponível)\b/,
      /\bdisponibilidade\b/,
      /\bquando\s+(você\s+)?(está|tá)\s+livre\b/,
    ];

    for (const pattern of availabilityPatterns) {
      if (pattern.test(lowerMessage)) {
        // Detectar data
        let dateStr = todayStr;
        if (lowerMessage.includes('amanhã')) {
          dateStr = tomorrowStr;
        }
        this.logger.log(`📅 Quick detection: check_availability (pattern match)`);
        return {
          isCalendarRelated: true,
          action: 'check_availability',
          date: dateStr,
        };
      }
    }

    // Padrões para agendar
    const schedulePatterns = [
      /\b(quero\s+)?agendar\b/,
      /\b(quero\s+)?marcar\b/,
      /\bcria(r)?\s+(um\s+)?(evento|compromisso|reunião)\b/,
    ];

    for (const pattern of schedulePatterns) {
      if (pattern.test(lowerMessage)) {
        this.logger.log(`📅 Quick detection: schedule (pattern match)`);
        // Para agendamento, precisa extrair mais dados - usar IA
        return await this.detectCalendarIntentWithAI(messageContent);
      }
    }

    // ========================================
    // Palavras-chave que TALVEZ sejam sobre calendário - usar IA
    // ========================================
    const maybeCalendarKeywords = [
      'agenda', 'compromisso', 'evento', 'reunião', 'horário',
      'calendário', 'consulta', 'atendimento', 'schedule', 'meeting'
    ];

    const hasKeyword = maybeCalendarKeywords.some(kw => lowerMessage.includes(kw));

    if (!hasKeyword) {
      return { isCalendarRelated: false, action: 'none' };
    }

    // Só usa IA para casos mais complexos
    return await this.detectCalendarIntentWithAI(messageContent);
  }

  /**
   * Usa IA para detectar intenção de calendário (casos complexos)
   */
  private async detectCalendarIntentWithAI(messageContent: string): Promise<{
    isCalendarRelated: boolean;
    action: 'list_events' | 'schedule' | 'check_availability' | 'none';
    date?: string;
    time?: string;
    duration?: number;
    title?: string;
  }> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.MODEL_NAME,
        generationConfig: { temperature: 0.1 }
      });

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const prompt = `Analise esta mensagem e determine se é sobre calendário/agenda.

MENSAGEM: "${messageContent}"

DATA DE HOJE: ${todayStr} (${today.toLocaleDateString('pt-BR', { weekday: 'long' })})

Responda APENAS JSON:
{
  "isCalendarRelated": boolean,
  "action": "list_events" | "schedule" | "check_availability" | "none",
  "date": "YYYY-MM-DD" ou null (se mencionou "hoje" = ${todayStr}),
  "time": "HH:mm" ou null,
  "duration": número em minutos ou null,
  "title": "título do evento" ou null
}

REGRAS:
- "hoje tem algo?" -> list_events, date: hoje
- "amanhã" -> adicionar 1 dia
- "quero agendar" -> schedule
- "tem horário livre?" -> check_availability
- Perguntas sobre compromissos/eventos -> list_events`;

      const result = await model.generateContent(prompt);
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error(`Calendar intent detection failed: ${error.message}`);
    }

    return { isCalendarRelated: false, action: 'none' };
  }

  /**
   * Converte uma data para o timezone de São Paulo ajustando para UTC
   * São Paulo é UTC-3 (ou UTC-2 no horário de verão, mas Brasil não usa mais)
   */
  private getDateInSaoPauloTimezone(date: Date, startOfDay: boolean): Date {
    // São Paulo é UTC-3
    const SAO_PAULO_OFFSET_HOURS = 3;

    const result = new Date(date);
    if (startOfDay) {
      // 00:00 em São Paulo = 03:00 UTC
      result.setUTCHours(SAO_PAULO_OFFSET_HOURS, 0, 0, 0);
    } else {
      // 23:59:59 em São Paulo = 02:59:59 UTC do dia seguinte
      result.setUTCDate(result.getUTCDate() + 1);
      result.setUTCHours(SAO_PAULO_OFFSET_HOURS - 1, 59, 59, 999);
    }
    return result;
  }

  /**
   * Lista eventos do calendário
   */
  private async handleListEvents(
    query: CalendarQuery,
    intent: any
  ): Promise<CalendarActionResult> {
    try {
      // Criar data base
      let targetDate: Date;

      if (intent.date) {
        // Parse manual para evitar problemas de timezone
        const [year, month, day] = intent.date.split('-').map(Number);
        // Criar data em UTC com o dia correto
        targetDate = new Date(Date.UTC(year, month - 1, day));
      } else {
        // Pegar a data atual em São Paulo
        // Ajustar: se estamos em UTC, precisamos saber que dia é em São Paulo
        const now = new Date();
        // São Paulo é UTC-3, então subtraímos 3 horas do UTC para saber a data local
        const saoPauloNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        targetDate = new Date(Date.UTC(
          saoPauloNow.getUTCFullYear(),
          saoPauloNow.getUTCMonth(),
          saoPauloNow.getUTCDate()
        ));
      }

      // Buscar eventos do dia considerando timezone de São Paulo
      // 00:00 São Paulo = 03:00 UTC do mesmo dia
      // 23:59 São Paulo = 02:59 UTC do dia seguinte
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(3, 0, 0, 0); // 00:00 em São Paulo

      const endOfDay = new Date(targetDate);
      endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
      endOfDay.setUTCHours(2, 59, 59, 999); // 23:59:59 em São Paulo

      this.logger.log(`📅 Listing events from ${startOfDay.toISOString()} to ${endOfDay.toISOString()} (São Paulo timezone)`);

      const events = await this.googleCalendarService.listEvents(query.companyId, {
        timeMin: startOfDay,
        timeMax: endOfDay,
        maxResults: 20,
      });

      this.logger.log(`📅 Found ${events.length} events`);

      // Formatar resposta
      const dateStr = targetDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      if (events.length === 0) {
        return {
          handled: true,
          action: 'list_events',
          response: `📅 Sua agenda para ${dateStr} está livre! Nenhum compromisso marcado. 😊`,
        };
      }

      let response = `📅 *Sua agenda para ${dateStr}:*\n\n`;

      for (const event of events) {
        // Tratar eventos de dia inteiro (sem dateTime, apenas date)
        let timeStr: string;

        if (event.start.dateTime) {
          const startTime = new Date(event.start.dateTime);
          const endTime = new Date(event.end.dateTime);
          timeStr = `${startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} - ${endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
        } else {
          timeStr = 'Dia inteiro';
        }

        response += `⏰ *${timeStr}*\n`;
        response += `   📌 ${event.summary}\n`;
        if (event.location) {
          response += `   📍 ${event.location}\n`;
        }
        response += '\n';
      }

      response += `Total: ${events.length} compromisso(s)`;

      return {
        handled: true,
        action: 'list_events',
        response,
      };
    } catch (error) {
      this.logger.error(`List events failed: ${error.message}`);
      return {
        handled: true,
        action: 'list_events',
        response: 'Desculpa, tive um problema ao acessar a agenda. Tenta de novo? 😅',
      };
    }
  }

  /**
   * Processa solicitação de agendamento
   */
  private async handleScheduleRequest(
    query: CalendarQuery,
    intent: any
  ): Promise<CalendarActionResult> {
    // Se não tem todos os dados necessários, pedir mais informações
    if (!intent.date || !intent.time || !intent.title) {
      let missingInfo: string[] = [];
      if (!intent.date) missingInfo.push('a data');
      if (!intent.time) missingInfo.push('o horário');
      if (!intent.title) missingInfo.push('o título/descrição');

      return {
        handled: true,
        action: 'schedule',
        response: `Claro! Pra eu agendar, preciso de algumas informações:\n\n` +
          `📝 Me diz ${missingInfo.join(', ')} do compromisso.\n\n` +
          `Exemplo: "Agendar reunião com cliente às 14h amanhã"`,
      };
    }

    // Tentar agendar
    try {
      const result = await this.googleCalendarService.scheduleAppointment(query.companyId, {
        title: intent.title,
        date: intent.date,
        time: intent.time,
        duration: intent.duration || 60,
        customerName: query.contactName,
        customerPhone: query.contactPhone,
      });

      return {
        handled: true,
        action: 'schedule',
        response: result.message,
      };
    } catch (error) {
      this.logger.error(`Schedule failed: ${error.message}`);
      return {
        handled: true,
        action: 'schedule',
        response: 'Ops, não consegui agendar. Tenta de novo com as informações: data, horário e descrição. 😊',
      };
    }
  }

  /**
   * Verifica disponibilidade
   */
  private async handleCheckAvailability(
    query: CalendarQuery,
    intent: any
  ): Promise<CalendarActionResult> {
    try {
      // Criar data base considerando timezone de São Paulo
      let targetDate: Date;

      if (intent.date) {
        const [year, month, day] = intent.date.split('-').map(Number);
        targetDate = new Date(Date.UTC(year, month - 1, day));
      } else {
        const now = new Date();
        const saoPauloNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        targetDate = new Date(Date.UTC(
          saoPauloNow.getUTCFullYear(),
          saoPauloNow.getUTCMonth(),
          saoPauloNow.getUTCDate()
        ));
      }

      // Horário comercial: 8h às 18h em São Paulo
      // 8h São Paulo = 11h UTC
      // 18h São Paulo = 21h UTC
      const startTime = new Date(targetDate);
      startTime.setUTCHours(11, 0, 0, 0); // 8h São Paulo

      const endTime = new Date(targetDate);
      endTime.setUTCHours(21, 0, 0, 0); // 18h São Paulo

      const freeBusy = await this.googleCalendarService.getFreeBusy(
        query.companyId,
        startTime,
        endTime,
      );

      const dateStr = targetDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Sao_Paulo'
      });

      if (freeBusy.busy.length === 0) {
        return {
          handled: true,
          action: 'check_availability',
          response: `✅ ${dateStr} está completamente livre das 8h às 18h! Qual horário prefere?`,
        };
      }

      // Calcular horários livres
      let response = `📅 *Disponibilidade para ${dateStr}:*\n\n`;
      response += `❌ *Horários ocupados:*\n`;

      for (const slot of freeBusy.busy) {
        const start = new Date(slot.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        const end = new Date(slot.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        response += `   ${start} - ${end}\n`;
      }

      response += `\n💡 Os demais horários estão livres! Me diz qual prefere.`;

      return {
        handled: true,
        action: 'check_availability',
        response,
      };
    } catch (error) {
      this.logger.error(`Check availability failed: ${error.message}`);
      return {
        handled: true,
        action: 'check_availability',
        response: 'Não consegui verificar a disponibilidade. Tenta de novo? 😊',
      };
    }
  }
}
