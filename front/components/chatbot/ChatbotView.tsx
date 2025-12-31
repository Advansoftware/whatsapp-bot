import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Card,
  CardContent,
  Divider,
  Tooltip,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
} from "@mui/material";
import {
  AccountTree,
  Add,
  Edit,
  Delete,
  Save,
  DragIndicator,
  TextFields,
  Timer,
  ArrowDownward,
  ContentCopy,
  PlayArrow,
  Visibility,
} from "@mui/icons-material";
import { api } from "../../lib/api";

interface ChatNode {
  id?: string;
  content: string;
  type: "text" | "delay" | "image" | "button" | "condition";
  delay?: number;
  parentId?: string;
}

interface ChatFlow {
  id?: string;
  name: string;
  keyword: string;
  isActive: boolean;
  nodes: ChatNode[];
}

const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <TextFields />,
  delay: <Timer />,
};

const NODE_TYPE_LABELS: Record<string, string> = {
  text: "Mensagem de Texto",
  delay: "Aguardar",
};

const ChatbotView: React.FC = () => {
  const theme = useTheme();
  const [flows, setFlows] = useState<ChatFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<ChatFlow>({
    name: "",
    keyword: "",
    isActive: true,
    nodes: [{ content: "", type: "text" }],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoading(true);
    try {
      const data = await api.getFlows();
      setFlows(data);
    } catch (err) {
      console.error("Error loading flows:", err);
      setError("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentFlow.name.trim() || !currentFlow.keyword.trim()) {
      setError("Nome e palavra-chave são obrigatórios");
      return;
    }

    if (
      currentFlow.nodes.length === 0 ||
      !currentFlow.nodes[0].content.trim()
    ) {
      setError("Adicione pelo menos uma mensagem ao fluxo");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (currentFlow.id) {
        await api.updateFlow(currentFlow.id, currentFlow);
      } else {
        await api.createFlow(currentFlow);
      }
      setOpen(false);
      setSuccess("Fluxo salvo com sucesso!");
      loadFlows();
    } catch (err) {
      console.error("Error saving flow:", err);
      setError("Erro ao salvar fluxo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este fluxo?")) {
      try {
        await api.deleteFlow(id);
        setSuccess("Fluxo excluído com sucesso!");
        loadFlows();
      } catch (err) {
        console.error("Error deleting flow:", err);
        setError("Erro ao excluir fluxo");
      }
    }
  };

  const handleEdit = (flow: ChatFlow) => {
    setCurrentFlow({
      ...flow,
      nodes:
        flow.nodes.length > 0 ? flow.nodes : [{ content: "", type: "text" }],
    });
    setOpen(true);
  };

  const handleAddNew = () => {
    setCurrentFlow({
      name: "",
      keyword: "",
      isActive: true,
      nodes: [{ content: "", type: "text" }],
    });
    setError(null);
    setOpen(true);
  };

  const handleDuplicate = async (flow: ChatFlow) => {
    const newFlow = {
      ...flow,
      id: undefined,
      name: `${flow.name} (Cópia)`,
    };
    try {
      await api.createFlow(newFlow);
      setSuccess("Fluxo duplicado com sucesso!");
      loadFlows();
    } catch (err) {
      setError("Erro ao duplicar fluxo");
    }
  };

  const addNode = (type: "text" | "delay" = "text") => {
    const newNode: ChatNode = {
      content: type === "delay" ? "3" : "",
      type,
      delay: type === "delay" ? 3 : undefined,
    };
    setCurrentFlow({
      ...currentFlow,
      nodes: [...currentFlow.nodes, newNode],
    });
  };

  const updateNode = (index: number, updates: Partial<ChatNode>) => {
    const newNodes = [...currentFlow.nodes];
    newNodes[index] = { ...newNodes[index], ...updates };
    setCurrentFlow({ ...currentFlow, nodes: newNodes });
  };

  const removeNode = (index: number) => {
    if (currentFlow.nodes.length <= 1) {
      setError("O fluxo precisa ter pelo menos um passo");
      return;
    }
    const newNodes = currentFlow.nodes.filter((_, i) => i !== index);
    setCurrentFlow({ ...currentFlow, nodes: newNodes });
  };

  const moveNode = (index: number, direction: "up" | "down") => {
    const newNodes = [...currentFlow.nodes];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newNodes.length) return;
    [newNodes[index], newNodes[targetIndex]] = [
      newNodes[targetIndex],
      newNodes[index],
    ];
    setCurrentFlow({ ...currentFlow, nodes: newNodes });
  };

  const renderNodeEditor = (node: ChatNode, index: number) => {
    return (
      <Card
        key={index}
        sx={{
          mb: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <DragIndicator sx={{ color: "text.secondary", cursor: "grab" }} />
            <Chip
              icon={NODE_TYPE_ICONS[node.type] as any}
              label={`Passo ${index + 1}: ${
                NODE_TYPE_LABELS[node.type] || node.type
              }`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Box flex={1} />
            <Tooltip title="Mover para cima">
              <IconButton
                size="small"
                onClick={() => moveNode(index, "up")}
                disabled={index === 0}
              >
                <ArrowDownward
                  sx={{ transform: "rotate(180deg)" }}
                  fontSize="small"
                />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mover para baixo">
              <IconButton
                size="small"
                onClick={() => moveNode(index, "down")}
                disabled={index === currentFlow.nodes.length - 1}
              >
                <ArrowDownward fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remover">
              <IconButton
                size="small"
                color="error"
                onClick={() => removeNode(index)}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {node.type === "text" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Mensagem"
              value={node.content}
              onChange={(e) => updateNode(index, { content: e.target.value })}
              placeholder="Digite a mensagem que será enviada..."
              helperText="Use {nome} para inserir o nome do cliente"
            />
          )}

          {node.type === "delay" && (
            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                type="number"
                label="Segundos"
                value={node.content}
                onChange={(e) =>
                  updateNode(index, {
                    content: e.target.value,
                    delay: parseInt(e.target.value) || 1,
                  })
                }
                inputProps={{ min: 1, max: 60 }}
                sx={{ width: 120 }}
              />
              <Typography color="text.secondary">
                Aguardar {node.content || 1} segundo(s) antes do próximo passo
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderFlowPreview = () => {
    return (
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Visibility />
            Preview: {currentFlow.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              bgcolor: "#0b141a",
              borderRadius: 2,
              p: 2,
              minHeight: 300,
            }}
          >
            <Box
              sx={{
                bgcolor: "#202c33",
                color: "#e9edef",
                p: 1.5,
                borderRadius: "8px 8px 8px 0",
                maxWidth: "70%",
                mb: 2,
              }}
            >
              <Typography variant="body2">
                {currentFlow.keyword || "palavra-chave"}
              </Typography>
            </Box>

            {currentFlow.nodes.map((node, idx) => (
              <Box key={idx}>
                {node.type === "delay" ? (
                  <Box display="flex" justifyContent="center" my={1}>
                    <Chip
                      size="small"
                      icon={<Timer />}
                      label={`⏱️ ${node.content}s`}
                      sx={{
                        bgcolor: "rgba(255,255,255,0.1)",
                        color: "#8696a0",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      bgcolor: "#005c4b",
                      color: "#e9edef",
                      p: 1.5,
                      borderRadius: "8px 8px 0 8px",
                      maxWidth: "70%",
                      ml: "auto",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2">
                      {node.content || "(mensagem vazia)"}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
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
    <Box maxWidth="lg" mx="auto" p={4}>
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
            <AccountTree color="primary" />
            Fluxos de Conversa
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Crie fluxos automatizados baseados em palavras-chave. O chatbot
            responde antes da IA.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddNew}
          size="large"
        >
          Novo Fluxo
        </Button>
      </Box>

      <Grid container spacing={3}>
        {flows.map((flow) => (
          <Grid item xs={12} md={4} key={flow.id}>
            <Paper
              sx={{
                p: 3,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "all 0.2s",
                "&:hover": {
                  boxShadow: theme.shadows[8],
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <AccountTree color="primary" />
                <Typography variant="h6" noWrap flex={1}>
                  {flow.name}
                </Typography>
              </Box>

              <Box mb={2} display="flex" flexWrap="wrap" gap={1}>
                <Chip
                  label={`"${flow.keyword}"`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  icon={<PlayArrow />}
                />
                <Chip
                  label={flow.isActive ? "Ativo" : "Inativo"}
                  size="small"
                  color={flow.isActive ? "success" : "default"}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                📝 {flow.nodes?.length || 0} passo(s)
              </Typography>

              {flow.nodes?.[0]?.content && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    p: 1,
                    borderRadius: 1,
                    display: "block",
                    mb: 2,
                  }}
                  noWrap
                >
                  "{flow.nodes[0].content.substring(0, 50)}..."
                </Typography>
              )}

              <Box mt="auto" display="flex" justifyContent="flex-end" gap={1}>
                <Tooltip title="Duplicar">
                  <IconButton
                    onClick={() => handleDuplicate(flow)}
                    color="default"
                  >
                    <ContentCopy />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Editar">
                  <IconButton onClick={() => handleEdit(flow)} color="primary">
                    <Edit />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton
                    onClick={() => handleDelete(flow.id!)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          </Grid>
        ))}

        {flows.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <AccountTree
                sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" gutterBottom>
                Nenhum fluxo criado
              </Typography>
              <Typography color="text.secondary" paragraph>
                Fluxos de chatbot respondem automaticamente quando o cliente
                envia uma palavra-chave.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddNew}
              >
                Criar Primeiro Fluxo
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Flow Editor Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <span>{currentFlow.id ? "Editar Fluxo" : "Novo Fluxo"}</span>
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => setPreviewOpen(true)}
              disabled={currentFlow.nodes.length === 0}
            >
              Preview
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Fluxo"
                value={currentFlow.name}
                onChange={(e) =>
                  setCurrentFlow({ ...currentFlow, name: e.target.value })
                }
                placeholder="Ex: Boas Vindas"
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Palavra-chave"
                value={currentFlow.keyword}
                onChange={(e) =>
                  setCurrentFlow({ ...currentFlow, keyword: e.target.value })
                }
                placeholder="oi, olá, bom dia"
                helperText="Separe múltiplas por vírgula"
                required
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentFlow.isActive}
                    onChange={(e) =>
                      setCurrentFlow({
                        ...currentFlow,
                        isActive: e.target.checked,
                      })
                    }
                  />
                }
                label="Ativo"
                sx={{ mt: 1 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant="h6"
                gutterBottom
                display="flex"
                alignItems="center"
                gap={1}
              >
                <AccountTree fontSize="small" />
                Passos do Fluxo
              </Typography>
            </Grid>

            <Grid item xs={12}>
              {currentFlow.nodes.map((node, index) =>
                renderNodeEditor(node, index)
              )}

              <Box display="flex" gap={1} justifyContent="center" mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<TextFields />}
                  onClick={() => addNode("text")}
                >
                  + Mensagem
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Timer />}
                  onClick={() => addNode("delay")}
                  color="secondary"
                >
                  + Delay
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar Fluxo"}
          </Button>
        </DialogActions>
      </Dialog>

      {renderFlowPreview()}
    </Box>
  );
};

export default ChatbotView;
