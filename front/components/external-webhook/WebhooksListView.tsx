"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from "@mui/material";
import { Add, Refresh, Webhook } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import WebhookAppCard from "./WebhookAppCard";
import CreateAppDialog from "./CreateAppDialog";
import WebhookContactsTab from "./WebhookContactsTab";
import { WebhookApplication, CreateWebhookAppDto } from "./types";

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

const WebhooksListView: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [apps, setApps] = useState<WebhookApplication[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/webhook-apps");
      setApps(res.data);
    } catch (err: unknown) {
      setError("Erro ao carregar aplicações");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleCreateApp = async (data: CreateWebhookAppDto) => {
    setSaving(true);
    try {
      const res = await api.post("/api/webhook-apps", data);
      setCreateDialogOpen(false);
      setSuccess("Aplicação criada!");
      setTimeout(() => setSuccess(null), 3000);
      // Navegar para a página da aplicação
      router.push(`/external-webhook/${res.data.id}`);
    } catch (err) {
      setError("Erro ao criar aplicação");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAppClick = (app: WebhookApplication) => {
    router.push(`/external-webhook/${app.id}`);
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
        <IconButton onClick={loadApps} disabled={loading}>
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

      {/* Tabs */}
      <Paper sx={{ bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Aplicações" icon={<Webhook fontSize="small" />} iconPosition="start" />
          <Tab label="Contatos" />
        </Tabs>

        <Box p={3}>
          {/* Tab Aplicações */}
          <TabPanel value={tabValue} index={0}>
            <Box display="flex" justifyContent="flex-end" mb={3}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Nova Aplicação
              </Button>
            </Box>

            {apps.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={8}
              >
                <Webhook sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" color="text.secondary" mb={1}>
                  Nenhuma aplicação configurada
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Crie uma aplicação para começar a receber webhooks
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Criar Primeira Aplicação
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {apps.map((app) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={app.id}>
                    <WebhookAppCard app={app} onClick={() => handleAppClick(app)} />
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* Tab Contatos */}
          <TabPanel value={tabValue} index={1}>
            <WebhookContactsTab />
          </TabPanel>
        </Box>
      </Paper>

      {/* Create Dialog */}
      <CreateAppDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateApp}
        loading={saving}
      />
    </Box>
  );
};

export default WebhooksListView;
