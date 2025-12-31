import React, { useMemo } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
} from "@mui/material";
import { getTheme } from "./theme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardView from "./components/DashboardView";
import ConnectionsView from "./components/ConnectionsView";
import InventoryView from "./components/InventoryView";
import SettingsView from "./components/SettingsView";
import PlaceholderView from "./components/PlaceholderView";
import LandingPage from "./components/LandingPage";
import LoginView from "./components/LoginView";
import { View } from "./types";
import LiveChatView from "./components/chat/LiveChatView";
import ChatbotView from "./components/chatbot/ChatbotView";
import AISecretaryView from "./components/ai-secretary/AISecretaryView";
import ContactsView from "./components/crm/ContactsView";
import CampaignsView from "./components/campaigns/CampaignsView";
import AnalyticsView from "./components/analytics/AnalyticsView";

// Fallback to placeholder if env var missing to prevent crash
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder_client_id";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showLogin, setShowLogin] = React.useState(false);
  const [mode, setMode] = React.useState<"light" | "dark">("dark");
  const [currentView, setCurrentView] = React.useState<View>("dashboard");
  const [selectedChatFromDashboard, setSelectedChatFromDashboard] =
    React.useState<any>(null);

  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const handleNavigateToChat = (conversation: any) => {
    setSelectedChatFromDashboard({
      remoteJid: conversation.remoteJid,
      contact: conversation.contact,
      instanceKey: conversation.instanceKey || conversation.instanceName,
      profilePicUrl: conversation.profilePicUrl,
    });
    setCurrentView("livechat");
  };

  // Clear selected chat when navigating away from livechat
  React.useEffect(() => {
    if (currentView !== "livechat") {
      setSelectedChatFromDashboard(null);
    }
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <DashboardView onNavigateToChat={handleNavigateToChat} />;
      case "connections":
        return <ConnectionsView />;
      case "inventory":
        return <InventoryView />;
      case "settings":
        return <SettingsView />;
      case "chatbot":
        return <ChatbotView />;
      case "livechat":
        return <LiveChatView initialChat={selectedChatFromDashboard} />;
      case "ai-secretary":
        return <AISecretaryView />;
      case "crm":
        return <ContactsView />;
      case "campaigns":
        return <CampaignsView />;
      case "analytics":
        return <AnalyticsView />;
      case "subscription":
        return <PlaceholderView title="Gerenciamento de Assinatura" />;
      default:
        return <DashboardView onNavigateToChat={handleNavigateToChat} />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          minHeight="100vh"
          bgcolor="background.default"
          alignItems="center"
          justifyContent="center"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  // Auth Flow
  if (isAuthenticated) {
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
            <Header toggleTheme={toggleTheme} isDarkMode={mode === "dark"} />

            <Box flex={1} overflow="auto" p={{ xs: 2, md: 4 }}>
              {renderView()}
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  // Login/Landing Flow
  if (showLogin) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginView />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LandingPage onLoginClick={() => setShowLogin(true)} />
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
