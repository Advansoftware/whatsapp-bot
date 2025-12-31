import React from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";

interface ChatHeaderProps {
  contactName: string;
  profilePicUrl?: string | null;
  presenceText: string | null;
  isSyncing: boolean;
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
      <IconButton sx={{ color: colors.iconColor }}>
        <MoreVert />
      </IconButton>
    </Box>
  );
};

export default ChatHeader;
