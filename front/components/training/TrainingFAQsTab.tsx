"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  QuestionAnswer as FAQIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingApi } from "@/lib/api";
import { TrainingDocument } from "./types";

export default function TrainingFAQsTab() {
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
  });

  const queryClient = useQueryClient();

  const { data: faqs, isLoading } = useQuery({
    queryKey: ["training", "faqs"],
    queryFn: trainingApi.getFAQs,
  });

  const addMutation = useMutation({
    mutationFn: trainingApi.addFAQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
      setOpenDialog(false);
      setFormData({ question: "", answer: "", keywords: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: trainingApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });

  const handleSubmit = () => {
    const keywords = formData.keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    addMutation.mutate({
      question: formData.question,
      answer: formData.answer,
      keywords,
    });
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
        <Box>
          <Typography variant="h6">Perguntas Frequentes (FAQ)</Typography>
          <Typography variant="body2" color="text.secondary">
            Adicione perguntas e respostas comuns dos seus clientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Adicionar FAQ
        </Button>
      </Box>

      {faqs?.length === 0 ? (
        <Alert severity="info">
          Nenhuma FAQ adicionada ainda. Adicione perguntas frequentes para que a
          IA responda automaticamente.
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {faqs?.map((faq: TrainingDocument) => {
            // Extrair pergunta e resposta do nome (que está no formato "FAQ: pergunta...")
            const parts = faq.name.replace("FAQ: ", "").split("...");
            const question = parts[0] || faq.name;

            return (
              <Grid size={{ xs: 12, md: 6 }} key={faq.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box
                      display="flex"
                      alignItems="flex-start"
                      justifyContent="space-between"
                    >
                      <Box
                        display="flex"
                        alignItems="flex-start"
                        gap={1}
                        flex={1}
                      >
                        <FAQIcon color="info" sx={{ mt: 0.5 }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {question}
                          </Typography>
                          {faq.tags?.length > 0 && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              mt={1}
                              flexWrap="wrap"
                            >
                              {faq.tags.map((tag, idx) => (
                                <Chip
                                  key={idx}
                                  size="small"
                                  label={tag}
                                  variant="outlined"
                                  sx={{ mb: 0.5 }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Box>
                      <Tooltip title="Excluir">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteMutation.mutate(faq.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog para adicionar FAQ */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Adicionar Pergunta Frequente</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Pergunta"
              fullWidth
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              placeholder="Ex: Qual o prazo de entrega?"
              helperText="A pergunta que os clientes costumam fazer"
            />

            <TextField
              label="Resposta"
              fullWidth
              multiline
              rows={4}
              value={formData.answer}
              onChange={(e) =>
                setFormData({ ...formData, answer: e.target.value })
              }
              placeholder="Ex: O prazo de entrega é de 3 a 5 dias úteis para a região sudeste..."
              helperText="A resposta que a IA deve dar"
            />

            <TextField
              label="Palavras-chave (separadas por vírgula)"
              fullWidth
              value={formData.keywords}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              placeholder="Ex: entrega, prazo, envio, frete"
              helperText="Palavras que ajudam a identificar quando usar esta resposta"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={
              addMutation.isPending || !formData.question || !formData.answer
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
