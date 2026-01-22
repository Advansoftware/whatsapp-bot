"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Switch,
  useTheme,
  alpha,
} from "@mui/material";
import { Delete, Edit, Phone } from "@mui/icons-material";
import { WebhookContact } from "./types";

interface WebhookContactCardProps {
  contact: WebhookContact;
  onEdit: (contact: WebhookContact) => void;
  onDelete: (contact: WebhookContact) => void;
  onToggleActive: (contact: WebhookContact) => void;
}

const WebhookContactCard: React.FC<WebhookContactCardProps> = ({
  contact,
  onEdit,
  onDelete,
  onToggleActive,
}) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        "&:hover": {
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" fontWeight={600}>
              {contact.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
              <Phone fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {contact.remoteJid}
              </Typography>
            </Box>
            {contact.categories && contact.categories.length > 0 && (
              <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                {contact.categories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Box>
            )}
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Switch
              checked={contact.isActive}
              onChange={() => onToggleActive(contact)}
              color="success"
              size="small"
            />
            <IconButton size="small" onClick={() => onEdit(contact)}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => onDelete(contact)}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WebhookContactCard;
