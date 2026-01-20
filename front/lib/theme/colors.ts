"use client";

/**
 * Paleta de cores do tema
 * Baseado no design do WhatsApp
 */

export const colors = {
  // Cores primárias
  primary: {
    main: '#00a884',
    light: '#25d366',
    dark: '#008f6d',
    contrastText: '#ffffff',
  },

  // Cores de status
  success: {
    main: '#00a884',
    light: '#4cceac',
    dark: '#007a5e',
  },
  warning: {
    main: '#ffd279',
    light: '#ffe0a3',
    dark: '#e5b84d',
  },
  error: {
    main: '#f15c6d',
    light: '#f78c98',
    dark: '#d93d4f',
  },
  info: {
    main: '#53bdeb',
    light: '#7dcdf1',
    dark: '#2a9fd8',
  },

  // Cores de fundo - modo escuro
  dark: {
    background: {
      default: '#111b21',
      paper: '#202c33',
      elevated: '#2a3942',
    },
    text: {
      primary: '#e9edef',
      secondary: '#8696a0',
      disabled: '#667781',
    },
    divider: '#2a3942',
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.26)',
    },
  },

  // Cores de fundo - modo claro
  light: {
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
      elevated: '#f8f9fa',
    },
    text: {
      primary: '#111b21',
      secondary: '#667781',
      disabled: '#8696a0',
    },
    divider: '#e0e0e0',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
    },
  },

  // Cores do chat
  chat: {
    outgoing: {
      dark: '#005c4b',
      light: '#d9fdd3',
    },
    incoming: {
      dark: '#202c33',
      light: '#ffffff',
    },
  },
} as const;

export type Colors = typeof colors;
