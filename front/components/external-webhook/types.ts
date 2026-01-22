// Types for External Webhook feature

// Aplicação de webhook (Coolify, GitHub, Jellyfin, etc.)
export interface WebhookApplication {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  isActive: boolean;
  allowedOrigins: string[];
  secretToken: string | null;
  logEnabled: boolean;
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
  events?: WebhookEvent[];
  _count?: {
    logs: number;
    events: number;
  };
}

// Evento configurável
export interface WebhookEvent {
  id: string;
  applicationId: string;
  name: string;
  description: string | null;
  eventField: string;
  eventValue: string;
  messageTemplate: string;
  contactIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Log de webhook
export interface WebhookApplicationLog {
  id: string;
  applicationId: string;
  payload: Record<string, unknown>;
  headers: Record<string, string> | null;
  matchedEventId: string | null;
  matchedEventName: string | null;
  matchedEvent?: { id: string; name: string } | null;
  status: 'received' | 'matched' | 'sent' | 'no_match' | 'failed' | 'SUCCESS' | 'ERROR' | 'NO_MATCH';
  error: string | null;
  errorMessage?: string | null;
  sourceIp?: string | null;
  messagesSent: number;
  createdAt: string;
}

// Contato global
export interface WebhookContact {
  id: string;
  companyId: string;
  name: string;
  remoteJid: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTOs
export interface CreateWebhookAppDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateWebhookAppDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
  logEnabled?: boolean;
  allowedOrigins?: string[];
  secretToken?: string;
}

export interface CreateWebhookEventDto {
  name: string;
  description?: string;
  eventField: string;
  eventValue: string;
  messageTemplate: string;
  contactIds?: string[];
}

export interface UpdateWebhookEventDto {
  name?: string;
  description?: string;
  eventField?: string;
  eventValue?: string;
  messageTemplate?: string;
  contactIds?: string[];
  isActive?: boolean;
}

export interface CreateWebhookContactDto {
  name: string;
  remoteJid: string;
  isActive?: boolean;
}

export interface UpdateWebhookContactDto {
  name?: string;
  isActive?: boolean;
}



