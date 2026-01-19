"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  TrendingUp,
  Message,
  People,
  SmartToy,
  Speed,
  CheckCircle,
  AccessTime,
  LocationOn,
  School,
  Work,
  Wc,
  Cake,
  Grade,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../../lib/api";

interface AnalyticsData {
  messageVolume: Array<{ date: string; incoming: number; outgoing: number }>;
  aiPerformance: {
    totalInteractions: number;
    approvedSuggestions: number;
    overrides: number;
    escalations: number;
    approvalRate: string;
  };
  contactStats: {
    totalContacts: number;
    activeContacts: number;
    newThisWeek: number;
  };
  campaignStats: {
    totalCampaigns: number;
    completedCampaigns: number;
    totalMessagesSent: number;
  };
}

interface DemographicData {
  totalContacts: number;
  byCity: Array<{ name: string; count: number }>;
  byState: Array<{ name: string; count: number }>;
  byNeighborhood: Array<{ name: string; count: number }>;
  byUniversity: Array<{ name: string; count: number }>;
  byCourse: Array<{ name: string; count: number }>;
  byOccupation: Array<{ name: string; count: number }>;
  byGender: Array<{ name: string; count: number }>;
  byAge: Array<{ range: string; count: number }>;
  byLeadStatus: Array<{ name: string; count: number }>;
}

const COLORS = [
  "#4caf50",
  "#2196f3",
  "#ff9800",
  "#f44336",
  "#9c27b0",
  "#00bcd4",
  "#e91e63",
  "#795548",
];

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Feminino",
  other: "Outro",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  cold: "#2196f3",
  warm: "#ff9800",
  hot: "#f44336",
  qualified: "#4caf50",
  unqualified: "#9e9e9e",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  cold: "Frio",
  warm: "Morno",
  hot: "Quente",
  qualified: "Qualificado",
  unqualified: "Não Qualificado",
};

const AnalyticsView: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [demographics, setDemographics] = useState<DemographicData | null>(
    null
  );

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [
          dashboard,
          activity,
          aiStats,
          contactStats,
          campaignStats,
          demographicAnalytics,
        ] = await Promise.all([
          api.getDashboardStats(),
          api.getDashboardActivity(),
          api.getAIStats().catch(() => ({
            totalInteractions: 0,
            approvedSuggestions: 0,
            overrides: 0,
            escalations: 0,
            approvalRate: "0%",
            activeConversations: 0,
          })),
          api.getContactStats().catch(() => ({
            totalContacts: 0,
            activeContacts: 0,
            newThisWeek: 0,
          })),
          api.getCampaignStats().catch(() => ({
            totalCampaigns: 0,
            runningCampaigns: 0,
            completedCampaigns: 0,
            scheduledCampaigns: 0,
            totalMessagesSent: 0,
          })),
          api.getDemographicAnalytics().catch(() => null),
        ]);

        setData({
          messageVolume: activity,
          aiPerformance: aiStats,
          contactStats,
          campaignStats,
        });

        if (demographicAnalytics) {
          setDemographics(demographicAnalytics);
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [period]);

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

  const pieData = data
    ? [
        {
          name: "Aprovadas",
          value: data.aiPerformance.approvedSuggestions,
          color: COLORS[0],
        },
        {
          name: "Rejeitadas",
          value: data.aiPerformance.overrides,
          color: COLORS[2],
        },
        {
          name: "Escaladas",
          value: data.aiPerformance.escalations,
          color: COLORS[3],
        },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <Box p={4}>
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
            <BarChartIcon color="primary" />
            Analytics & Relatórios
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Acompanhe as métricas e desempenho do sistema.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={period}
            label="Período"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="7d">Últimos 7 dias</MenuItem>
            <MenuItem value="30d">Últimos 30 dias</MenuItem>
            <MenuItem value="90d">Últimos 90 dias</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.1
              )} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                  }}
                >
                  <Message color="primary" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.aiPerformance.totalInteractions || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Mensagens IA
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.success.main,
                0.1
              )} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                  }}
                >
                  <CheckCircle color="success" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.aiPerformance.approvalRate || "0%"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Aprovação IA
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.info.main,
                0.1
              )} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.2),
                  }}
                >
                  <People color="info" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.contactStats.totalContacts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Contatos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.secondary.main,
                0.1
              )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.secondary.main, 0.2),
                  }}
                >
                  <TrendingUp color="secondary" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {data?.campaignStats.totalMessagesSent || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mensagens Campanhas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Message Volume Chart */}
        <Grid size={{ xs: 12 }} lg={8}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Volume de Mensagens
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data?.messageVolume || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={alpha(theme.palette.text.primary, 0.1)}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: theme.palette.text.secondary }}
                />
                <YAxis tick={{ fill: theme.palette.text.secondary }} />
                <Tooltip
                  contentStyle={{
                    background: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Legend />
                <Bar
                  dataKey="incoming"
                  name="Recebidas"
                  fill={theme.palette.primary.main}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="outgoing"
                  name="Enviadas"
                  fill={theme.palette.success.main}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* AI Performance Pie */}
        <Grid size={{ xs: 12 }} lg={4}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Desempenho da IA
            </Typography>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="90%"
              >
                <Typography color="text.secondary">
                  Sem dados de IA disponíveis
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Contact Growth */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Contatos
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="primary.main"
                    fontWeight="bold"
                  >
                    {data?.contactStats.totalContacts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="success.main"
                    fontWeight="bold"
                  >
                    {data?.contactStats.activeContacts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ativos
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {data?.contactStats.newThisWeek || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Novos (7d)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Campaign Stats */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Campanhas
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="primary.main"
                    fontWeight="bold"
                  >
                    {data?.campaignStats.totalCampaigns || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="success.main"
                    fontWeight="bold"
                  >
                    {data?.campaignStats.completedCampaigns || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Concluídas
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography
                    variant="h4"
                    color="secondary.main"
                    fontWeight="bold"
                  >
                    {data?.campaignStats.totalMessagesSent || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Enviadas
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Demographics Section */}
      {demographics && (
        <>
          <Typography
            variant="h5"
            fontWeight="bold"
            gutterBottom
            sx={{ mt: 4, mb: 3, display: "flex", alignItems: "center", gap: 1 }}
          >
            <People color="primary" />
            Análise Demográfica
          </Typography>

          <Grid container spacing={3}>
            {/* Por Cidade */}
            {demographics.byCity.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: 350 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <LocationOn color="primary" />
                    Por Cidade
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={demographics.byCity.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={theme.palette.primary.main}
                        name="Contatos"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Por Faixa Etária */}
            {demographics.byAge.some((a) => a.count > 0) && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: 350 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Cake color="secondary" />
                    Por Faixa Etária
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={demographics.byAge}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={theme.palette.secondary.main}
                        name="Contatos"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Por Gênero */}
            {demographics.byGender.some((g) => g.count > 0) && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: 300 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Wc color="info" />
                    Por Gênero
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={demographics.byGender
                          .filter((g) => g.count > 0)
                          .map((g) => ({
                            ...g,
                            name: GENDER_LABELS[g.name] || g.name,
                          }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {demographics.byGender
                          .filter((g) => g.count > 0)
                          .map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Por Status de Lead */}
            {demographics.byLeadStatus.some((s) => s.count > 0) && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: 300 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Grade color="warning" />
                    Por Status de Lead
                  </Typography>
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={demographics.byLeadStatus.filter(
                          (s) => s.count > 0
                        )}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${LEAD_STATUS_LABELS[name] || name} (${(
                            percent * 100
                          ).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {demographics.byLeadStatus
                          .filter((s) => s.count > 0)
                          .map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                LEAD_STATUS_COLORS[entry.name] || COLORS[index]
                              }
                            />
                          ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Por Estado */}
            {demographics.byState.length > 0 && (
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3, height: 300 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <LocationOn color="success" />
                    Por Estado
                  </Typography>
                  <Box sx={{ overflowY: "auto", maxHeight: 230 }}>
                    {demographics.byState.map((item, index) => (
                      <Box
                        key={item.name}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        py={0.5}
                      >
                        <Typography variant="body2">{item.name}</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              height: 8,
                              width: Math.max(
                                20,
                                (item.count /
                                  Math.max(
                                    ...demographics.byState.map((s) => s.count)
                                  )) *
                                  80
                              ),
                              bgcolor: COLORS[index % COLORS.length],
                              borderRadius: 1,
                            }}
                          />
                          <Typography variant="body2" fontWeight="bold">
                            {item.count}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Por Universidade */}
            {demographics.byUniversity.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: 350 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <School color="info" />
                    Por Universidade
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={demographics.byUniversity.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={theme.palette.info.main}
                        name="Contatos"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}

            {/* Por Ocupação */}
            {demographics.byOccupation.length > 0 && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: 350 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Work color="warning" />
                    Por Ocupação
                  </Typography>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart
                      data={demographics.byOccupation.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={alpha(theme.palette.divider, 0.3)}
                      />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill={theme.palette.warning.main}
                        name="Contatos"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AnalyticsView;
