"use client";

import { BreakpointsOptions } from '@mui/material/styles';

/**
 * Breakpoints responsivos do tema
 * Seguindo as convenções do MUI
 */
export const breakpoints: BreakpointsOptions = {
  values: {
    xs: 0,      // mobile phones (portrait)
    sm: 600,    // mobile phones (landscape) / small tablets
    md: 900,    // tablets
    lg: 1200,   // desktops
    xl: 1536,   // large desktops
  },
};

/**
 * Helpers para uso com responsive props do MUI
 * Exemplo: sx={{ display: { xs: 'none', md: 'block' } }}
 */
export const responsiveHelpers = {
  // Esconde em mobile (xs e sm)
  hideOnMobile: {
    display: { xs: 'none', md: 'flex' },
  },
  // Mostra apenas em mobile
  showOnlyOnMobile: {
    display: { xs: 'flex', md: 'none' },
  },
  // Esconde apenas em celular (xs)
  hideOnPhone: {
    display: { xs: 'none', sm: 'flex' },
  },
  // Mostra apenas em celular (xs)
  showOnlyOnPhone: {
    display: { xs: 'flex', sm: 'none' },
  },
} as const;
