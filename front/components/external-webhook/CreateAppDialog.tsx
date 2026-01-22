"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import { WebhookApplication, CreateWebhookAppDto } from "./types";

// Ícones disponíveis
const ICONS = ["🔔", "🚀", "⚡", "🔧", "📦", "🎬", "💾", "🔒", "📊", "🌐", "🤖", "📱"];
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b"];

interface CreateAppDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateWebhookAppDto) => void;
  loading?: boolean;
}

const CreateAppDialog: React.FC<CreateAppDialogProps> = ({
  open,
  onClose,
  onSave,
  loading,
}) => {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🔔");
  const [color, setColor] = useState("#6366f1");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIcon("🔔");
      setColor("#6366f1");
    }
  }, [open]);

  const handleSave = () => {
    onSave({ name, description, icon, color });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nova Aplicação de Webhook</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} mt={1}>
          <TextField
            label="Nome da Aplicação"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            placeholder="Ex: Coolify, GitHub, Jellyfin"
          />

          <TextField
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Para que serve esta integração"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Ícone
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {ICONS.map((i) => (
                <IconButton
                  key={i}
                  onClick={() => setIcon(i)}
                  sx={{
                    fontSize: "1.5rem",
                    border: icon === i ? `2px solid ${theme.palette.primary.main}` : "2px solid transparent",
                    bgcolor: icon === i ? alpha(theme.palette.primary.main, 0.1) : "transparent",
                  }}
                >
                  {i}
                </IconButton>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Cor
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {COLORS.map((c) => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: c,
                    cursor: "pointer",
                    border: color === c ? `3px solid ${theme.palette.common.white}` : "none",
                    boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || loading}
        >
          {loading ? "Criando..." : "Criar Aplicação"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateAppDialog;
