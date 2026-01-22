"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import {
  ArrowBack,
  ContentCopy,
  Add,
  Refresh,
  Delete,
  Settings,
  Code,
  Visibility,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import ConfirmDialog from "../common/ConfirmDialog";
import WebhookEventEditor from "./WebhookEventEditor";
import WebhookLogViewer from "./WebhookLogViewer";
import {
  WebhookApplication,
  WebhookEvent,
  WebhookApplicationLog,
  CreateWebhookEventDto,
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

interface WebhookAppDetailViewProps {
  appId: string;
}

const WebhookAppDetailView: React.FC<WebhookAppDetailViewProps> = ({ appId }) => {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [app, setApp] = useState<WebhookApplication | null>(null);
  const [logs, setLogs] = useState<WebhookApplicationLog[]>([]);

  // Event editor state
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WebhookEvent | null>(null);
  const [samplePayload, setSamplePayload] = useState<any>(null);

  // Settings state
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState("");

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState({ title: "", content: "" });

  const loadApp = useCallback(async () => {
    setLoading(true);
    try {
      const [appRes, logsRes] = await Promise.all([
        api.get(`/api/webhook-apps/${appId}`),
        api.get(`/api/webhook-apps/${appId}/logs?limit=50`),
      ]);
      setApp(appRes.data);
      setAllowedOrigins(appRes.data.allowedOrigins || []);
      setLogs(logsRes.data.logs || []);

      // Se tiver logs, pegar o primeiro payload como sample
      if (logsRes.data.logs?.length > 0) {
        setSamplePayload(logsRes.data.logs[0].payload);
      }
    } catch (err: unknown) {
      setError("Erro ao carregar aplicação");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadApp();
  }, [loadApp]);

  const copyWebhookUrl = () => {
    if (app?.webhookUrl) {
      navigator.clipboard.writeText(app.webhookUrl);
      setSuccess("URL copiada!");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddOrigin = () => {
    if (newOrigin && !allowedOrigins.includes(newOrigin)) {
      const updated = [...allowedOrigins, newOrigin];
      setAllowedOrigins(updated);
      setNewOrigin("");
      saveOrigins(updated);
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    const updated = allowedOrigins.filter((o) => o !== origin);
    setAllowedOrigins(updated);
    saveOrigins(updated);
  };

  const saveOrigins = async (origins: string[]) => {
    try {
      await api.patch(`/api/webhook-apps/${appId}/origins`, { origins });
      setSuccess("URLs permitidas atualizadas!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erro ao salvar URLs");
      console.error(err);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventEditorOpen(true);
  };

  const handleEditEvent = (event: WebhookEvent) => {
    setEditingEvent(event);
    setEventEditorOpen(true);
  };

  const handleSaveEvent = async (data: CreateWebhookEventDto) => {
    setSaving(true);
    try {
      if (editingEvent) {
        await api.patch(`/api/webhook-events/${editingEvent.id}`, data);
      } else {
        await api.post(`/api/webhook-apps/${appId}/events`, data);
      }
      setEventEditorOpen(false);
      loadApp();
      setSuccess(editingEvent ? "Evento atualizado!" : "Evento criado!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erro ao salvar evento");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = (event: WebhookEvent) => {
    setConfirmMessage({
      title: "Remover Evento",
      content: `Tem certeza que deseja remover o evento "${event.name}"?`,
    });
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/api/webhook-events/${event.id}`);
        loadApp();
        setSuccess("Evento removido!");
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError("Erro ao remover evento");
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  const handleDeleteApp = () => {
    setConfirmMessage({
      title: "Remover Aplicação",
      content: `Tem certeza que deseja remover "${app?.name}"? Esta ação é irreversível.`,
    });
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/api/webhook-apps/${appId}`);
        router.push("/external-webhook");
      } catch (err) {
        setError("Erro ao remover aplicação");
        console.error(err);
      }
    });
    setConfirmOpen(true);
  };

  const handleUseLogAsTemplate = (log: WebhookApplicationLog) => {
    setSamplePayload(log.payload);
    setEditingEvent(null);
    setEventEditorOpen(true);
    setTabValue(1); // Switch to events tab
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!app) {
    return (
      <Box>
        <Alert severity="error">Aplicação não encontrada</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.push("/external-webhook")} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => router.push("/external-webhook")}>
          <ArrowBack />
        </IconButton>
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
          {app.icon}
        </Box>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>
            {app.name}
          </Typography>
          {app.description && (
            <Typography variant="body2" color="text.secondary">
              {app.description}
            </Typography>
          )}
        </Box>
        <IconButton onClick={loadApp}>
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
          bgcolor: alpha(app.color || theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(app.color || theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          URL do Webhook (use esta URL na aplicação externa)
        </Typography>
        <Box display="flex" gap={1}>
          <TextField
            value={app.webhookUrl}
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
      </Paper>

      {/* Tabs */}
      <Paper sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Logs" icon={<Code fontSize="small" />} iconPosition="start" />
          <Tab label="Eventos" />
          <Tab label="Configurações" icon={<Settings fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box p={3}>
          {/* Tab Logs */}
          <TabPanel value={tabValue} index={0}>
            <WebhookLogViewer
              logs={logs}
              onRefresh={loadApp}
              onUseAsTemplate={handleUseLogAsTemplate}
            />
          </TabPanel>

          {/* Tab Eventos */}
          <TabPanel value={tabValue} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="body2" color="text.secondary">
                Configure eventos para processar webhooks recebidos
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateEvent}
              >
                Novo Evento
              </Button>
            </Box>

            {app.events?.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={6}
              >
                <Typography color="text.secondary" mb={2}>
                  Nenhum evento configurado
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Envie um webhook primeiro, depois use o payload dos logs para configurar eventos
                </Typography>
              </Box>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {app.events?.map((event) => (
                  <Paper
                    key={event.id}
                    sx={{
                      p: 2,
                      bgcolor: alpha(theme.palette.background.paper, 0.4),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {event.name}
                          </Typography>
                          <Chip
                            label={event.isActive ? "Ativo" : "Inativo"}
                            size="small"
                            color={event.isActive ? "success" : "default"}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          Quando <code>{event.eventField}</code> = <code>{event.eventValue}</code>
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: alpha(theme.palette.background.default, 0.5),
                            borderRadius: 1,
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                          }}
                        >
                          {event.messageTemplate.substring(0, 100)}
                          {event.messageTemplate.length > 100 && "..."}
                        </Box>
                      </Box>
                      <Box display="flex" gap={1}>
                        <IconButton size="small" onClick={() => handleEditEvent(event)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteEvent(event)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </TabPanel>

          {/* Tab Configurações */}
          <TabPanel value={tabValue} index={2}>
            <Box display="flex" flexDirection="column" gap={4} maxWidth={600}>
              {/* URLs Permitidas */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  URLs Permitidas (Segurança)
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Se configurado, apenas webhooks dessas URLs serão aceitos
                </Typography>
                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="https://coolify.example.com"
                    size="small"
                    fullWidth
                  />
                  <Button variant="outlined" onClick={handleAddOrigin}>
                    Adicionar
                  </Button>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {allowedOrigins.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma restrição (aceita de qualquer origem)
                    </Typography>
                  ) : (
                    allowedOrigins.map((origin) => (
                      <Chip
                        key={origin}
                        label={origin}
                        onDelete={() => handleRemoveOrigin(origin)}
                        size="small"
                      />
                    ))
                  )}
                </Box>
              </Box>

              <Divider />

              {/* Danger Zone */}
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="error" mb={2}>
                  Zona de Perigo
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleDeleteApp}
                >
                  Remover Aplicação
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Box>
      </Paper>

      {/* Event Editor Dialog */}
      <WebhookEventEditor
        open={eventEditorOpen}
        onClose={() => setEventEditorOpen(false)}
        onSave={handleSaveEvent}
        event={editingEvent}
        samplePayload={samplePayload}
        loading={saving}
      />

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

export default WebhookAppDetailView;
