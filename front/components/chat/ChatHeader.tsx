import React from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
  Badge,
} from "@mui/material";
import { MoreVert, SmartToy, Person, Group } from "@mui/icons-material";

interface ChatHeaderProps {
  contactName: string;
  profilePicUrl?: string | null;
  presenceText: string | null;
  isSyncing: boolean;
  aiEnabled?: boolean;
  onToggleAI?: () => void;
  isTogglingAI?: boolean;
  isGroup?: boolean;
  participantCount?: number;
  colors: {
    headerBg: string;
    incomingText: string;
    timeText: string;
    iconColor: string;
    divider: string;
  };
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  contactName,
  profilePicUrl,
  presenceText,
  isSyncing,
  aiEnabled,
  onToggleAI,
  isTogglingAI,
  isGroup,
  participantCount,
  colors,
}) => {
  const avatarBgColor = isGroup ? "#5865F2" : "#00a884";

  return (
    <Box
      p={1.5}
      bgcolor={colors.headerBg}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      borderLeft={`1px solid ${colors.divider}`}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          badgeContent={
            isGroup ? (
              <Box
                sx={{
                  bgcolor: "#5865F2",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid",
                  borderColor: colors.headerBg,
                }}
              >
                <Group sx={{ fontSize: 10, color: "#fff" }} />
              </Box>
            ) : null
          }
        >
          <Avatar
            src={
              profilePicUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                contactName
              )}&background=${avatarBgColor.replace("#", "")}&color=fff`
            }
            sx={{ width: 40, height: 40, bgcolor: avatarBgColor }}
            imgProps={{
              onError: (e: any) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  contactName
                )}&background=${avatarBgColor.replace("#", "")}&color=fff`;
              },
            }}
          >
            {isGroup && <Group />}
          </Avatar>
        </Badge>
        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              variant="subtitle1"
              sx={{ color: colors.incomingText, lineHeight: 1.2 }}
            >
              {contactName}
            </Typography>
            {isGroup && (
              <Chip
                label="Grupo"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(88, 101, 242, 0.2)",
                  color: "#5865F2",
                }}
              />
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color:
                presenceText === "online"
                  ? "#25D366"
                  : presenceText
                  ? "#25D366"
                  : colors.timeText,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              fontStyle:
                presenceText === "digitando..." ||
                presenceText === "gravando áudio..."
                  ? "italic"
                  : "normal",
            }}
          >
            {isGroup && !presenceText && !isSyncing ? (
              participantCount ? (
                `${participantCount} participantes`
              ) : (
                "Grupo"
              )
            ) : presenceText ? (
              <>
                {presenceText === "online" && (
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#25D366",
                      display: "inline-block",
                    }}
                  />
                )}
                {presenceText}
              </>
            ) : isSyncing ? (
              <>
                <CircularProgress
                  size={10}
                  thickness={5}
                  sx={{ color: colors.timeText }}
                />
                Sincronizando...
              </>
            ) : null}
          </Typography>
        </Box>
      </Box>
      <Box display="flex" alignItems="center" gap={1}>
        {/* AI Toggle */}
        {onToggleAI && (
          <Tooltip
            title={
              aiEnabled
                ? "IA ativa - Clique para desativar"
                : "IA desativada - Clique para ativar"
            }
          >
            <Chip
              icon={
                isTogglingAI ? (
                  <CircularProgress size={16} color="inherit" />
                ) : aiEnabled ? (
                  <SmartToy />
                ) : (
                  <Person />
                )
              }
              label={aiEnabled ? "IA" : "Manual"}
              color={aiEnabled ? "success" : "warning"}
              size="small"
              onClick={onToggleAI}
              disabled={isTogglingAI}
              sx={{ cursor: "pointer" }}
            />
          </Tooltip>
        )}
        <IconButton sx={{ color: colors.iconColor }}>
          <MoreVert />
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatHeader;
