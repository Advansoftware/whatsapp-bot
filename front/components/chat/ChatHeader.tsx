import React from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  Tooltip,
  Chip,
} from "@mui/material";
import { MoreVert, SmartToy, Person } from "@mui/icons-material";

interface ChatHeaderProps {
  contactName: string;
  profilePicUrl?: string | null;
  presenceText: string | null;
  isSyncing: boolean;
  aiEnabled?: boolean;
  onToggleAI?: () => void;
  isTogglingAI?: boolean;
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
  colors,
}) => {
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
        <Avatar
          src={
            profilePicUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              contactName
            )}&background=00a884&color=fff`
          }
          sx={{ width: 40, height: 40 }}
        />
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ color: colors.incomingText, lineHeight: 1.2 }}
          >
            {contactName}
          </Typography>
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
            {presenceText ? (
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
