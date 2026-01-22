// Types for External Webhook feature

export interface WebhookContact {
  id: string;
  companyId: string;
  name: string;
  remoteJid: string;
  isActive: boolean;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WebhookLog {
  id: string;
  companyId: string;
  source: string | null;
  payload: Record<string, unknown>;
  headers: Record<string, string> | null;
  status: 'received' | 'processed' | 'failed';
  error: string | null;
  createdAt: string;
}

export interface WebhookConfig {
  id: string;
  companyId: string;
  messageTemplate: string;
  logEnabled: boolean;
  secretToken: string | null;
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookContactDto {
  name: string;
  remoteJid: string;
  isActive?: boolean;
  categories?: string[];
}

export interface UpdateWebhookContactDto {
  name?: string;
  isActive?: boolean;
  categories?: string[];
}

export interface UpdateWebhookConfigDto {
  messageTemplate?: string;
  logEnabled?: boolean;
  secretToken?: string;
}
