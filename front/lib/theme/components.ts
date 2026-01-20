"use client";

import { Components, Theme } from '@mui/material/styles';
import { colors } from './colors';

/**
 * Overrides de componentes MUI
 */
export const getComponents = (mode: 'light' | 'dark'): Components<Theme> => ({
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        margin: 0,
        padding: 0,
      },
      body: {
        margin: 0,
        padding: 0,
        backgroundColor: mode === 'dark' ? colors.dark.background.default : colors.light.background.default,
      },
      // Scrollbar styling
      '::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'dark' ? '#0b141a' : '#f1f1f1',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'dark' ? '#374045' : '#c1c1c1',
        borderRadius: '3px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: mode === 'dark' ? '#4a5568' : '#a1a1a1',
      },
      // Selection styling
      '::selection': {
        backgroundColor: 'rgba(0, 168, 132, 0.3)',
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 16px',
      },
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '0.8125rem',
      },
      sizeLarge: {
        padding: '12px 24px',
        fontSize: '1rem',
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: 'none', // Remove default MUI overlay in dark mode
      },
      rounded: {
        borderRadius: 12,
      },
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 12,
        border: '1px solid',
        borderColor: mode === 'dark' ? colors.dark.divider : colors.light.divider,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottomColor: mode === 'dark' ? colors.dark.divider : colors.light.divider,
      },
      head: {
        fontWeight: 600,
        backgroundColor: mode === 'dark' ? '#182329' : '#f8f9fa',
        color: mode === 'dark' ? colors.dark.text.secondary : colors.light.text.secondary,
        borderBottom: `1px solid ${mode === 'dark' ? colors.dark.divider : colors.light.divider}`,
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 16,
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: `1px solid ${mode === 'dark' ? colors.dark.divider : colors.light.divider}`,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        marginBottom: 4,
        '&.Mui-selected': {
          backgroundColor: colors.primary.main,
          color: colors.primary.contrastText,
          '&:hover': {
            backgroundColor: colors.primary.dark,
          },
          '& .MuiListItemIcon-root': {
            color: 'inherit',
          },
        },
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: 6,
        fontSize: '0.75rem',
      },
    },
  },
  MuiSkeleton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  // MUI 7 - Grid2 is now Grid
  MuiGrid: {
    defaultProps: {
      spacing: 2,
    },
  },
});
