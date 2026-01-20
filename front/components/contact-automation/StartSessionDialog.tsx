"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Avatar,
  Alert,
} from "@mui/material";
import { ContactAutomationProfile } from "./types";

interface StartSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onStart: (profileId: string, query: string) => Promise<void>;
  profile: ContactAutomationProfile | null;
}

export default function StartSessionDialog({
  open,
  onClose,
  onStart,
  profile,
}: StartSessionDialogProps) {
  const [query, setQuery] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!profile || !query.trim()) {
      setError("Digite o que deseja consultar");
      return;
    }

    setError(null);
    setStarting(true);

    try {
      await onStart(profile.id, query.trim());
      setQuery("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar automação");
    } finally {
      setStarting(false);
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar src={profile.profilePicUrl} sx={{ width: 40, height: 40 }}>
          {profile.contactName[0]}
        </Avatar>
        <Box>
          <Typography variant="h6">Iniciar Automação</Typography>
          <Typography variant="caption" color="text.secondary">
            {profile.contactName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Digite o que você deseja consultar ou fazer com {profile.contactName}.
          A IA vai navegar pelo atendimento automático e te retornar o
          resultado.
        </Typography>

        <TextField
          label="O que você deseja?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder={`Ex: Verificar se há falta de água na minha região\nConsultar valor das contas em aberto\nInformar vazamento na rua...`}
          autoFocus
        />

        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Campos disponíveis:
          </Typography>
          {profile.fields.map((field) => (
            <Typography key={field.id} variant="body2" color="text.secondary">
              • {field.fieldLabel}: {field.fieldValue.slice(0, 4)}••••
            </Typography>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={starting}>
          Cancelar
        </Button>
        <Button
          onClick={handleStart}
          variant="contained"
          disabled={starting || !query.trim()}
        >
          {starting ? "Iniciando..." : "Iniciar Automação"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
