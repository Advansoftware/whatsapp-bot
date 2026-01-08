import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  AccessTime,
  TextFields,
  PersonAdd,
  Message,
  Label,
  PlayArrow,
  Pause,
} from "@mui/icons-material";
import api from "../../lib/api";
import ConfirmDialog, { ConfirmDialogProps } from "../common/ConfirmDialog";

interface SecretaryTask {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: any;
  actionType: string;
  actionConfig: any;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

const TRIGGER_TYPES = [
  { value: "time_range", label: "Horário Específico", icon: <AccessTime /> },
  { value: "keyword", label: "Palavra-chave", icon: <TextFields /> },
  { value: "first_message", label: "Primeira Mensagem", icon: <PersonAdd /> },
  { value: "always", label: "Sempre", icon: <PlayArrow /> },
];

const ACTION_TYPES = [
  { value: "send_message", label: "Enviar Mensagem" },
  { value: "add_to_response", label: "Adicionar à Resposta" },
  { value: "set_tag", label: "Adicionar Tag" },
];

const TasksView: React.FC = () => {
  const theme = useTheme();
  const [tasks, setTasks] = useState<SecretaryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SecretaryTask | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    Omit<ConfirmDialogProps, "open" | "onClose"> & { open: boolean }
  >({
    open: false,
    title: "",
    content: "",
    onConfirm: async () => {},
  });

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    triggerType: "time_range",
    actionType: "send_message",
    priority: 5,
    isActive: true,
    // Time range config
    startHour: 0,
    endHour: 8,
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    // Keyword config
    keywords: "",
    matchType: "any",
    // First message config
    onlyNewContacts: true,
    // Send message config
    message: "",
    replaceResponse: true,
    // Add to response config
    prefix: "",
    suffix: "",
    // Set tag config
    tags: "",
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getSecretaryTasks();
      setTasks(response || []);
    } catch (err) {
      setError("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      triggerType: "time_range",
      actionType: "send_message",
      priority: 5,
      isActive: true,
      startHour: 0,
      endHour: 8,
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      keywords: "",
      matchType: "any",
      onlyNewContacts: true,
      message: "",
      replaceResponse: true,
      prefix: "",
      suffix: "",
      tags: "",
    });
    setEditingTask(null);
  };

  const handleOpenDialog = (task?: SecretaryTask) => {
    if (task) {
      setEditingTask(task);
      const tc = task.triggerConfig || {};
      const ac = task.actionConfig || {};
      setForm({
        name: task.name,
        description: task.description,
        triggerType: task.triggerType,
        actionType: task.actionType,
        priority: task.priority,
        isActive: task.isActive,
        startHour: tc.startHour || 0,
        endHour: tc.endHour || 8,
        days: tc.days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        keywords: (tc.keywords || []).join(", "),
        matchType: tc.matchType || "any",
        onlyNewContacts: tc.onlyNewContacts ?? true,
        message: ac.message || "",
        replaceResponse: ac.replaceResponse ?? true,
        prefix: ac.prefix || "",
        suffix: ac.suffix || "",
        tags: (ac.tags || []).join(", "),
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const buildTriggerConfig = () => {
    switch (form.triggerType) {
      case "time_range":
        return {
          startHour: form.startHour,
          endHour: form.endHour,
          days: form.days,
        };
      case "keyword":
        return {
          keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          matchType: form.matchType,
        };
      case "first_message":
        return { onlyNewContacts: form.onlyNewContacts };
      case "always":
        return {};
      default:
        return {};
    }
  };

  const buildActionConfig = () => {
    switch (form.actionType) {
      case "send_message":
        return {
          message: form.message,
          replaceResponse: form.replaceResponse,
        };
      case "add_to_response":
        return {
          prefix: form.prefix,
          suffix: form.suffix,
        };
      case "set_tag":
        return {
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        };
      default:
        return {};
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        name: form.name,
        description: form.description,
        triggerType: form.triggerType,
        triggerConfig: buildTriggerConfig(),
        actionType: form.actionType,
        actionConfig: buildActionConfig(),
        priority: form.priority,
        isActive: form.isActive,
      };

      if (editingTask) {
        await api.updateSecretaryTask(editingTask.id, data);
        setSuccess("Tarefa atualizada com sucesso!");
      } else {
        await api.createSecretaryTask(data);
        setSuccess("Tarefa criada com sucesso!");
      }

      handleCloseDialog();
      loadTasks();
    } catch (err) {
      setError("Erro ao salvar tarefa");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Excluir Tarefa",
      content: "Tem certeza que deseja excluir esta tarefa?",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      confirmColor: "error",
      onConfirm: async () => {
        try {
          await api.deleteSecretaryTask(id);
          setSuccess("Tarefa excluída com sucesso!");
          loadTasks();
        } catch (err) {
          setError("Erro ao excluir tarefa");
        } finally {
            setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleSecretaryTask(id);
      loadTasks();
    } catch (err) {
      setError("Erro ao alternar tarefa");
    }
  };

  const getTriggerLabel = (type: string) => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === type);
    return trigger?.label || type;
  };

  const getTriggerDescription = (task: SecretaryTask) => {
    const config = task.triggerConfig || {};
    switch (task.triggerType) {
      case "time_range":
        return `Das ${config.startHour}h às ${config.endHour}h`;
      case "keyword":
        return `Palavras: ${(config.keywords || []).join(", ")}`;
      case "first_message":
        return config.onlyNewContacts ? "Apenas novos contatos" : "Qualquer primeira mensagem";
      case "always":
        return "Sempre ativo";
      default:
        return "";
    }
  };

  const DAY_LABELS: { [key: string]: string } = {
    mon: "Seg",
    tue: "Ter",
    wed: "Qua",
    thu: "Qui",
    fri: "Sex",
    sat: "Sáb",
    sun: "Dom",
  };

  return (
    <Box p={4}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        title={confirmDialog.title}
        content={confirmDialog.content}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmColor={confirmDialog.confirmColor}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            📋 Tarefas da Secretária
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure tarefas automatizadas para sua assistente pessoal executar.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: "#00a884", "&:hover": { bgcolor: "#008f72" } }}
        >
          Nova Tarefa
        </Button>
      </Box>

      {/* Tasks List */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="h6" gutterBottom>
              Nenhuma tarefa configurada
            </Typography>
            <Typography color="text.secondary" mb={2}>
              Crie tarefas para automatizar respostas da sua secretária.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Criar Primeira Tarefa
            </Button>
          </Box>
        ) : (
          <List>
            {tasks.map((task, idx) => (
              <React.Fragment key={task.id}>
                {idx > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    opacity: task.isActive ? 1 : 0.6,
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography fontWeight="600">{task.name}</Typography>
                        <Chip
                          label={getTriggerLabel(task.triggerType)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {!task.isActive && (
                          <Chip label="Pausada" size="small" color="warning" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {task.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ⚡ {getTriggerDescription(task)} • Prioridade: {task.priority}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title={task.isActive ? "Pausar" : "Ativar"}>
                      <IconButton onClick={() => handleToggle(task.id)}>
                        {task.isActive ? <Pause /> : <PlayArrow />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleOpenDialog(task)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton onClick={() => handleDelete(task.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Tarefa"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Modo Dormir"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="O que essa tarefa faz?"
              />
            </Grid>

            {/* Trigger Type */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                ⚡ Quando Executar
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Gatilho</InputLabel>
                <Select
                  value={form.triggerType}
                  label="Tipo de Gatilho"
                  onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                >
                  {TRIGGER_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Prioridade (1-10)"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 5 })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>

            {/* Trigger Config - Time Range */}
            {form.triggerType === "time_range" && (
              <>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Hora Início"
                    value={form.startHour}
                    onChange={(e) => setForm({ ...form, startHour: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 23 }}
                    helperText="0 = meia-noite"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Hora Fim"
                    value={form.endHour}
                    onChange={(e) => setForm({ ...form, endHour: parseInt(e.target.value) || 0 })}
                    inputProps={{ min: 0, max: 23 }}
                    helperText="8 = 8h da manhã"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom>
                    Dias da Semana:
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {Object.entries(DAY_LABELS).map(([key, label]) => (
                      <Chip
                        key={key}
                        label={label}
                        color={form.days.includes(key) ? "primary" : "default"}
                        onClick={() => {
                          if (form.days.includes(key)) {
                            setForm({ ...form, days: form.days.filter((d) => d !== key) });
                          } else {
                            setForm({ ...form, days: [...form.days, key] });
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </>
            )}

            {/* Trigger Config - Keyword */}
            {form.triggerType === "keyword" && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Palavras-chave (separadas por vírgula)"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    placeholder="preço, valor, quanto custa"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Correspondência</InputLabel>
                    <Select
                      value={form.matchType}
                      label="Correspondência"
                      onChange={(e) => setForm({ ...form, matchType: e.target.value })}
                    >
                      <MenuItem value="any">Qualquer palavra</MenuItem>
                      <MenuItem value="all">Todas as palavras</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {/* Trigger Config - First Message */}
            {form.triggerType === "first_message" && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.onlyNewContacts}
                      onChange={(e) => setForm({ ...form, onlyNewContacts: e.target.checked })}
                    />
                  }
                  label="Apenas contatos novos (nunca vistos antes)"
                />
              </Grid>
            )}

            {/* Action Type */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                💬 O Que Fazer
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Ação</InputLabel>
                <Select
                  value={form.actionType}
                  label="Tipo de Ação"
                  onChange={(e) => setForm({ ...form, actionType: e.target.value })}
                >
                  {ACTION_TYPES.map((a) => (
                    <MenuItem key={a.value} value={a.value}>
                      {a.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Action Config - Send Message */}
            {form.actionType === "send_message" && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Mensagem"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="O Rafael está descansando, ele responde assim que acordar! 😊"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.replaceResponse}
                        onChange={(e) => setForm({ ...form, replaceResponse: e.target.checked })}
                      />
                    }
                    label="Substituir resposta da IA (desligado = envia antes da IA responder)"
                  />
                </Grid>
              </>
            )}

            {/* Action Config - Add to Response */}
            {form.actionType === "add_to_response" && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Texto antes da resposta"
                    value={form.prefix}
                    onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                    placeholder="⚠️ Atenção: Estou em horário de descanso."
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Texto depois da resposta"
                    value={form.suffix}
                    onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                    placeholder="Responderei com mais detalhes amanhã!"
                  />
                </Grid>
              </>
            )}

            {/* Action Config - Set Tag */}
            {form.actionType === "set_tag" && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tags a adicionar (separadas por vírgula)"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="lead, interessado, noturno"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name || !form.description}
          >
            {editingTask ? "Salvar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksView;
