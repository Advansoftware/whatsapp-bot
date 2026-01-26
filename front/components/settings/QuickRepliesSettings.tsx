"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Bolt as QuickIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quickRepliesApi, QuickReply } from "@/lib/api";

const CATEGORIES = [
  { value: "geral", label: "Geral", icon: "📝" },
  { value: "vendas", label: "Vendas", icon: "💰" },
  { value: "suporte", label: "Suporte", icon: "🛠️" },
  { value: "pagamento", label: "Pagamento", icon: "💳" },
  { value: "informacoes", label: "Informações", icon: "ℹ️" },
  { value: "saudacao", label: "Saudação", icon: "👋" },
  { value: "despedida", label: "Despedida", icon: "🙏" },
];

const ICONS = ["📝", "💰", "🛠️", "💳", "ℹ️", "👋", "🙏", "📞", "📍", "⏰", "✅", "❌", "🎁", "📦", "🚚"];

export default function QuickRepliesSettings() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    shortcut: "",
    content: "",
    category: "geral",
    icon: "📝",
  });

  const queryClient = useQueryClient();

  const { data: quickReplies = [], isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: quickRepliesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: quickRepliesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuickReply> }) =>
      quickRepliesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: quickRepliesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      quickRepliesApi.update(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    },
  });

  const handleOpenDialog = (reply?: QuickReply) => {
    if (reply) {
      setEditingReply(reply);
      setFormData({
        title: reply.title,
        shortcut: reply.shortcut || "",
        content: reply.content,
        category: reply.category,
        icon: reply.icon || "📝",
      });
    } else {
      setEditingReply(null);
      setFormData({
        title: "",
        shortcut: "",
        content: "",
        category: "geral",
        icon: "📝",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReply(null);
    setFormData({
      title: "",
      shortcut: "",
      content: "",
      category: "geral",
      icon: "📝",
    });
  };

  const handleSubmit = () => {
    const data = {
      title: formData.title,
      shortcut: formData.shortcut || undefined,
      content: formData.content,
      category: formData.category,
      icon: formData.icon,
    };

    if (editingReply) {
      updateMutation.mutate({ id: editingReply.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const groupedReplies = quickReplies.reduce((acc, reply) => {
    if (!acc[reply.category]) acc[reply.category] = [];
    acc[reply.category].push(reply);
    return acc;
  }, {} as Record<string, QuickReply[]>);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h6" display="flex" alignItems="center" gap={1}>
            <QuickIcon color="primary" /> Respostas Rápidas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure mensagens pré-programadas para enviar rapidamente no chat
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nova Resposta
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Dica:</strong> Use atalhos como "/pix" ou "/horario" para encontrar respostas
        rapidamente. No chat, clique no ícone ⚡ para acessar as respostas rápidas.
      </Alert>

      {quickReplies.length === 0 ? (
        <Alert severity="warning">
          Nenhuma resposta rápida cadastrada. Adicione respostas como chave PIX,
          endereço, horários de funcionamento, etc.
        </Alert>
      ) : (
        Object.entries(groupedReplies).map(([category, replies]) => {
          const categoryInfo = CATEGORIES.find((c) => c.value === category);
          return (
            <Box key={category} mb={3}>
              <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                {categoryInfo?.icon} {categoryInfo?.label || category}
              </Typography>
              <Grid container spacing={2}>
                {replies.map((reply) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={reply.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        opacity: reply.isActive ? 1 : 0.6,
                        borderColor: reply.isActive ? undefined : "action.disabled",
                      }}
                    >
                      <CardContent>
                        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={24}>{reply.icon || "📝"}</Typography>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="medium">
                                {reply.title}
                              </Typography>
                              {reply.shortcut && (
                                <Chip
                                  size="small"
                                  label={reply.shortcut}
                                  sx={{ mt: 0.5 }}
                                />
                              )}
                            </Box>
                          </Box>
                          <Switch
                            checked={reply.isActive}
                            onChange={(e) =>
                              toggleMutation.mutate({
                                id: reply.id,
                                isActive: e.target.checked,
                              })
                            }
                            size="small"
                          />
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {reply.content}
                        </Typography>

                        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                          <Typography variant="caption" color="text.secondary">
                            Usado {reply.usageCount}x
                          </Typography>
                          <Box>
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => handleOpenDialog(reply)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteMutation.mutate(reply.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })
      )}

      {/* Dialog para criar/editar resposta */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingReply ? "Editar Resposta Rápida" : "Nova Resposta Rápida"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Box display="flex" gap={2}>
              <TextField
                label="Título"
                fullWidth
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Chave PIX"
                helperText="Nome curto para identificar a resposta"
              />
              <TextField
                label="Atalho"
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                placeholder="/pix"
                helperText="Opcional"
                sx={{ width: 150 }}
              />
            </Box>

            <Box display="flex" gap={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  label="Categoria"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 100 }}>
                <InputLabel>Ícone</InputLabel>
                <Select
                  value={formData.icon}
                  label="Ícone"
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                >
                  {ICONS.map((icon) => (
                    <MenuItem key={icon} value={icon}>
                      <Typography fontSize={20}>{icon}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Conteúdo da Mensagem"
              fullWidth
              multiline
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Digite aqui o conteúdo completo da mensagem que será enviada..."
              helperText={`${formData.content.length} caracteres`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              !formData.title ||
              !formData.content
            }
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={20} />
            ) : editingReply ? (
              "Salvar"
            ) : (
              "Criar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
