"use client";

import { createTheme, ThemeOptions } from '@mui/material/styles';
import { colors } from './colors';
import { typography } from './typography';
import { getComponents } from './components';
import { breakpoints } from './breakpoints';

/**
 * Gera as opções do tema baseado no modo (light/dark)
 */
const getThemeOptions = (mode: 'light' | 'dark'): ThemeOptions => {
  const modeColors = mode === 'dark' ? colors.dark : colors.light;

  return {
    palette: {
      mode,
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      info: colors.info,
      background: modeColors.background,
      text: modeColors.text,
      divider: modeColors.divider,
      action: modeColors.action,
    },
    typography,
    breakpoints,
    components: getComponents(mode),
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
  };
};

/**
 * Cria o tema MUI com base no modo
 */
export const getTheme = (mode: 'light' | 'dark') => createTheme(getThemeOptions(mode));

/**
 * Temas pré-criados para uso direto
 */
export const darkTheme = createTheme(getThemeOptions('dark'));
export const lightTheme = createTheme(getThemeOptions('light'));

// Re-export para facilitar imports
export { colors } from './colors';
export { typography } from './typography';
export { breakpoints, responsiveHelpers } from './breakpoints';
