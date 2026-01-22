// Types for Contact Automation feature
import { ReactNode } from 'react';

export interface ContactAutomationField {
  id: string;
  profileId: string;
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  botPromptPatterns: string[];
  fieldType: 'text' | 'number' | 'cpf' | 'phone' | 'date';
  priority: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactAutomationSession {
  id: string;
  profileId: string;
  companyId: string;
  requestedBy: string;
  requestedFrom: string;
  originalQuery: string;
  status: 'pending' | 'navigating' | 'waiting_response' | 'completed' | 'failed' | 'timeout';
  objective: string;
  objectiveType?: string;
  navigationLog: NavigationLogEntry[];
  result?: string;
  resultSummary?: string;
  success: boolean;
  startedAt: string;
  completedAt?: string;
  expiresAt: string;
  lastBotMessage?: string;
  lastOurResponse?: string;
  lastActivityAt: string;
  messagesSent: number;
  messagesReceived: number;
  createdAt: string;
  profile?: ContactAutomationProfile;
}

export interface NavigationLogEntry {
  type: 'bot' | 'us';
  message: string;
  timestamp: string;
}

export interface ContactAutomationProfile {
  id: string;
  companyId: string;
  remoteJid: string;
  contactName: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType: 'menu' | 'free_text' | 'mixed';
  isActive: boolean;
  maxWaitSeconds: number;
  maxRetries: number;
  navigationHints?: string;
  createdAt: string;
  updatedAt: string;
  fields: ContactAutomationField[];
  menuOptions?: ContactAutomationMenuOption[];
  sessions?: ContactAutomationSession[];
  hasActiveSession?: boolean;
  activeSession?: ContactAutomationSession | null;
}

export interface AvailableContact {
  remoteJid: string;
  name: string;
  profilePicUrl?: string;
}

export interface ContactAutomationMenuOption {
  id: string;
  profileId: string;
  optionValue: string;
  optionLabel: string;
  optionDescription?: string;
  keywords: string[];
  priority: number;
  isExitOption: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileDto {
  remoteJid: string;
  contactName: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  fields?: CreateFieldDto[];
  menuOptions?: CreateMenuOptionDto[];
}

export interface CreateFieldDto {
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  botPromptPatterns?: string[];
  fieldType?: 'text' | 'number' | 'cpf' | 'phone' | 'date';
  priority?: number;
  isRequired?: boolean;
}

export interface CreateMenuOptionDto {
  optionValue: string;
  optionLabel: string;
  optionDescription?: string;
  keywords?: string[];
  priority?: number;
  isExitOption?: boolean;
}

export interface UpdateProfileDto {
  contactName?: string;
  contactNickname?: string;
  profilePicUrl?: string;
  description?: string;
  botType?: 'menu' | 'free_text' | 'mixed';
  maxWaitSeconds?: number;
  maxRetries?: number;
  isActive?: boolean;
}

// Field type options for UI
export const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'cpf', label: 'CPF' },
  { value: 'phone', label: 'Telefone' },
  { value: 'date', label: 'Data' },
] as const;

// Bot type options for UI
export const BOT_TYPES = [
  { value: 'menu', label: 'Menu com opções', description: 'Bot que mostra opções numeradas (ex: 1, 2, 3)' },
  { value: 'free_text', label: 'Texto livre', description: 'Bot que aceita texto livre' },
  { value: 'mixed', label: 'Misto', description: 'Bot que mistura menus e texto livre' },
] as const;

// Status labels and colors
export const SESSION_STATUS = {
  pending: { label: 'Aguardando', color: 'warning' as const },
  navigating: { label: 'Navegando', color: 'info' as const },
  waiting_response: { label: 'Aguardando resposta', color: 'info' as const },
  completed: { label: 'Concluído', color: 'success' as const },
  failed: { label: 'Falhou', color: 'error' as const },
  timeout: { label: 'Timeout', color: 'error' as const },
} as const;
