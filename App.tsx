import React, { useState, useMemo } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { getTheme } from './theme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import ConnectionsView from './components/ConnectionsView';
import InventoryView from './components/InventoryView';
import SettingsView from './components/SettingsView';
import PlaceholderView from './components/PlaceholderView';
import LandingPage from './components/LandingPage';
import LoginView from './components/LoginView';
import { View } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'connections': return <ConnectionsView />;
      case 'inventory': return <InventoryView />;
      case 'settings': return <SettingsView />;
      case 'chatbot': return <PlaceholderView title="Fluxos de Chatbot" />;
      case 'livechat': return <PlaceholderView title="Chat Ao Vivo" />;
      case 'subscription': return <PlaceholderView title="Gerenciamento de Assinatura" />;
      default: return <DashboardView />;
    }
  };

  // Auth Flow
  if (!isAuthenticated) {
    if (showLogin) {
      return (
        <LoginView 
          onLoginSuccess={() => setIsAuthenticated(true)} 
        />
      );
    }
    return (
      <LandingPage 
        onLoginClick={() => setShowLogin(true)} 
      />
    );
  }

  // Dashboard Flow
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display="flex" minHeight="100vh" bgcolor="background.default">
        <Sidebar 
          open={true} 
          onClose={() => {}} 
          currentView={currentView}
          onNavigate={setCurrentView}
        />
        
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <Header toggleTheme={toggleTheme} isDarkMode={mode === 'dark'} />
          
          <Box flex={1} overflow="auto" p={{ xs: 2, md: 4 }}>
            {renderView()}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;