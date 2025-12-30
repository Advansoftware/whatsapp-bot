import { createTheme } from '@mui/material/styles';

// Colors based on the provided design
export const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#00a884', // WhatsApp Green
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'dark' ? '#111b21' : '#f0f2f5',
      paper: mode === 'dark' ? '#202c33' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#e9edef' : '#111b21',
      secondary: mode === 'dark' ? '#8696a0' : '#667781',
    },
    success: {
      main: '#00a884',
    },
    warning: {
      main: '#ffd279',
    },
    error: {
      main: '#f15c6d',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove default MUI overlay in dark mode
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: mode === 'dark' ? '#2a3942' : '#e0e0e0',
        },
        head: {
          fontWeight: 600,
          backgroundColor: mode === 'dark' ? '#182329' : '#f8f9fa',
          color: mode === 'dark' ? '#8696a0' : '#667781',
          borderBottom: `1px solid ${mode === 'dark' ? '#2a3942' : '#e0e0e0'}`,
        }
      }
    }
  },
});