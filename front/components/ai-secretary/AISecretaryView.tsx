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
  Visibility as ViewIcon,
  PanTool as InterventionIcon,
  PowerSettingsNew as ToggleAIIcon,
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
  aiEnabled: boolean;
  summary: string | null;
  lastMessageAt: string;
  instanceName: string;
  instanceKey: string;
  contact: {
    id?: string;
    name: string;
    profilePicUrl: string | null;
  };
  recentMessages: {
    id: string;
    content: string;
    direction: string;
    createdAt: string;
    response: string | null;
  }[];
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
  const [expandedConversation, setExpandedConversation] = useState<
    string | null
  >(null);
  const [togglingAI, setTogglingAI] = useState<string | null>(null);

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

  const handleToggleAI = async (
    conversationId: string,
    currentAiEnabled: boolean
  ) => {
    setTogglingAI(conversationId);
    try {
      await api.toggleConversationAI(conversationId, !currentAiEnabled);
      // Atualizar a lista local
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                aiEnabled: !currentAiEnabled,
                assignedTo: !currentAiEnabled ? "ai" : "human",
              }
            : conv
        )
      );
    } catch (err) {
      setError("Erro ao alterar status da IA");
    } finally {
      setTogglingAI(null);
    }
  };

  const handleIntervene = (conv: Conversation) => {
    // Desabilitar IA e navegar para o chat
    handleToggleAI(conv.id, true); // true porque queremos desabilitar (setar para false)
    // Navegar para o chat - usando window.location por simplicidade,
    // idealmente usaria react-router ou callback para o App principal
    window.dispatchEvent(
      new CustomEvent("navigateToChat", {
        detail: {
          remoteJid: conv.remoteJid,
          instanceKey: conv.instanceKey,
          contactName: conv.contact.name,
        },
      })
    );
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
                  <Typography gutterBottom fontWeight="bold">
                    Modo de Operação
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.mode}
                    exclusive
                    onChange={(_, v) =>
                      v && setFormData({ ...formData, mode: v })
                    }
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="passive">Passivo</ToggleButton>
                    <ToggleButton value="active">Ativo</ToggleButton>
                    <ToggleButton value="supervised">
                      Supervisionado
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Paper sx={{ mt: 1, p: 2, bgcolor: "background.default" }}>
                    {formData.mode === "passive" && (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="info.main"
                        >
                          👁️ Modo Passivo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          A IA apenas <strong>observa e analisa</strong> as
                          mensagens, mas{" "}
                          <strong>nunca responde automaticamente</strong>. Útil
                          para monitorar conversas e receber insights sem
                          interferir. Você ainda recebe notificações quando algo
                          importante acontece.
                        </Typography>
                      </Box>
                    )}
                    {formData.mode === "active" && (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="success.main"
                        >
                          🤖 Modo Ativo
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          A IA <strong>responde automaticamente</strong> todas
                          as mensagens dos clientes. Ela analisa o contexto,
                          consulta seus produtos e responde como uma atendente
                          real. Ideal para atendimento 24/7 sem intervenção
                          manual.
                        </Typography>
                      </Box>
                    )}
                    {formData.mode === "supervised" && (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="warning.main"
                        >
                          👀 Modo Supervisionado
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          A IA <strong>prepara as respostas</strong> mas{" "}
                          <strong>aguarda sua aprovação</strong> antes de
                          enviar. Você vê a sugestão de resposta e pode aprovar,
                          editar ou descartar. Perfeito para quem quer controle
                          total mas com ajuda da IA.
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom fontWeight="bold">
                    Personalidade
                  </Typography>
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
                  <Paper sx={{ mt: 1, p: 2, bgcolor: "background.default" }}>
                    {formData.personality === "professional" && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          💼 Profissional
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tom formal e objetivo. Usa "você" e linguagem
                          corporativa. Ideal para escritórios, consultórios e
                          empresas B2B.
                          <br />
                          <em>Exemplo: "Olá! Como posso ajudá-lo hoje?"</em>
                        </Typography>
                      </Box>
                    )}
                    {formData.personality === "friendly" && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          😊 Amigável
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tom caloroso e acolhedor. Usa emojis moderadamente e
                          demonstra empatia. Ideal para lojas, restaurantes e
                          serviços ao consumidor.
                          <br />
                          <em>
                            Exemplo: "Oi! Que bom te ver por aqui! 😊 Como posso
                            ajudar?"
                          </em>
                        </Typography>
                      </Box>
                    )}
                    {formData.personality === "casual" && (
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          🤙 Casual
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tom descontraído e informal. Usa gírias leves e
                          expressões populares. Ideal para público jovem,
                          e-commerce de moda e entretenimento.
                          <br />
                          <em>
                            Exemplo: "E aí! Beleza? Bora ver o que temos pra
                            você!"
                          </em>
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography gutterBottom fontWeight="bold">
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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">
            Conversas Monitoradas ({conversations.length})
          </Typography>
          <Button startIcon={<RefreshIcon />} onClick={loadData} size="small">
            Atualizar
          </Button>
        </Box>

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
              <Grid item xs={12} key={conv.id}>
                <Card
                  sx={{
                    border: !conv.aiEnabled ? 2 : 0,
                    borderColor: "warning.main",
                    bgcolor:
                      expandedConversation === conv.id
                        ? "action.hover"
                        : "background.paper",
                  }}
                >
                  <CardContent>
                    {/* Cabeçalho com info do contato e ações */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={1}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        {conv.contact.profilePicUrl ? (
                          <Box
                            component="img"
                            src={conv.contact.profilePicUrl}
                            sx={{ width: 40, height: 40, borderRadius: "50%" }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                            }}
                          >
                            <PersonIcon />
                          </Box>
                        )}
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {conv.contact.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatPhone(conv.remoteJid)} • {conv.instanceName}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={conv.priority}
                          color={getPriorityColor(conv.priority) as any}
                          size="small"
                        />
                        <Chip
                          icon={conv.aiEnabled ? <AIIcon /> : <PersonIcon />}
                          label={conv.aiEnabled ? "IA" : "Humano"}
                          color={conv.aiEnabled ? "success" : "warning"}
                          size="small"
                          variant="outlined"
                        />

                        {/* Toggle AI Button */}
                        <Tooltip
                          title={
                            conv.aiEnabled ? "Desabilitar IA" : "Habilitar IA"
                          }
                        >
                          <IconButton
                            size="small"
                            color={conv.aiEnabled ? "error" : "success"}
                            onClick={() =>
                              handleToggleAI(conv.id, conv.aiEnabled)
                            }
                            disabled={togglingAI === conv.id}
                          >
                            {togglingAI === conv.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <ToggleAIIcon />
                            )}
                          </IconButton>
                        </Tooltip>

                        {/* Intervene Button */}
                        <Tooltip title="Intervir (abre chat)">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleIntervene(conv)}
                          >
                            <InterventionIcon />
                          </IconButton>
                        </Tooltip>

                        {/* Expand/Collapse */}
                        <Tooltip
                          title={
                            expandedConversation === conv.id
                              ? "Recolher"
                              : "Ver mensagens"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              setExpandedConversation(
                                expandedConversation === conv.id
                                  ? null
                                  : conv.id
                              )
                            }
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Preview da última mensagem */}
                    {conv.recentMessages.length > 0 &&
                      expandedConversation !== conv.id && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ ml: 6 }}
                        >
                          {conv.recentMessages[conv.recentMessages.length - 1]
                            ?.direction === "incoming"
                            ? "👤"
                            : "🤖"}{" "}
                          {conv.recentMessages[
                            conv.recentMessages.length - 1
                          ]?.content?.substring(0, 80)}
                          {(conv.recentMessages[conv.recentMessages.length - 1]
                            ?.content?.length || 0) > 80
                            ? "..."
                            : ""}
                        </Typography>
                      )}

                    {/* Mensagens expandidas */}
                    {expandedConversation === conv.id && (
                      <Paper
                        sx={{
                          mt: 2,
                          p: 2,
                          maxHeight: 300,
                          overflow: "auto",
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          gutterBottom
                          color="text.secondary"
                        >
                          Últimas mensagens:
                        </Typography>
                        {conv.recentMessages.map((msg, idx) => (
                          <Box
                            key={msg.id}
                            sx={{
                              mb: 1.5,
                              p: 1,
                              borderRadius: 1,
                              bgcolor:
                                msg.direction === "incoming"
                                  ? "grey.100"
                                  : "primary.50",
                              borderLeft: 3,
                              borderColor:
                                msg.direction === "incoming"
                                  ? "grey.400"
                                  : "primary.main",
                            }}
                          >
                            <Box
                              display="flex"
                              justifyContent="space-between"
                              alignItems="center"
                              mb={0.5}
                            >
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                color={
                                  msg.direction === "incoming"
                                    ? "text.primary"
                                    : "primary.main"
                                }
                              >
                                {msg.direction === "incoming"
                                  ? "👤 Cliente"
                                  : "🤖 IA"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  "pt-BR"
                                )}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {msg.content}
                            </Typography>
                            {msg.response && msg.direction === "incoming" && (
                              <Box
                                sx={{
                                  mt: 1,
                                  pl: 2,
                                  borderLeft: 2,
                                  borderColor: "success.main",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="success.main"
                                  fontWeight="bold"
                                >
                                  💬 Resposta da IA:
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ whiteSpace: "pre-wrap" }}
                                >
                                  {msg.response}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Paper>
                    )}

                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={1}
                      sx={{ ml: 6 }}
                    >
                      {conv.summary && (
                        <Typography variant="caption" color="text.secondary">
                          📝 {conv.summary}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: "auto" }}
                      >
                        {new Date(conv.lastMessageAt).toLocaleString("pt-BR")}
                      </Typography>
                    </Box>
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
