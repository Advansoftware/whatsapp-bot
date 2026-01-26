"use client";

import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Description as DocumentIcon,
  QuestionAnswer as FAQIcon,
  Memory as MemoryIcon,
  DataObject as ChunksIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { trainingApi } from "@/lib/api";

interface StatsData {
  totalDocuments: number;
  totalChunks: number;
  totalFAQs: number;
  totalMemories: number;
  documentsByCategory: Record<string, number>;
  recentDocuments: Array<{ id: string; name: string; createdAt: string }>;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Icon sx={{ color, fontSize: 32 }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TrainingStatsTab() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<StatsData>({
    queryKey: ["training", "stats"],
    queryFn: trainingApi.getStats,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Erro ao carregar estatísticas: {(error as Error).message}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Estatísticas da Base de Conhecimento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visão geral do treinamento da IA para sua empresa.
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Documentos"
            value={stats?.totalDocuments || 0}
            icon={DocumentIcon}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Chunks (Trechos)"
            value={stats?.totalChunks || 0}
            icon={ChunksIcon}
            color="#9c27b0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="FAQs"
            value={stats?.totalFAQs || 0}
            icon={FAQIcon}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Memórias"
            value={stats?.totalMemories || 0}
            icon={MemoryIcon}
            color="#ed6c02"
          />
        </Grid>
      </Grid>

      {/* Documentos por Categoria */}
      {stats?.documentsByCategory &&
        Object.keys(stats.documentsByCategory).length > 0 && (
          <Box mb={4}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Documentos por Categoria
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  {Object.entries(stats.documentsByCategory).map(
                    ([category, count]) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={category}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            bgcolor: "action.hover",
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color="primary"
                          >
                            {count}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {category}
                          </Typography>
                        </Box>
                      </Grid>
                    ),
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

      {/* Documentos Recentes */}
      {stats?.recentDocuments && stats.recentDocuments.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Documentos Adicionados Recentemente
          </Typography>
          <Card variant="outlined">
            <CardContent>
              {stats.recentDocuments.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <DocumentIcon fontSize="small" color="action" />
                    <Typography variant="body2">{doc.name}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Dicas */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Dicas para melhorar o treinamento:
        </Typography>
        <Typography variant="body2" component="div">
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              Adicione documentos específicos sobre produtos, serviços e
              políticas
            </li>
            <li>Crie FAQs para as perguntas mais frequentes dos clientes</li>
            <li>
              Use o modo de teste para verificar se a IA encontra as informações
              corretas
            </li>
            <li>Quanto mais chunks, mais precisa será a busca semântica</li>
          </ul>
        </Typography>
      </Alert>
    </Box>
  );
}
