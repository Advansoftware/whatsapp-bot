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
  useMediaQuery,
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
  Webhook,
  School,
  ViewColumn,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 280;

// Itens do menu principal
const menuItems = [
  { id: "dashboard" as View, label: "Dashboard", icon: <Dashboard /> },
  { id: "connections" as View, label: "Conexões", icon: <Cable /> },
  { id: "chatbot" as View, label: "Chatbot", icon: <SmartToy /> },
  {
    id: "livechat" as View,
    label: "Chat ao Vivo",
    icon: <Chat />,
  },
  { id: "ai-secretary", label: "Secretária IA", icon: <Psychology /> },
  { id: "secretary-tasks", label: "Tarefas", icon: <Checklist /> },
  { id: "training", label: "Treinamento IA", icon: <School /> },
  {
    id: "group-automations" as View,
    label: "Automações de Grupo",
    icon: <AutoAwesome />,
  },
  {
    id: "contact-automation" as View,
    label: "Automação de Contatos",
    icon: <SmartToy />,
  },
  { id: "integrations" as View, label: "Integrações", icon: <Extension /> },
  { id: "external-webhook" as View, label: "Webhooks", icon: <Webhook /> },
  { id: "crm" as View, label: "Contatos (CRM)", icon: <Contacts /> },
  { id: "pipeline" as View, label: "Funil de Vendas", icon: <ViewColumn /> },
  { id: "daily-messaging" as View, label: "Mensagens Diárias", icon: <Campaign /> },
  { id: "campaigns" as View, label: "Campanhas", icon: <Campaign /> },
  { id: "analytics" as View, label: "Analytics", icon: <BarChart /> },
  { id: "team" as View, label: "Equipe", icon: <Groups /> },
  { id: "inventory" as View, label: "Inventário", icon: <Inventory /> },
];

const bottomItems = [
  { id: "subscription" as View, label: "Assinatura", icon: <CreditCard /> },
  { id: "settings" as View, label: "Configurações", icon: <Settings /> },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Verificar se é mobile (celular - xs)
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // Verificar se é tablet ou menor
  const isTabletOrMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleLogout = () => {
    logout();
  };

  const handleNavigation = (itemId: string) => {
    router.push(`/${itemId}`);
    // Fechar drawer em mobile após navegação
    if (isTabletOrMobile) {
      onClose();
    }
  };

  // Filtrar itens do menu baseado no dispositivo
  const filteredMenuItems = menuItems;

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default", // Match global background
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            background: "linear-gradient(135deg, #00fe9b 0%, #00cc7a 100%)",
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
          <span style={{ color: "#00fe9b" }}>IA</span>
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
                bgcolor: pathname?.includes("/profile")
                  ? "primary.main"
                  : "action.hover",
                color: pathname?.includes("/profile")
                  ? "primary.contrastText"
                  : "inherit",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: pathname?.includes("/profile")
                    ? "primary.dark"
                    : "action.selected",
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
                <Typography
                  variant="caption"
                  color={
                    pathname?.includes("/profile")
                      ? "inherit"
                      : "text.secondary"
                  }
                  noWrap
                >
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
        {filteredMenuItems.map((item) => {
          const isSelected =
            pathname === `/${item.id}` ||
            (item.id === "dashboard" && pathname === "/dashboard");

          return (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavigation(item.id)}
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
                onClick={() => handleNavigation(item.id)}
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

  // Em mobile/tablet usa drawer temporário, em desktop usa permanente
  return (
    <>
      {/* Drawer para mobile e tablet */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Melhor performance em mobile
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Drawer permanente para desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
