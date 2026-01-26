"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  LinearProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Lightbulb as IdeaIcon,
} from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { trainingApi } from "@/lib/api";
import { SearchResult } from "./types";

export default function TrainingTestTab() {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<{
    relevantKnowledge: SearchResult[];
    similarFAQs: Array<{
      question: string;
      answer: string;
      similarity: number;
    }>;
  } | null>(null);

  const testMutation = useMutation({
    mutationFn: trainingApi.test,
    onSuccess: (data) => {
      setResults(data);
    },
  });

  const handleTest = () => {
    if (question.trim()) {
      testMutation.mutate(question);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Testar Base de Conhecimento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Digite uma pergunta para ver quais documentos e FAQs a IA encontraria
        para responder.
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <TextField
          fullWidth
          label="Faça uma pergunta de teste"
          placeholder="Ex: Qual o prazo de entrega? / Vocês aceitam cartão? / Como funciona a garantia?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={testMutation.isPending}
        />
        <Button
          variant="contained"
          startIcon={
            testMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              <SearchIcon />
            )
          }
          onClick={handleTest}
          disabled={!question.trim() || testMutation.isPending}
          sx={{ minWidth: 120 }}
        >
          Testar
        </Button>
      </Box>

      {testMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}

      {results && (
        <Stack spacing={3}>
          {/* FAQs Similares */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📋 FAQs Encontradas
            </Typography>
            {results.similarFAQs?.length > 0 ? (
              <Stack spacing={2}>
                {results.similarFAQs.map((faq, idx) => (
                  <Card key={idx} variant="outlined">
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                      >
                        <Box flex={1}>
                          <Typography
                            variant="subtitle2"
                            color="primary"
                            gutterBottom
                          >
                            Pergunta: {faq.question}
                          </Typography>
                          <Typography variant="body2">{faq.answer}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={`${(faq.similarity * 100).toFixed(0)}% similar`}
                          color={
                            faq.similarity > 0.8
                              ? "success"
                              : faq.similarity > 0.6
                                ? "warning"
                                : "default"
                          }
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info">
                Nenhuma FAQ similar encontrada. Considere adicionar FAQs
                relacionadas a esta pergunta.
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Conhecimento Relevante */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              📚 Conhecimento Relevante (RAG)
            </Typography>
            {results.relevantKnowledge?.length > 0 ? (
              <Stack spacing={2}>
                {results.relevantKnowledge.map((result, idx) => (
                  <Card key={idx} variant="outlined">
                    <CardContent>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Stack direction="row" spacing={1}>
                          <Chip
                            size="small"
                            label={result.source}
                            variant="outlined"
                          />
                          <Chip
                            size="small"
                            label={result.category}
                            color="primary"
                          />
                        </Stack>
                        <Chip
                          size="small"
                          label={`${(result.similarity * 100).toFixed(0)}% relevante`}
                          color={
                            result.similarity > 0.8
                              ? "success"
                              : result.similarity > 0.6
                                ? "warning"
                                : "default"
                          }
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-wrap" }}
                      >
                        {result.content}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Alert severity="info">
                Nenhum documento relevante encontrado. Adicione mais documentos
                à base de conhecimento.
              </Alert>
            )}
          </Box>

          {/* Sugestão */}
          {results.similarFAQs?.length === 0 &&
            results.relevantKnowledge?.length === 0 && (
              <Alert severity="warning" icon={<IdeaIcon />}>
                <Typography variant="subtitle2" gutterBottom>
                  A IA não encontrou informações relevantes para esta pergunta.
                </Typography>
                <Typography variant="body2">
                  Sugestões:
                  <ul>
                    <li>Adicione uma FAQ com esta pergunta e sua resposta</li>
                    <li>
                      Adicione um documento contendo informações sobre este
                      assunto
                    </li>
                    <li>Verifique se as palavras-chave estão corretas</li>
                  </ul>
                </Typography>
              </Alert>
            )}
        </Stack>
      )}

      {!results && !testMutation.isPending && (
        <Alert severity="info">
          Digite uma pergunta acima e clique em &quot;Testar&quot; para ver o
          que a IA encontraria na base de conhecimento.
        </Alert>
      )}
    </Box>
  );
}
