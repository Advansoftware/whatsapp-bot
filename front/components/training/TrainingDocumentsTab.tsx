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
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Description as DocIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingApi } from "@/lib/api";
import { TrainingDocument, CATEGORIES } from "./types";

export default function TrainingDocumentsTab() {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "general",
    tags: "",
  });

  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["training", "documents"],
    queryFn: trainingApi.getDocuments,
  });

  const addMutation = useMutation({
    mutationFn: trainingApi.addDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
      setOpenDialog(false);
      setFormData({ name: "", content: "", category: "general", tags: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: trainingApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: trainingApi.reprocess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });

  const handleSubmit = () => {
    const tags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addMutation.mutate({
      name: formData.name,
      content: formData.content,
      category: formData.category,
      tags,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <SuccessIcon color="success" fontSize="small" />;
      case "failed":
        return <ErrorIcon color="error" fontSize="small" />;
      case "processing":
        return <CircularProgress size={16} />;
      default:
        return <PendingIcon color="disabled" fontSize="small" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Processado";
      case "failed":
        return "Erro";
      case "processing":
        return "Processando...";
      default:
        return "Pendente";
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h6">Documentos de Treinamento</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Adicionar Documento
        </Button>
      </Box>

      {documents?.length === 0 ? (
        <Alert severity="info">
          Nenhum documento adicionado ainda. Adicione documentos para treinar
          sua IA.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {documents?.map((doc: TrainingDocument) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={doc.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="flex-start"
                    justifyContent="space-between"
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <DocIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight="medium">
                        {doc.name}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {getStatusIcon(doc.status)}
                    </Box>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={1}
                    mt={2}
                    flexWrap="wrap"
                    gap={0.5}
                  >
                    <Chip
                      size="small"
                      label={
                        CATEGORIES.find((c) => c.value === doc.category)
                          ?.label || doc.category
                      }
                      color={
                        (CATEGORIES.find((c) => c.value === doc.category)
                          ?.color as any) || "default"
                      }
                    />
                    <Chip
                      size="small"
                      label={`${doc.chunkCount} chunks`}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={getStatusLabel(doc.status)}
                      variant="outlined"
                    />
                  </Stack>

                  {doc.tags?.length > 0 && (
                    <Box mt={1}>
                      {doc.tags.map((tag, idx) => (
                        <Chip
                          key={idx}
                          size="small"
                          label={tag}
                          variant="outlined"
                          sx={{ mr: 0.5, mt: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}

                  <Box display="flex" justifyContent="flex-end" mt={2} gap={1}>
                    {doc.status === "failed" && (
                      <Tooltip title="Reprocessar">
                        <IconButton
                          size="small"
                          onClick={() => reprocessMutation.mutate(doc.id)}
                          disabled={reprocessMutation.isPending}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog para adicionar documento */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Adicionar Documento de Treinamento</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nome do Documento"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Política de Troca"
            />

            <FormControl fullWidth>
              <InputLabel>Categoria</InputLabel>
              <Select
                value={formData.category}
                label="Categoria"
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tags (separadas por vírgula)"
              fullWidth
              value={formData.tags}
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="Ex: troca, devolução, garantia"
              helperText="Tags ajudam a encontrar o documento mais rapidamente"
            />

            <TextField
              label="Conteúdo"
              fullWidth
              multiline
              rows={10}
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Cole aqui o conteúdo do documento, texto, políticas, informações sobre produtos, etc..."
              helperText="Mínimo de 50 caracteres"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              addMutation.isPending ||
              !formData.name ||
              formData.content.length < 50
            }
          >
            {addMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              "Adicionar"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
