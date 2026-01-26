"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Switch,
  Alert,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
} from "@mui/material";
import { Add, Delete, Edit, Phone } from "@mui/icons-material";
import api from "../../lib/api";
import ConfirmDialog from "../common/ConfirmDialog";
import { WebhookContact, CreateWebhookContactDto } from "./types";

interface WebhookContactsTabProps {
  appId: string;
}

const WebhookContactsTab: React.FC<WebhookContactsTabProps> = ({ appId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [contacts, setContacts] = useState<WebhookContact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WebhookContact | null>(null);
  const [name, setName] = useState("");
  const [remoteJid, setRemoteJid] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState({ title: "", content: "" });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/webhook-apps/${appId}/contacts`);
      setContacts(res.data);
    } catch (err) {
      setError("Erro ao carregar contatos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleOpenDialog = (contact?: WebhookContact) => {
    if (contact) {
      setEditingContact(contact);
      setName(contact.name);
      setRemoteJid(contact.remoteJid);
    } else {
      setEditingContact(null);
      setName("");
      setRemoteJid("");
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingContact) {
        await api.patch(`/api/webhook-apps/${appId}/contacts/${editingContact.id}`, { name });
      } else {
        await api.post(`/api/webhook-apps/${appId}/contacts`, { name, remoteJid });
      }
      setDialogOpen(false);
      loadContacts();
      setSuccess(editingContact ? "Contato atualizado!" : "Contato adicionado!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erro ao salvar contato");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (contact: WebhookContact) => {
    try {
      await api.patch(`/api/webhook-apps/${appId}/contacts/${contact.id}`, {
        isActive: !contact.isActive,
      });
      loadContacts();
    } catch (err) {
      setError("Erro ao atualizar contato");
      console.error(err);
    }
  };

  const handleDelete = (contact: WebhookContact) => {
    setConfirmMessage({
      title: "Remover Contato",
      content: `Tem certeza que deseja remover "${contact.name}"?`,
    });
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/api/webhook-apps/${appId}/contacts/${contact.id}`);
        loadContacts();
        setSuccess("Contato removido!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("Erro ao remover contato");
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Contatos que podem receber notificações de webhook
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          size="small"
        >
          Adicionar Contato
        </Button>
      </Box>

      {contacts.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          py={6}
        >
          <Typography color="text.secondary" mb={2}>
            Nenhum contato configurado
          </Typography>
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {contacts.map((contact) => (
            <Card
              key={contact.id}
              sx={{
                bgcolor: alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {contact.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {contact.remoteJid}
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Switch
                      checked={contact.isActive}
                      onChange={() => handleToggleActive(contact)}
                      color="success"
                      size="small"
                    />
                    <IconButton size="small" onClick={() => handleOpenDialog(contact)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(contact)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Dialog Add/Edit */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingContact ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Número WhatsApp"
              value={remoteJid}
              onChange={(e) => setRemoteJid(e.target.value)}
              fullWidth
              required
              disabled={!!editingContact}
              placeholder="5511999999999"
              helperText="Número com código do país, sem símbolos"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!name || !remoteJid || saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmMessage.title}
        content={confirmMessage.content}
        onConfirm={() => {
          confirmAction?.();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default WebhookContactsTab;
