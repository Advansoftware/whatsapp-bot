import React from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Dashboard,
  Cable,
  Inventory,
  Settings,
  SmartToy,
  Chat,
  CreditCard,
  Logout,
  Psychology,
  Contacts,
  Campaign,
  BarChart,
} from "@mui/icons-material";
import { View } from "../types";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentView: View;
  onNavigate: (view: View) => void;
}

const DRAWER_WIDTH = 280;

const menuItems = [
  { id: "dashboard" as View, label: "Dashboard", icon: <Dashboard /> },
  { id: "connections" as View, label: "Conexões", icon: <Cable /> },
  { id: "chatbot" as View, label: "Chatbot", icon: <SmartToy /> },
  { id: "livechat" as View, label: "Chat ao Vivo", icon: <Chat /> },
  { id: "ai-secretary" as View, label: "Secretária IA", icon: <Psychology /> },
  { id: "crm" as View, label: "Contatos (CRM)", icon: <Contacts /> },
  { id: "campaigns" as View, label: "Campanhas", icon: <Campaign /> },
  { id: "analytics" as View, label: "Analytics", icon: <BarChart /> },
  { id: "inventory" as View, label: "Inventário", icon: <Inventory /> },
];

const bottomItems = [
  { id: "subscription" as View, label: "Assinatura", icon: <CreditCard /> },
  { id: "settings" as View, label: "Configurações", icon: <Settings /> },
];

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  currentView,
  onNavigate,
}) => {
  const theme = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SmartToy sx={{ color: "white" }} />
        </Box>
        <Typography variant="h6" fontWeight="bold">
          WA Automator
        </Typography>
      </Box>

      <Divider />

      {/* User Info */}
      {user && (
        <>
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Avatar
                src={user.picture || undefined}
                alt={user.name}
                sx={{ width: 40, height: 40 }}
              >
                {user.name?.charAt(0)}
              </Avatar>
              <Box sx={{ overflow: "hidden" }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Divider />
        </>
      )}

      {/* Main Menu */}
      <List sx={{ flex: 1, px: 2, py: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => onNavigate(item.id)}
              sx={{
                borderRadius: 2,
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Bottom Menu */}
      <List sx={{ px: 2, py: 1 }}>
        {bottomItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={currentView === item.id}
              onClick={() => onNavigate(item.id)}
              sx={{
                borderRadius: 2,
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "inherit",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}

        {/* Logout */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: "error.main",
              "&:hover": {
                bgcolor: "error.main",
                color: "error.contrastText",
                "& .MuiListItemIcon-root": {
                  color: "inherit",
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
