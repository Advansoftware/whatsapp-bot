"use client";

/**
 * Paleta de cores do tema
 * Baseado no design do WhatsApp
 */

export const colors = {
  // Cores primárias - Viver de IA (Green/Teal Variant)
  primary: {
    main: '#00fe9b', // Neon Mint/Green (Electric, matches the 'vibe' but is green)
    light: '#69ffcc',
    dark: '#00cc7a',
    contrastText: '#090b11',
  },

  // Cores secundárias (Violet/Purple)
  secondary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },

  // Cores de status
  success: {
    main: '#00ff9d',
    light: '#6effcf',
    dark: '#00cc7d',
  },
  warning: {
    main: '#ffd279',
    light: '#ffe0a3',
    dark: '#e5b84d',
  },
  error: {
    main: '#ff4d4d', // More vibrant red
    light: '#ff8080',
    dark: '#cc0000',
  },
  info: {
    main: '#00fe9b', // Keeping consistent with primary
    light: '#69ffcc',
    dark: '#00cc7a',
  },

  // Cores de fundo - modo escuro (Viver de IA theme)
  dark: {
    background: {
      default: '#090b11', // Deep Navy/Black
      paper: '#0f131a', // Slightly lighter for simple surfaces
      elevated: '#151b24',
    },
    text: {
      primary: '#f5ffff', // Off-white with slight cyan tint
      secondary: '#94b8b8', // Muted cyan-grey
      disabled: '#4a5568',
    },
    divider: 'rgba(255, 255, 255, 0.1)', // Subtle glass border
    action: {
      hover: 'rgba(0, 254, 155, 0.08)', // Neon Green glow on hover
      selected: 'rgba(0, 254, 155, 0.16)',
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

  // Cores do chat (Updated for new theme)
  chat: {
    outgoing: {
      dark: '#005c3e', // Darker neon green
      light: '#d9fdd3',
    },
    incoming: {
      dark: '#151b24', // Matches elevated background
      light: '#ffffff',
    },
  },
} as const;

export type Colors = typeof colors;
