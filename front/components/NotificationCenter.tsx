import React, { useState } from "react";
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  LocalFireDepartment,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Info,
  Campaign,
  PersonAdd,
  AccessTime,
  Close,
  DoneAll,
} from "@mui/icons-material";
import { useNotifications } from "../hooks/useNotifications";
import { Notification as AppNotification } from "../lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const NotificationCenter: React.FC<{ onNavigate?: (url: string) => void }> = ({
  onNavigate,
}) => {
  const theme = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (onNavigate) {
      if (notification.actionUrl) {
        onNavigate(notification.actionUrl);
      } else if (notification.metadata?.remoteJid) {
        // Construct URL for chat navigation
        onNavigate(`/livechat/${notification.metadata.remoteJid}`);
      }
      handleClose();
    }
  };

  const getIcon = (type: string, category: string) => {
    switch (type) {
      case "hot_lead":
      case "escalation":
      case "integration_error":
      case "campaign_complete":
      case "new_contact":
      case "task_reminder":
      case "low_balance":
        // Returns null because these types already have emojis in the title
        return null;

      case "message_failed":
        return <ErrorIcon sx={{ color: "#f44336" }} />;

      default:
        if (category === "error")
          return <ErrorIcon sx={{ color: "#f44336" }} />;
        if (category === "warning")
          return <Warning sx={{ color: "#ff9800" }} />;
        if (category === "success")
          return <CheckCircle sx={{ color: "#4caf50" }} />;
        return <Info sx={{ color: "#2196f3" }} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "success":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen} sx={{ bgcolor: "action.hover" }}>
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">Notificações</Typography>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} novas`}
                size="small"
                color="primary"
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAll />}
              onClick={markAllAsRead}
            >
              Marcar todas
            </Button>
          )}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={32} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              p={4}
              color="text.secondary"
            >
              <NotificationsIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography>Nenhuma notificação</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notification, index) => {
                const icon = getIcon(notification.type, notification.category);
                return (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      button
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        bgcolor: notification.read
                          ? "transparent"
                          : alpha(theme.palette.primary.main, 0.08),
                        "&:hover": {
                          bgcolor: notification.read
                            ? "action.hover"
                            : alpha(theme.palette.primary.main, 0.12),
                        },
                        pr: 1,
                      }}
                    >
                      {icon && (
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {icon}
                        </ListItemIcon>
                      )}
                      <ListItemText
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight={notification.read ? 400 : 600}
                            noWrap
                          >
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                {
                                  addSuffix: true,
                                  locale: ptBR,
                                }
                              )}
                            </Typography>
                          </Box>
                        }
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              borderTop: `1px solid ${theme.palette.divider}`,
              textAlign: "center",
            }}
          >
            <Button
              size="small"
              onClick={() => {
                if (onNavigate) onNavigate("/notifications");
                handleClose();
              }}
            >
              Ver todas as notificações
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
};

export default NotificationCenter;
