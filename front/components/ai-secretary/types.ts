"use client";

/**
 * Tipos para Secretária IA
 */

export interface AIConfig {
  id: string;
  enabled: boolean;
  mode: "passive" | "active" | "supervised";
  systemPrompt: string;
  temperature: number;
  ownerPhone: string | null;
  ownerName: string | null;
  businessHours: string | null;
  escalationWords: string | null;
  personality: string;
  testMode: boolean;
}

export interface AIStats {
  totalInteractions: number;
  approvedSuggestions: number;
  overrides: number;
  escalations: number;
  approvalRate: string;
  activeConversations: number;
}

export interface AIFormData {
  enabled: boolean;
  mode: "passive" | "active" | "supervised";
  systemPrompt: string;
  temperature: number;
  ownerPhone: string;
  ownerName: string;
  escalationWords: string;
  personality: string;
  testMode: boolean;
}

export interface Conversation {
  id: string;
  remoteJid: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  aiEnabled: boolean;
  summary: string | null;
  lastMessageAt: string;
  instanceName: string;
  instanceKey: string;
  contact: {
    id?: string;
    name: string;
    profilePicUrl: string | null;
  };
  recentMessages: Message[];
}

export interface Message {
  id: string;
  content: string;
  direction: string;
  createdAt: string;
  response: string | null;
}

export const INITIAL_FORM_DATA: AIFormData = {
  enabled: false,
  mode: "passive",
  systemPrompt: "",
  temperature: 0.7,
  ownerPhone: "",
  ownerName: "",
  escalationWords: "",
  personality: "professional",
  testMode: false,
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "urgent":
      return "error";
    case "high":
      return "warning";
    case "normal":
      return "info";
    case "low":
      return "default";
    default:
      return "default";
  }
};

export const formatPhone = (jid: string): string => {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
};
