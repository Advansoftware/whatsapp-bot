"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  Autocomplete,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Campaign as CampaignIcon,
  Add,
  Edit,
  Delete,
  PlayArrow,
  Stop,
  Send,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Pending,
  People,
} from "@mui/icons-material";
import api from "../../lib/api";

interface Campaign {
  id: string;
  name: string;
  message: string;
  mediaUrl: string | null;
  mediaType: string | null;
  status: "draft" | "scheduled" | "running" | "completed" | "cancelled";
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  targetAll: boolean;
  targetTags: string[];
  targetGenders: string[];
  targetCities: string[];
  targetStates: string[];
  targetUniversities: string[];
  targetCourses: string[];
  targetMinAge: number | null;
  targetMaxAge: number | null;
  totalRecipients: number;
  sentCount: number;
  pendingCount: number;
  failedCount: number;
  createdAt: string;
}

interface CampaignStats {
  totalCampaigns: number;
  runningCampaigns: number;
  completedCampaigns: number;
  scheduledCampaigns: number;
  totalMessagesSent: number;
}

interface SegmentOptions {
  tags: string[];
  genders: string[];
  cities: string[];
  states: string[];
  universities: string[];
  courses: string[];
  occupations: string[];
}

const statusColors: Record<
  string,
  "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"
> = {
  draft: "default",
  scheduled: "info",
  running: "warning",
  completed: "success",
  cancelled: "error",
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  running: "Em Execução",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const CampaignsView: React.FC = () => {
  const theme = useTheme();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [open, setOpen] = useState(false);
  const [segments, setSegments] = useState<SegmentOptions>({
    tags: [],
    genders: [],
    cities: [],
    states: [],
    universities: [],
    courses: [],
    occupations: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    message: "",
    mediaUrl: "",
    targetAll: true,
    targetTags: [] as string[],
    targetGenders: [] as string[],
    targetCities: [] as string[],
    targetStates: [] as string[],
    targetUniversities: [] as string[],
    targetCourses: [] as string[],
    targetMinAge: "" as string,
    targetMaxAge: "" as string,
    scheduledAt: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsData, statsData, segmentsData] = await Promise.all([
        api.getCampaigns(),
        api.getCampaignStats(),
        api.getSegmentOptions(),
      ]);
      setCampaigns(campaignsData);
      setStats(statsData);
      setSegments(segmentsData);
    } catch (err) {
      setError("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenNew = () => {
    setFormData({
      id: "",
      name: "",
      message: "",
      mediaUrl: "",
      targetAll: true,
      targetTags: [],
      targetGenders: [],
      targetCities: [],
      targetStates: [],
      targetUniversities: [],
      targetCourses: [],
      targetMinAge: "",
      targetMaxAge: "",
      scheduledAt: "",
    });
    setOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      id: campaign.id,
      name: campaign.name,
      message: campaign.message,
      mediaUrl: campaign.mediaUrl || "",
      targetAll: campaign.targetAll,
      targetTags: campaign.targetTags || [],
      targetGenders: campaign.targetGenders || [],
      targetCities: campaign.targetCities || [],
      targetStates: campaign.targetStates || [],
      targetUniversities: campaign.targetUniversities || [],
      targetCourses: campaign.targetCourses || [],
      targetMinAge: campaign.targetMinAge?.toString() || "",
      targetMaxAge: campaign.targetMaxAge?.toString() || "",
      scheduledAt: campaign.scheduledAt || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.message.trim()) {
      setError("Nome e mensagem são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        targetMinAge: formData.targetMinAge
          ? parseInt(formData.targetMinAge)
          : undefined,
        targetMaxAge: formData.targetMaxAge
          ? parseInt(formData.targetMaxAge)
          : undefined,
      };

      if (formData.id) {
        await api.updateCampaign(formData.id, payload);
      } else {
        await api.createCampaign(payload);
      }
      setSuccess("Campanha salva com sucesso!");
      setOpen(false);
      loadData();
    } catch (err) {
      setError("Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta campanha?"))
      return;

    try {
      await api.deleteCampaign(id);
      setSuccess("Campanha excluída!");
      loadData();
    } catch (err) {
      setError("Erro ao excluir campanha");
    }
  };

  const handleStart = async (id: string) => {
    if (
      !window.confirm(
        "Iniciar envio da campanha? Esta ação não pode ser desfeita."
      )
    )
      return;

    try {
      const result = await api.startCampaign(id);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.message || "Campanha iniciada!");
        loadData();
      }
    } catch (err) {
      setError("Erro ao iniciar campanha");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelCampaign(id);
      setSuccess("Campanha cancelada!");
      loadData();
    } catch (err) {
      setError("Erro ao cancelar campanha");
    }
  };

  const getProgress = (campaign: Campaign) => {
    if (campaign.totalRecipients === 0) return 0;
    return Math.round(
      ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) *
        100
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
    <Box p={4}>
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

      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <CampaignIcon color="primary" />
            Campanhas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Envie mensagens em massa para seus contatos.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenNew}
          size="large"
        >
          Nova Campanha
        </Button>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="primary.main">
                {stats.totalCampaigns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="warning.main">
                {stats.runningCampaigns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Em Execução
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="success.main">
                {stats.completedCampaigns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Concluídas
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6, md: 2.4 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="info.main">
                {stats.scheduledCampaigns}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Agendadas
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color="secondary.main">
                {stats.totalMessagesSent}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Mensagens Enviadas
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Campaigns List */}
      <Grid container spacing={3}>
        {campaigns.map((campaign) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={campaign.id}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.2s",
                "&:hover": { boxShadow: theme.shadows[8] },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={2}
                >
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    noWrap
                    sx={{ flex: 1 }}
                  >
                    {campaign.name}
                  </Typography>
                  <Chip
                    label={statusLabels[campaign.status]}
                    color={statusColors[campaign.status]}
                    size="small"
                  />
                </Box>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {campaign.message}
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  <Chip
                    icon={<People />}
                    label={`${campaign.totalRecipients} destinatários`}
                    size="small"
                    variant="outlined"
                  />
                  {campaign.targetAll ? (
                    <Chip
                      label="Todos os contatos"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    campaign.targetTags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                      />
                    ))
                  )}
                </Box>

                {campaign.status === "running" && (
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption">Progresso</Typography>
                      <Typography variant="caption">
                        {getProgress(campaign)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getProgress(campaign)}
                      sx={{ borderRadius: 1 }}
                    />
                    <Box display="flex" gap={2} mt={1}>
                      <Typography variant="caption" color="success.main">
                        ✓ {campaign.sentCount} enviados
                      </Typography>
                      <Typography variant="caption" color="error.main">
                        ✗ {campaign.failedCount} falhas
                      </Typography>
                    </Box>
                  </Box>
                )}

                {campaign.status === "completed" && (
                  <Box display="flex" gap={2} mb={2}>
                    <Chip
                      icon={<CheckCircle />}
                      label={`${campaign.sentCount} enviados`}
                      color="success"
                      size="small"
                    />
                    {campaign.failedCount > 0 && (
                      <Chip
                        icon={<ErrorIcon />}
                        label={`${campaign.failedCount} falhas`}
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                  <Box>
                    {campaign.status === "draft" && (
                      <>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(campaign)}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Iniciar">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleStart(campaign.id)}
                          >
                            <PlayArrow fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {campaign.status === "running" && (
                      <Tooltip title="Cancelar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCancel(campaign.id)}
                        >
                          <Stop fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(campaign.id)}
                        disabled={campaign.status === "running"}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {campaigns.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <CampaignIcon
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Nenhuma campanha criada
              </Typography>
              <Typography color="text.secondary" paragraph>
                Crie sua primeira campanha para enviar mensagens em massa.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenNew}
              >
                Criar Campanha
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Campaign Editor Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {formData.id ? "Editar Campanha" : "Nova Campanha"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nome da Campanha"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Promoção de Ano Novo"
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Mensagem"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                placeholder="Digite a mensagem que será enviada..."
                helperText="Use {nome} para inserir o nome do contato"
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Segmentação
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.targetAll}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAll: e.target.checked })
                    }
                  />
                }
                label="Enviar para todos os contatos"
              />
            </Grid>
            {!formData.targetAll && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Configure os filtros abaixo. Contatos que correspondem a{" "}
                    <strong>todos</strong> os critérios selecionados receberão a
                    mensagem.
                  </Alert>
                </Grid>

                {/* Tags */}
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={segments.tags}
                    value={formData.targetTags}
                    onChange={(_, newValue) =>
                      setFormData({ ...formData, targetTags: newValue })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tags"
                        placeholder="Filtrar por tags"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Gênero */}
                <Grid size={{ xs: 6 }}>
                  <Autocomplete
                    multiple
                    options={[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Feminino" },
                      { value: "other", label: "Outro" },
                    ]}
                    getOptionLabel={(opt) =>
                      typeof opt === "string" ? opt : opt.label
                    }
                    value={formData.targetGenders.map((g) => ({
                      value: g,
                      label:
                        g === "male"
                          ? "Masculino"
                          : g === "female"
                          ? "Feminino"
                          : "Outro",
                    }))}
                    onChange={(_, newValue) =>
                      setFormData({
                        ...formData,
                        targetGenders: newValue.map((v) =>
                          typeof v === "string" ? v : v.value
                        ),
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Gênero"
                        placeholder="Filtrar por gênero"
                      />
                    )}
                    isOptionEqualToValue={(opt, val) =>
                      (typeof opt === "string" ? opt : opt.value) ===
                      (typeof val === "string" ? val : val.value)
                    }
                  />
                </Grid>

                {/* Faixa etária */}
                <Grid size={{ xs: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Idade Mínima"
                    value={formData.targetMinAge}
                    onChange={(e) =>
                      setFormData({ ...formData, targetMinAge: e.target.value })
                    }
                    placeholder="18"
                  />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Idade Máxima"
                    value={formData.targetMaxAge}
                    onChange={(e) =>
                      setFormData({ ...formData, targetMaxAge: e.target.value })
                    }
                    placeholder="35"
                  />
                </Grid>

                {/* Cidade */}
                <Grid size={{ xs: 6 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={segments.cities}
                    value={formData.targetCities}
                    onChange={(_, newValue) =>
                      setFormData({
                        ...formData,
                        targetCities: newValue as string[],
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Cidades"
                        placeholder="Filtrar por cidade"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Estado */}
                <Grid size={{ xs: 6 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={segments.states}
                    value={formData.targetStates}
                    onChange={(_, newValue) =>
                      setFormData({
                        ...formData,
                        targetStates: newValue as string[],
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Estados"
                        placeholder="Filtrar por estado"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Universidade */}
                <Grid size={{ xs: 6 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={segments.universities}
                    value={formData.targetUniversities}
                    onChange={(_, newValue) =>
                      setFormData({
                        ...formData,
                        targetUniversities: newValue as string[],
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Universidades"
                        placeholder="Filtrar por universidade"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                </Grid>

                {/* Curso */}
                <Grid size={{ xs: 6 }}>
                  <Autocomplete
                    multiple
                    freeSolo
                    options={segments.courses}
                    value={formData.targetCourses}
                    onChange={(_, newValue) =>
                      setFormData({
                        ...formData,
                        targetCourses: newValue as string[],
                      })
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Cursos"
                        placeholder="Filtrar por curso"
                      />
                    )}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          key={option}
                          label={option}
                          size="small"
                        />
                      ))
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={20} /> : <Send />}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Campanha"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignsView;
