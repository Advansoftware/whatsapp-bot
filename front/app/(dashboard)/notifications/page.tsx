"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Button,
  Divider,
  Chip,
  Container,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  Close,
  Delete,
  DoneAll,
  ArrowBack,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotificationsPage() {
  const router = useRouter();
  const theme = useTheme();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('/chat/')) {
        const jid = notification.actionUrl.replace('/chat/', '');
        router.push(`/livechat?jid=${encodeURIComponent(jid)}`);
      } else {
        router.push(notification.actionUrl);
      }
    } else if (notification.metadata?.remoteJid) {
       router.push(`/livechat?jid=${encodeURIComponent(notification.metadata.remoteJid)}`);
    }
  };

  const getIcon = (type: string, category: string) => {
    switch (type) {
      case "message_failed":
        return <ErrorIcon sx={{ color: "#f44336" }} />;
      default:
        if (category === "error") return <ErrorIcon sx={{ color: "#f44336" }} />;
        if (category === "warning") return <Warning sx={{ color: "#ff9800" }} />;
        if (category === "success") return <CheckCircle sx={{ color: "#4caf50" }} />;
        return <Info sx={{ color: "#2196f3" }} />;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <IconButton onClick={() => router.back()}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" fontWeight="bold">
          Notificações
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box
          p={2}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          bgcolor="background.default"
          borderBottom={1}
          borderColor="divider"
        >
          <Box display="flex" gap={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight="bold">
              Todas
            </Typography>
            <Chip
              label={`${notifications.filter((n) => !n.read).length} não lidas`}
              color="primary"
              size="small"
            />
          </Box>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<DoneAll />}
              onClick={markAllAsRead}
              disabled={notifications.filter((n) => !n.read).length === 0}
            >
              Marcar lidas
            </Button>
            <Button
              startIcon={<Delete />}
              color="error"
              onClick={deleteAllNotifications}
              disabled={notifications.length === 0}
            >
              Limpar tudo
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box p={4} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box
            p={8}
            display="flex"
            flexDirection="column"
            alignItems="center"
            color="text.secondary"
          >
            <NotificationsIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
            <Typography>Nenhuma notificação encontrada</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    bgcolor: notification.read
                      ? "transparent"
                      : alpha(theme.palette.primary.main, 0.04),
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    transition: "background-color 0.2s",
                  }}
                  onClick={() => handleNotificationClick(notification)}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 48, pt: 1 }}>
                    {getIcon(notification.type, notification.category)}
                  </ListItemIcon>
                  <ListItemText
                    secondaryTypographyProps={{ component: "div" }}
                    primary={
                      <Box display="flex" justifyContent="space-between" pr={4}>
                        <Typography
                          variant="subtitle2"
                          fontWeight={notification.read ? 400 : 600}
                        >
                          {notification.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, pr: 4 }}
                      >
                        {notification.message}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < notifications.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
}
