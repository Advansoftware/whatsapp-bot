import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Grid,
  Divider,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  SmartToy as AIIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Analytics as StatsIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import api from "../../lib/api";

interface AIConfig {
  id: string;
  enabled: boolean;
  mode: "passive" | "active" | "supervised";
  systemPrompt: string;
  temperature: number;
  ownerPhone: string | null;
  ownerName: string | null;
  businessHours: string | null;
  escalationWords: string | null;
  personality: string;
  testMode: boolean;
}

interface AIStats {
  totalInteractions: number;
  approvedSuggestions: number;
  overrides: number;
  escalations: number;
  approvalRate: string;
  activeConversations: number;
}

interface Conversation {
  id: string;
  remoteJid: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  summary: string | null;
  lastMessageAt: string;
  lastMessage: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AISecretaryView: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    enabled: false,
    mode: "passive" as "passive" | "active" | "supervised",
    systemPrompt: "",
    temperature: 0.7,
    ownerPhone: "",
    ownerName: "",
    escalationWords: "",
    personality: "professional",
    testMode: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configData, statsData, conversationsData] = await Promise.all([
        api.getAISecretaryConfig(),
        api.getAIStats(),
        api.getAIConversations(),
      ]);
      setConfig(configData);
      setStats(statsData);
      setConversations(conversationsData);
      setFormData({
        enabled: configData.enabled,
        mode: configData.mode,
        systemPrompt: configData.systemPrompt,
        temperature: configData.temperature,
        ownerPhone: configData.ownerPhone || "",
        ownerName: configData.ownerName || "",
        escalationWords: configData.escalationWords || "",
        personality: configData.personality,
        testMode: configData.testMode || false,
      });
    } catch (err) {
      setError("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateAISecretaryConfig(formData);
      setSuccess("Configurações salvas com sucesso!");
      await loadData();
    } catch (err) {
      setError("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "error";
      case "high":
        return "warning";
      case "normal":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const formatPhone = (jid: string) => {
    return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <AIIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h4" fontWeight="bold">
            Secretária IA
          </Typography>
          <Chip
            label={formData.enabled ? "Ativa" : "Desativada"}
            color={formData.enabled ? "success" : "default"}
            size="small"
          />
        </Box>
        <IconButton onClick={loadData}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="primary.main">
              {stats?.activeConversations || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Conversas Ativas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="success.main">
              {stats?.approvedSuggestions || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aprovadas
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="warning.main">
              {stats?.overrides || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overrides
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="error.main">
              {stats?.escalations || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Escalações
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="info.main">
              {stats?.totalInteractions || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Interações
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={2}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color="success.main">
              {stats?.approvalRate || "0%"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Taxa Aprovação
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab icon={<SettingsIcon />} label="Configuração" />
        <Tab icon={<ChatIcon />} label="Conversas" />
      </Tabs>

      {/* Configuration Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Configurações Gerais
                </Typography>
                <Divider sx={{ my: 2 }} />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.enabled}
                      onChange={(e) =>
                        setFormData({ ...formData, enabled: e.target.checked })
                      }
                      color="primary"
                    />
                  }
                  label="Ativar Secretária IA"
                />

                <Box
                  sx={{
                    mt: 2,
                    ml: 2,
                    p: 1.5,
                    bgcolor: (theme) =>
                      formData.testMode
                        ? theme.palette.mode === "dark"
                          ? "rgba(156, 39, 176, 0.15)"
                          : "rgba(156, 39, 176, 0.08)"
                        : theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(0, 0, 0, 0.03)",
                    border: (theme) =>
                      formData.testMode
                        ? "1px solid rgba(156, 39, 176, 0.4)"
                        : theme.palette.mode === "dark"
                        ? "1px solid rgba(255, 255, 255, 0.1)"
                        : "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: 1,
                    opacity: formData.enabled ? 1 : 0.5,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.testMode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            testMode: e.target.checked,
                          })
                        }
                        color="secondary"
                        disabled={!formData.enabled}
                      />
                    }
                    label={
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            color: formData.testMode
                              ? "secondary.main"
                              : "text.primary",
                          }}
                        >
                          👤 Secretária Pessoal
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          Quando você enviar mensagem, ela será sua assistente
                          pessoal
                        </Typography>
                      </Box>
                    }
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>Modo de Operação</Typography>
                  <ToggleButtonGroup
                    value={formData.mode}
                    exclusive
                    onChange={(_, v) =>
                      v && setFormData({ ...formData, mode: v })
                    }
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="passive">
                      <Tooltip title="IA analisa mas não responde automaticamente">
                        <span>Passivo</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="active">
                      <Tooltip title="IA responde automaticamente">
                        <span>Ativo</span>
                      </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="supervised">
                      <Tooltip title="IA prepara resposta mas aguarda aprovação">
                        <span>Supervisionado</span>
                      </Tooltip>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>Personalidade</Typography>
                  <ToggleButtonGroup
                    value={formData.personality}
                    exclusive
                    onChange={(_, v) =>
                      v && setFormData({ ...formData, personality: v })
                    }
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="professional">
                      Profissional
                    </ToggleButton>
                    <ToggleButton value="friendly">Amigável</ToggleButton>
                    <ToggleButton value="casual">Casual</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom>
                    Temperatura (Criatividade): {formData.temperature}
                  </Typography>
                  <Slider
                    value={formData.temperature}
                    onChange={(_, v) =>
                      setFormData({ ...formData, temperature: v as number })
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    marks={[
                      { value: 0, label: "Preciso" },
                      { value: 0.5, label: "Balanceado" },
                      { value: 1, label: "Criativo" },
                    ]}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Dados do Proprietário
                </Typography>
                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="Nome do Proprietário"
                  value={formData.ownerName}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  placeholder="Ex: João Silva"
                  sx={{ mb: 2 }}
                  helperText="A IA usará esse nome quando precisar mencionar você"
                />

                <TextField
                  fullWidth
                  label="WhatsApp do Proprietário"
                  value={formData.ownerPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerPhone: e.target.value })
                  }
                  placeholder="Ex: 5511999999999"
                  helperText="Número para receber notificações de conversas importantes"
                />
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                  Escalação
                </Typography>
                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="Palavras de Escalação"
                  value={formData.escalationWords}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escalationWords: e.target.value,
                    })
                  }
                  placeholder="reclamação, problema, gerente, advogado"
                  helperText="Separe por vírgula. Quando detectadas, a IA chamará você automaticamente"
                  multiline
                  rows={2}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prompt do Sistema
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  placeholder="Instruções personalizadas para a IA..."
                  helperText="Personalize como a secretária deve se comportar e o que ela deve saber sobre seu negócio"
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={saving}
                startIcon={
                  saving ? <CircularProgress size={20} /> : <CheckIcon />
                }
              >
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Conversations Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Conversas Monitoradas ({conversations.length})
        </Typography>

        {conversations.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <ChatIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography color="text.secondary">
              Nenhuma conversa ativa no momento
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {conversations.map((conv) => (
              <Grid item xs={12} md={6} lg={4} key={conv.id}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Typography variant="subtitle1" fontWeight="bold">
                        {formatPhone(conv.remoteJid)}
                      </Typography>
                      <Chip
                        label={conv.priority}
                        color={getPriorityColor(conv.priority) as any}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {conv.lastMessage || "Sem mensagem"}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={2}
                    >
                      <Chip
                        label={
                          conv.assignedTo === "ai"
                            ? "IA"
                            : conv.assignedTo === "human"
                            ? "Humano"
                            : "Não atribuído"
                        }
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(conv.lastMessageAt).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
                    {conv.summary && (
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, display: "block" }}
                        color="text.secondary"
                      >
                        📝 {conv.summary}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

export default AISecretaryView;
