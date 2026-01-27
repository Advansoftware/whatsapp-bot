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
        scrollBehavior: 'smooth',
      },
      body: {
        margin: 0,
        padding: 0,
        // Radial gradient spotlight effect + base background
        background: mode === 'dark'
          ? `radial-gradient(circle at 50% -20%, ${colors.primary.main}10 0%, ${colors.dark.background.default} 60%), ${colors.dark.background.default}`
          : colors.light.background.default,
        backgroundAttachment: 'fixed', // Prevent gradient from scrolling away
      },
      // Scrollbar styling
      '::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '::-webkit-scrollbar-track': {
        background: mode === 'dark' ? '#0b141a' : '#f1f1f1',
      },
      '::-webkit-scrollbar-thumb': {
        background: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#c1c1c1',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: mode === 'dark' ? colors.primary.main : '#a1a1a1', // Glow on hover
      },
      // Selection styling
      '::selection': {
        backgroundColor: `${colors.primary.main}40`,
        color: colors.primary.contrastText,
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
        padding: '10px 20px', // Slightly larger
        fontWeight: 600,
        textTransform: 'none',
        transition: 'all 0.2s ease-in-out',
      },
      containedPrimary: {
        background: `linear-gradient(45deg, ${colors.primary.dark} 30%, ${colors.primary.main} 90%)`,
        color: colors.primary.contrastText,
        boxShadow: `0 0 15px ${colors.primary.main}40`, // Soft glow
        '&:hover': {
          boxShadow: `0 0 25px ${colors.primary.main}60`, // Stronger glow
          transform: 'translateY(-1px)',
        },
      },
      outlinedPrimary: {
        borderColor: colors.primary.main,
        color: colors.primary.main,
        '&:hover': {
          borderColor: colors.primary.light,
          backgroundColor: `${colors.primary.main}10`,
          boxShadow: `0 0 10px ${colors.primary.main}20`,
        },
      },
      sizeSmall: {
        padding: '6px 14px',
        fontSize: '0.8125rem',
      },
      sizeLarge: {
        padding: '14px 28px',
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
        backgroundImage: 'none',
      },
      rounded: {
        borderRadius: 16,
      },
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        borderRadius: 16,
        background: mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#ffffff', // Glass effect
        backdropFilter: mode === 'dark' ? 'blur(24px)' : 'none',
        border: '1px solid',
        borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : colors.light.divider,
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : colors.light.divider,
          background: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
          transform: 'translateY(-2px)',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottomColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : colors.light.divider,
        padding: '16px',
      },
      head: {
        fontWeight: 600,
        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f8f9fa',
        color: mode === 'dark' ? colors.dark.text.primary : colors.light.text.secondary,
        borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : colors.light.divider}`,
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
          '& fieldset': {
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.23)',
          },
          '&:hover fieldset': {
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.87)',
          },
          '&.Mui-focused fieldset': {
            borderColor: colors.primary.main,
            boxShadow: `0 0 8px ${colors.primary.main}40`,
          },
        },
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
      },
      filled: {
        border: '1px solid transparent',
      },
      outlined: {
        borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : undefined,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 20,
        background: mode === 'dark' ? '#0f131a' : '#ffffff',
        border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        fontWeight: 700,
        fontSize: '1.25rem',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: mode === 'dark' ? colors.dark.background.default : colors.light.background.default,
        borderRight: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : colors.light.divider}`,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        marginBottom: 6,
        marginLeft: 8,
        marginRight: 8,
        padding: '10px 16px',
        transition: 'all 0.2s',
        '&.Mui-selected': {
          backgroundColor: colors.primary.main, // Cyan background
          color: colors.primary.contrastText, // Dark text
          boxShadow: `0 0 15px ${colors.primary.main}40`, // Glow
          '&:hover': {
            backgroundColor: colors.primary.light,
          },
          '& .MuiListItemIcon-root': {
            color: 'inherit',
          },
          '& .MuiTypography-root': {
            fontWeight: 600,
          }
        },
        '&:hover': {
          backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        }
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
