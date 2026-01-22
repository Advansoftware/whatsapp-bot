"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import { Settings, ChevronRight } from "@mui/icons-material";
import { WebhookApplication } from "./types";

interface WebhookAppCardProps {
  app: WebhookApplication;
  onClick: () => void;
}

const WebhookAppCard: React.FC<WebhookAppCardProps> = ({ app, onClick }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(app.color || theme.palette.primary.main, 0.3)}`,
        "&:hover": {
          borderColor: app.color || theme.palette.primary.main,
          transform: "translateY(-2px)",
          transition: "all 0.2s",
        },
      }}
    >
      <CardActionArea onClick={onClick}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(app.color || theme.palette.primary.main, 0.1),
                  fontSize: "1.5rem",
                }}
              >
                {app.icon || "🔔"}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {app.name}
                </Typography>
                {app.description && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {app.description}
                  </Typography>
                )}
              </Box>
            </Box>
            <ChevronRight color="action" />
          </Box>

          <Box display="flex" gap={1} mt={2} flexWrap="wrap">
            <Chip
              label={`${app._count?.events || 0} eventos`}
              size="small"
              variant="outlined"
              icon={<Settings fontSize="small" />}
            />
            <Chip
              label={`${app._count?.logs || 0} logs`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={app.isActive ? "Ativo" : "Inativo"}
              size="small"
              color={app.isActive ? "success" : "default"}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default WebhookAppCard;
