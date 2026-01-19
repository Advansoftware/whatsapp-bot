"use client";

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { View } from "../types";
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
  Checklist,
  Extension,
  AutoAwesome,
  Groups,
  Person,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 280;

const menuItems = [
  { id: "dashboard" as View, label: "Dashboard", icon: <Dashboard /> },
  { id: "connections" as View, label: "Conexões", icon: <Cable /> },
  { id: "chatbot" as View, label: "Chatbot", icon: <SmartToy /> },
  { id: "livechat" as View, label: "Chat ao Vivo", icon: <Chat /> },
  { id: "ai-secretary", label: "Secretária IA", icon: <Psychology /> },
  { id: "secretary-tasks", label: "Tarefas", icon: <Checklist /> },
  {
    id: "group-automations" as View,
    label: "Automações de Grupo",
    icon: <AutoAwesome />,
  },
  { id: "integrations" as View, label: "Integrações", icon: <Extension /> },
  { id: "crm" as View, label: "Contatos (CRM)", icon: <Contacts /> },
  { id: "campaigns" as View, label: "Campanhas", icon: <Campaign /> },
  { id: "analytics" as View, label: "Analytics", icon: <BarChart /> },
  { id: "team" as View, label: "Equipe", icon: <Groups /> },
  { id: "inventory" as View, label: "Inventário", icon: <Inventory /> },
];

const bottomItems = [
  { id: "subscription" as View, label: "Assinatura", icon: <CreditCard /> },
  { id: "settings" as View, label: "Configurações", icon: <Settings /> },
];

const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
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
            background: "linear-gradient(135deg, #00a884 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0, 168, 132, 0.3)",
          }}
        >
          <AutoAwesome sx={{ color: "white" }} />
        </Box>
        <Typography variant="h6" fontWeight="bold">
          <span>Respond</span>
          <span style={{ color: "#00a884" }}>IA</span>
        </Typography>
      </Box>

      <Divider />

      {/* User Info */}
      {user && (
        <>
          <Box sx={{ p: 2 }}>
          <Box
            onClick={() => router.push("/profile")}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: pathname?.includes("/profile") ? "primary.main" : "action.hover",
              color: pathname?.includes("/profile") ? "primary.contrastText" : "inherit",
              cursor: "pointer",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: pathname?.includes("/profile") ? "primary.dark" : "action.selected",
              },
            }}
          >
              <Avatar
                src={user.picture || undefined}
                alt={user.name}
                sx={{ width: 40, height: 40 }}
              >
                {user.name?.charAt(0)}
              </Avatar>
              <Box sx={{ overflow: "hidden", flex: 1 }}>
                <Typography variant="body2" fontWeight={500} noWrap>
                  {user.name}
                </Typography>
                 <Typography variant="caption" color={pathname?.includes("/profile") ? "inherit" : "text.secondary"} noWrap>
                  {user.email}
                </Typography>
              </Box>
              <Person sx={{ opacity: 0.7, fontSize: 20 }} />
            </Box>
          </Box>
          <Divider />
        </>
      )}

      <List sx={{ flex: 1, px: 2, py: 1 }}>
        {menuItems.map((item) => {
          const isSelected = pathname === `/${item.id}` || (item.id === 'dashboard' && pathname === '/dashboard');
          
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => router.push(`/${item.id}`)}
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
          );
        })}
      </List>

      <Divider />

      <List sx={{ px: 2, py: 1 }}>
        {bottomItems.map((item) => {
          const isSelected = pathname === `/${item.id}`;
          
          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => router.push(`/${item.id}`)}
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
          );
        })}

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
