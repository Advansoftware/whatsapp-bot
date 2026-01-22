"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  ContentCopy,
  Add,
  Refresh,
  Webhook,
  Settings,
} from "@mui/icons-material";
import api from "../../lib/api";
import ConfirmDialog from "../common/ConfirmDialog";
import WebhookContactCard from "./WebhookContactCard";
import WebhookContactDialog from "./WebhookContactDialog";
import WebhookLogTable from "./WebhookLogTable";
import {
  WebhookConfig,
  WebhookContact,
  WebhookLog,
  CreateWebhookContactDto,
} from "./types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box pt={3}>{children}</Box>}
    </div>
  );
}

const ExternalWebhookView: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config state
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [logEnabled, setLogEnabled] = useState(true);

  // Contacts state
  const [contacts, setContacts] = useState<WebhookContact[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<WebhookContact | null>(null);

  // Logs state
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [payloadDialogOpen, setPayloadDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState({ title: "", content: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, contactsRes, logsRes] = await Promise.all([
        api.get("/api/webhook-config"),
        api.get("/api/webhook-contacts"),
        api.get("/api/webhook-logs?limit=50"),
      ]);

      setConfig(configRes.data);
      setMessageTemplate(configRes.data.messageTemplate || "");
      setLogEnabled(configRes.data.logEnabled ?? true);
      setContacts(contactsRes.data);
      setLogs(logsRes.data.logs || []);
    } catch (err: unknown) {
      setError("Erro ao carregar configurações");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyWebhookUrl = () => {
    if (config?.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setSuccess("URL copiada para a área de transferência!");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await api.patch("/api/webhook-config", {
        messageTemplate,
        logEnabled,
      });
      setSuccess("Configurações salvas!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erro ao salvar configurações");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setContactDialogOpen(true);
  };

  const handleEditContact = (contact: WebhookContact) => {
    setEditingContact(contact);
    setContactDialogOpen(true);
  };

  const handleSaveContact = async (data: CreateWebhookContactDto) => {
    setSaving(true);
    try {
      if (editingContact) {
        await api.patch(`/api/webhook-contacts/${editingContact.id}`, data);
      } else {
        await api.post("/api/webhook-contacts", data);
      }
      setContactDialogOpen(false);
      loadData();
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
      await api.patch(`/api/webhook-contacts/${contact.id}`, {
        isActive: !contact.isActive,
      });
      loadData();
    } catch (err) {
      setError("Erro ao atualizar contato");
      console.error(err);
    }
  };

  const handleDeleteContact = (contact: WebhookContact) => {
    setConfirmMessage({
      title: "Remover Contato",
      content: `Tem certeza que deseja remover "${contact.name}"?`,
    });
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/api/webhook-contacts/${contact.id}`);
        loadData();
        setSuccess("Contato removido!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("Erro ao remover contato");
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  const handleViewPayload = (log: WebhookLog) => {
    setSelectedLog(log);
    setPayloadDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Webhooks Externos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Receba notificações de qualquer aplicativo via WhatsApp
          </Typography>
        </Box>
        <IconButton onClick={loadData} disabled={loading}>
          <Refresh />
        </IconButton>
      </Box>

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

      {/* URL do Webhook */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Webhook color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Sua URL de Webhook
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <TextField
            value={config?.webhookUrl || ""}
            fullWidth
            size="small"
            InputProps={{ readOnly: true }}
          />
          <Tooltip title="Copiar URL">
            <IconButton onClick={copyWebhookUrl} color="primary">
              <ContentCopy />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Use esta URL para receber webhooks de GitHub, GitLab, Coolify, N8N, Uptime Kuma e outros.
        </Typography>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Contatos" />
          <Tab label="Logs" />
          <Tab label="Configurações" icon={<Settings fontSize="small" />} iconPosition="end" />
        </Tabs>

        <Box p={3}>
          {/* Tab Contatos */}
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddContact}
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
                <Typography variant="body2" color="text.secondary">
                  Adicione contatos que receberão as notificações de webhook
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {contacts.map((contact) => (
                  <WebhookContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={handleEditContact}
                    onDelete={handleDeleteContact}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </Box>
            )}
          </TabPanel>

          {/* Tab Logs */}
          <TabPanel value={tabValue} index={1}>
            <WebhookLogTable logs={logs} onViewPayload={handleViewPayload} />
          </TabPanel>

          {/* Tab Configurações */}
          <TabPanel value={tabValue} index={2}>
            <Box display="flex" flexDirection="column" gap={3} maxWidth={600}>
              <FormControlLabel
                control={
                  <Switch
                    checked={logEnabled}
                    onChange={(e) => setLogEnabled(e.target.checked)}
                    color="primary"
                  />
                }
                label="Salvar logs de webhooks recebidos"
              />
              <TextField
                label="Template da Mensagem"
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                multiline
                rows={6}
                fullWidth
                helperText="Variáveis: {{source}}, {{timestamp}}, {{payload}}, ou campos do payload como {{project.name}}"
              />
              <Button
                variant="contained"
                onClick={saveConfig}
                disabled={saving}
                sx={{ alignSelf: "flex-start" }}
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* Contact Dialog */}
      <WebhookContactDialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        onSave={handleSaveContact}
        contact={editingContact}
        loading={saving}
      />

      {/* Payload Dialog */}
      <Dialog
        open={payloadDialogOpen}
        onClose={() => setPayloadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Payload do Webhook</DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              bgcolor: alpha(theme.palette.background.default, 0.5),
              p: 2,
              borderRadius: 1,
              overflow: "auto",
              maxHeight: 400,
              fontSize: "0.85rem",
            }}
          >
            {selectedLog ? JSON.stringify(selectedLog.payload, null, 2) : ""}
          </Box>
        </DialogContent>
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

export default ExternalWebhookView;
