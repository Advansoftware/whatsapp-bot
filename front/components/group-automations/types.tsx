"use client";

import { ReactNode } from "react";
import { SportsSoccer, Description, Email, Webhook } from "@mui/icons-material";

/**
 * Tipos para automações de grupo
 */
export interface GroupAutomation {
  id: string;
  name: string;
  description?: string;
  groupRemoteJid?: string;
  groupNameMatch?: string;
  capturePattern?: string;
  actionType: string;
  actionConfig: any;
  startsAt?: string;
  expiresAt?: string;
  priority: number;
  shouldReply: boolean;
  replyOnlyOnce: boolean;
  skipAiAfter: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { collectedData: number };
}

export interface AvailableGroup {
  remoteJid: string;
  name: string;
  description?: string;
  pictureUrl?: string;
  participantsCount?: number;
  // Campos antigos para compatibilidade
  groupName?: string | null;
  groupDescription?: string | null;
}

export interface AutomationFormData {
  name: string;
  description: string;
  groupRemoteJid: string;
  groupNameMatch: string;
  capturePattern: string;
  actionType: string;
  actionConfig: any;
  startsAt: string;
  expiresAt: string;
  priority: number;
  shouldReply: boolean;
  replyOnlyOnce: boolean;
  skipAiAfter: boolean;
  isActive: boolean;
  // Helpers
  dataType: string;
  replyTemplate: string;
  webhookUrl: string;
}

export interface AutomationTemplate {
  title: string;
  description: string;
  icon: ReactNode;
  config: Partial<GroupAutomation> & {
    dataType?: string;
    replyTemplate?: string;
    webhookUrl?: string;
  };
}

/**
 * Tipos de ação disponíveis
 */
export const ACTION_TYPES = [
  {
    value: "collect_data",
    label: "Coletar Dados",
    description: "Captura dados das mensagens e salva no banco",
  },
  {
    value: "auto_reply",
    label: "Resposta Automática",
    description: "Responde automaticamente quando padrão é detectado",
  },
  {
    value: "webhook",
    label: "Webhook",
    description: "Envia dados para uma URL externa",
  },
  {
    value: "aggregate",
    label: "Agregar",
    description: "Soma, conta ou agrupa dados coletados",
  },
] as const;

/**
 * Tipos de dados para captura
 */
export const DATA_TYPES = [
  { value: "lottery_numbers", label: "Números de Loteria", pattern: "\\d+" },
  {
    value: "money",
    label: "Valores Monetários",
    pattern: "R?\\$?\\s*\\d+[.,]?\\d*",
  },
  {
    value: "phone",
    label: "Telefone",
    pattern: "\\(?\\d{2}\\)?\\s*\\d{4,5}[-.\\s]?\\d{4}",
  },
  {
    value: "email",
    label: "E-mail",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  },
  { value: "custom", label: "Padrão Customizado", pattern: "" },
] as const;

/**
 * Templates pré-definidos de automação
 */
export const PREDEFINED_TEMPLATES: AutomationTemplate[] = [
  {
    title: "Bolão de Futebol/Loteria",
    description: "Coleta palpites ou números enviados no grupo.",
    icon: <SportsSoccer fontSize="large" />,
    config: {
      name: "Bolão da Rodada",
      description: "Coleta palpites de jogos enviados no grupo",
      actionType: "collect_data",
      dataType: "lottery_numbers",
      shouldReply: true,
      replyOnlyOnce: false,
      replyTemplate:
        "✅ Palpite registrado!\n👤 {{participantName}}\n🔢 {{numbers}}",
      isActive: true,
    },
  },
  {
    title: "Lista de Presença",
    description: "Conta quantas pessoas confirmaram presença.",
    icon: <Description fontSize="large" />,
    config: {
      name: "Lista de Presença",
      description: "Contagem de participantes para evento",
      actionType: "aggregate",
      capturePattern: "(eu vou|tô dentro|confirmado|presente)",
      shouldReply: true,
      replyTemplate: "📝 Presença confirmada! Total: {{count}}",
      isActive: true,
    },
  },
  {
    title: "Captura de Emails",
    description: "Salva endereços de e-mail enviados no chat.",
    icon: <Email fontSize="large" />,
    config: {
      name: "Captura de Leads",
      description: "Coleta e-mails de potenciais clientes",
      actionType: "collect_data",
      dataType: "email",
      shouldReply: true,
      replyOnlyOnce: true,
      replyTemplate: "📧 Email recebido! Entraremos em contato.",
      isActive: true,
    },
  },
  {
    title: "Integração Externa",
    description:
      "Envia todas as mensagens para um sistema externo via Webhook.",
    icon: <Webhook fontSize="large" />,
    config: {
      name: "Integração CRM",
      description: "Envia mensagens para CRM externo",
      actionType: "webhook",
      webhookUrl: "https://api.seucrm.com/webhook/whatsapp",
      shouldReply: false,
      isActive: true,
    },
  },
];

/**
 * Estado inicial do formulário
 */
export const INITIAL_FORM_DATA: AutomationFormData = {
  name: "",
  description: "",
  groupRemoteJid: "",
  groupNameMatch: "",
  capturePattern: "",
  actionType: "collect_data",
  actionConfig: {},
  startsAt: "",
  expiresAt: "",
  priority: 0,
  shouldReply: true,
  replyOnlyOnce: false,
  skipAiAfter: true,
  isActive: true,
  dataType: "lottery_numbers",
  replyTemplate:
    "✅ Dados registrados!\n👤 {{participantName}}\n📊 {{numbers}}",
  webhookUrl: "",
};
