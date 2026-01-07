import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
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
  Alert,
  CircularProgress,
  Tooltip,
  Collapse,
  Tabs,
  Tab,
  Autocomplete,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Pause,
  Visibility,
  ExpandMore,
  ExpandLess,
  Group,
  AutoAwesome,
  DataObject,
} from "@mui/icons-material";
import api from "../../lib/api";

interface GroupAutomation {
  id: string;
  name: string;
  description?: string;
  groupRemoteJid?: string;
  groupNameMatch?: string;
  capturePattern?: string;
  actionType: string;
  actionConfig: any;
  startsAt?: string;
  expiresAt?: string;
  priority: number;
  shouldReply: boolean;
  replyOnlyOnce: boolean;
  skipAiAfter: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { collectedData: number };
}

interface AvailableGroup {
  remoteJid: string;
  groupName: string | null;
  groupDescription: string | null;
}

const ACTION_TYPES = [
  {
    value: "collect_data",
    label: "Coletar Dados",
    description: "Captura dados das mensagens e salva no banco",
  },
  {
    value: "auto_reply",
    label: "Resposta Automática",
    description: "Responde automaticamente quando padrão é detectado",
  },
  {
    value: "webhook",
    label: "Webhook",
    description: "Envia dados para uma URL externa",
  },
  {
    value: "aggregate",
    label: "Agregar",
    description: "Soma, conta ou agrupa dados coletados",
  },
];

const DATA_TYPES = [
  { value: "lottery_numbers", label: "Números de Loteria", pattern: "\\d+" },
  {
    value: "money",
    label: "Valores Monetários",
    pattern: "R?\\$?\\s*\\d+[.,]?\\d*",
  },
  {
    value: "phone",
    label: "Telefone",
    pattern: "\\(?\\d{2}\\)?\\s*\\d{4,5}[-.\\s]?\\d{4}",
  },
  {
    value: "email",
    label: "E-mail",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  },
  { value: "custom", label: "Padrão Customizado", pattern: "" },
];

export default function GroupAutomationsView() {
  const [automations, setAutomations] = useState<GroupAutomation[]>([]);
  const [groups, setGroups] = useState<AvailableGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<string | null>(null);
  const [viewDataOpen, setViewDataOpen] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<any[]>([]);
  const [editingAutomation, setEditingAutomation] =
    useState<GroupAutomation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    groupRemoteJid: "",
    groupNameMatch: "",
    capturePattern: "",
    actionType: "collect_data",
    actionConfig: {} as any,
    startsAt: "",
    expiresAt: "",
    priority: 0,
    shouldReply: true,
    replyOnlyOnce: false,
    skipAiAfter: true,
    isActive: true,
    // Helpers
    dataType: "lottery_numbers",
    replyTemplate: "",
    webhookUrl: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [automationsData, groupsData] = await Promise.all([
        api.getGroupAutomations(),
        api.getAvailableGroups(),
      ]);
      setAutomations(automationsData);
      setGroups(groupsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (automation?: GroupAutomation) => {
    if (automation) {
      setEditingAutomation(automation);
      setFormData({
        name: automation.name,
        description: automation.description || "",
        groupRemoteJid: automation.groupRemoteJid || "",
        groupNameMatch: automation.groupNameMatch || "",
        capturePattern: automation.capturePattern || "",
        actionType: automation.actionType,
        actionConfig: automation.actionConfig || {},
        startsAt: automation.startsAt ? automation.startsAt.slice(0, 16) : "",
        expiresAt: automation.expiresAt
          ? automation.expiresAt.slice(0, 16)
          : "",
        priority: automation.priority,
        shouldReply: automation.shouldReply,
        replyOnlyOnce: automation.replyOnlyOnce,
        skipAiAfter: automation.skipAiAfter,
        isActive: automation.isActive,
        dataType: automation.actionConfig?.dataType || "lottery_numbers",
        replyTemplate: automation.actionConfig?.replyTemplate || "",
        webhookUrl: automation.actionConfig?.url || "",
      });
    } else {
      setEditingAutomation(null);
      setFormData({
        name: "",
        description: "",
        groupRemoteJid: "",
        groupNameMatch: "",
        capturePattern: "",
        actionType: "collect_data",
        actionConfig: {},
        startsAt: "",
        expiresAt: "",
        priority: 0,
        shouldReply: true,
        replyOnlyOnce: false,
        skipAiAfter: true,
        isActive: true,
        dataType: "lottery_numbers",
        replyTemplate:
          "✅ Dados registrados!\n👤 {{participantName}}\n📊 {{numbers}}",
        webhookUrl: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      // Build actionConfig based on actionType
      let actionConfig: any = {};

      if (formData.actionType === "collect_data") {
        actionConfig = {
          dataType: formData.dataType,
          replyTemplate: formData.replyTemplate,
        };
      } else if (formData.actionType === "auto_reply") {
        actionConfig = {
          replyTemplate: formData.replyTemplate,
        };
      } else if (formData.actionType === "webhook") {
        actionConfig = {
          url: formData.webhookUrl,
          method: "POST",
          successReply: formData.replyTemplate,
        };
      } else if (formData.actionType === "aggregate") {
        actionConfig = {
          operation: "count",
          replyTemplate: formData.replyTemplate,
        };
      }

      // Set capture pattern based on data type
      let capturePattern = formData.capturePattern;
      if (!capturePattern && formData.dataType) {
        const dataTypeConfig = DATA_TYPES.find(
          (dt) => dt.value === formData.dataType
        );
        if (dataTypeConfig) {
          capturePattern = dataTypeConfig.pattern;
        }
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        groupRemoteJid: formData.groupRemoteJid || null,
        groupNameMatch: formData.groupNameMatch || null,
        capturePattern,
        actionType: formData.actionType,
        actionConfig,
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null,
        priority: formData.priority,
        shouldReply: formData.shouldReply,
        replyOnlyOnce: formData.replyOnlyOnce,
        skipAiAfter: formData.skipAiAfter,
        isActive: formData.isActive,
      };

      if (editingAutomation) {
        await api.updateGroupAutomation(editingAutomation.id, payload);
        setSuccess("Automação atualizada com sucesso!");
      } else {
        await api.createGroupAutomation(payload);
        setSuccess("Automação criada com sucesso!");
      }

      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.toggleGroupAutomation(id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta automação?")) return;

    try {
      await api.deleteGroupAutomation(id);
      setSuccess("Automação excluída com sucesso!");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewData = async (id: string) => {
    try {
      const data = await api.getGroupAutomationData(id);
      setCollectedData(data);
      setViewDataOpen(id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("pt-BR");
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
    <Box p={3}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            gap={1}
          >
            <AutoAwesome color="primary" />
            Automações de Grupo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crie regras automáticas para processar mensagens em grupos
            específicos
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nova Automação
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {automations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Group sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma automação configurada
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Crie sua primeira automação para processar mensagens de grupos
            automaticamente
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Criar Automação
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Grupo</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="center">Dados</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Validade</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {automations.map((auto) => (
                <React.Fragment key={auto.id}>
                  <TableRow hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{auto.name}</Typography>
                        {auto.description && (
                          <Typography variant="caption" color="text.secondary">
                            {auto.description.substring(0, 50)}...
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {auto.groupRemoteJid ? (
                        <Chip
                          size="small"
                          icon={<Group />}
                          label={
                            groups.find(
                              (g) => g.remoteJid === auto.groupRemoteJid
                            )?.groupName || "Grupo"
                          }
                        />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={auto.groupNameMatch || "Padrão"}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          ACTION_TYPES.find((t) => t.value === auto.actionType)
                            ?.label || auto.actionType
                        }
                        color={
                          auto.actionType === "collect_data"
                            ? "primary"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      {auto._count?.collectedData ? (
                        <Chip
                          size="small"
                          icon={<DataObject />}
                          label={auto._count.collectedData}
                          color="success"
                          onClick={() => handleViewData(auto.id)}
                          sx={{ cursor: "pointer" }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={auto.isActive ? <PlayArrow /> : <Pause />}
                        label={auto.isActive ? "Ativo" : "Inativo"}
                        color={auto.isActive ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {auto.expiresAt ? (
                        new Date(auto.expiresAt) > new Date() ? (
                          <Typography variant="caption">
                            até{" "}
                            {new Date(auto.expiresAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </Typography>
                        ) : (
                          <Chip size="small" label="Expirado" color="error" />
                        )
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sem limite
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalhes">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setDetailsOpen(
                              detailsOpen === auto.id ? null : auto.id
                            )
                          }
                        >
                          {detailsOpen === auto.id ? (
                            <ExpandLess />
                          ) : (
                            <ExpandMore />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={auto.isActive ? "Desativar" : "Ativar"}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggle(auto.id)}
                        >
                          {auto.isActive ? <Pause /> : <PlayArrow />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(auto)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(auto.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0 }}>
                      <Collapse in={detailsOpen === auto.id}>
                        <Box sx={{ p: 2, bgcolor: "action.hover" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Detalhes da Automação
                          </Typography>
                          <Box
                            display="grid"
                            gridTemplateColumns="repeat(3, 1fr)"
                            gap={2}
                          >
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Padrão de Captura
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: "monospace" }}
                              >
                                {auto.capturePattern || "Qualquer mensagem"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Prioridade
                              </Typography>
                              <Typography variant="body2">
                                {auto.priority}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Criado em
                              </Typography>
                              <Typography variant="body2">
                                {formatDate(auto.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                          <Box mt={1} display="flex" gap={1}>
                            <Chip
                              size="small"
                              label={
                                auto.shouldReply ? "Responde" : "Não responde"
                              }
                            />
                            <Chip
                              size="small"
                              label={
                                auto.replyOnlyOnce ? "1x por pessoa" : "Sempre"
                              }
                            />
                            <Chip
                              size="small"
                              label={
                                auto.skipAiAfter ? "Pula IA" : "Continua IA"
                              }
                            />
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAutomation ? "Editar Automação" : "Nova Automação de Grupo"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Nome da Automação"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Bolão Mega da Virada"
              fullWidth
              required
            />

            <TextField
              label="Descrição"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descreva o que essa automação faz"
              fullWidth
              multiline
              rows={2}
            />

            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Selecione o Grupo
            </Typography>

            <Autocomplete
              options={groups}
              getOptionLabel={(option) => option.groupName || option.remoteJid}
              value={
                groups.find((g) => g.remoteJid === formData.groupRemoteJid) ||
                null
              }
              onChange={(_, newValue) =>
                setFormData({
                  ...formData,
                  groupRemoteJid: newValue?.remoteJid || "",
                  groupNameMatch: "",
                })
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Grupo específico"
                  placeholder="Selecione um grupo"
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Group sx={{ mr: 1, color: "text.secondary" }} />
                  {option.groupName || option.remoteJid}
                </li>
              )}
            />

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              ou
            </Typography>

            <TextField
              label="Padrão de nome do grupo (regex)"
              value={formData.groupNameMatch}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  groupNameMatch: e.target.value,
                  groupRemoteJid: "",
                })
              }
              placeholder="Ex: mega.*virada"
              disabled={!!formData.groupRemoteJid}
              fullWidth
              helperText="Use regex para aplicar a múltiplos grupos com nomes similares"
            />

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Tipo de Ação</InputLabel>
              <Select
                value={formData.actionType}
                label="Tipo de Ação"
                onChange={(e) =>
                  setFormData({ ...formData, actionType: e.target.value })
                }
              >
                {ACTION_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box>
                      <Typography>{type.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {type.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.actionType === "collect_data" && (
              <FormControl fullWidth>
                <InputLabel>Tipo de Dados</InputLabel>
                <Select
                  value={formData.dataType}
                  label="Tipo de Dados"
                  onChange={(e) => {
                    const dataType = DATA_TYPES.find(
                      (dt) => dt.value === e.target.value
                    );
                    setFormData({
                      ...formData,
                      dataType: e.target.value,
                      capturePattern: dataType?.pattern || "",
                    });
                  }}
                >
                  {DATA_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(formData.dataType === "custom" ||
              formData.actionType !== "collect_data") && (
              <TextField
                label="Padrão de Captura (Regex)"
                value={formData.capturePattern}
                onChange={(e) =>
                  setFormData({ ...formData, capturePattern: e.target.value })
                }
                placeholder="Ex: \\d{1,2}"
                fullWidth
                helperText="Expressão regular para capturar dados das mensagens"
              />
            )}

            {formData.actionType === "webhook" && (
              <TextField
                label="URL do Webhook"
                value={formData.webhookUrl}
                onChange={(e) =>
                  setFormData({ ...formData, webhookUrl: e.target.value })
                }
                placeholder="https://sua-api.com/webhook"
                fullWidth
                required
              />
            )}

            {formData.shouldReply && (
              <TextField
                label="Template de Resposta"
                value={formData.replyTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, replyTemplate: e.target.value })
                }
                placeholder="✅ Registrado: {{numbers}}"
                fullWidth
                multiline
                rows={2}
                helperText="Use {{variavel}} para interpolação. Ex: {{participantName}}, {{numbers}}, {{count}}"
              />
            )}

            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
              <TextField
                label="Válido a partir de"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(e) =>
                  setFormData({ ...formData, startsAt: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Expira em"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <Box display="flex" flexWrap="wrap" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.shouldReply}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shouldReply: e.target.checked,
                      })
                    }
                  />
                }
                label="Responder no grupo"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.replyOnlyOnce}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        replyOnlyOnce: e.target.checked,
                      })
                    }
                  />
                }
                label="1x por participante"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.skipAiAfter}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skipAiAfter: e.target.checked,
                      })
                    }
                  />
                }
                label="Pular IA após match"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                }
                label="Ativo"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              !formData.name ||
              (!formData.groupRemoteJid && !formData.groupNameMatch)
            }
          >
            {editingAutomation ? "Salvar" : "Criar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Data Dialog */}
      <Dialog
        open={!!viewDataOpen}
        onClose={() => setViewDataOpen(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Dados Coletados</DialogTitle>
        <DialogContent>
          {collectedData.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                Nenhum dado coletado ainda
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Participante</TableCell>
                    <TableCell>Dados</TableCell>
                    <TableCell>Data/Hora</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {collectedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {item.participantName || item.participantJid}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {JSON.stringify(item.data)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(item.createdAt)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDataOpen(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
