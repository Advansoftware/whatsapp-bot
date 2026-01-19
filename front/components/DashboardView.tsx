"use client";

import React from "react";
import { Box, Grid, Typography, CircularProgress, Alert } from "@mui/material";
import { Forum, PersonAdd, Api } from "@mui/icons-material";
import StatCard from "./StatCard";
import ActivityChart from "./ActivityChart";
import RecentConversations from "./RecentConversations";
import { useDashboardStats } from "../hooks/useApi";
import { StatData } from "../types";

interface DashboardViewProps {
  onNavigateToChat?: (conversation: any) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToChat }) => {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: "lg", mx: "auto" }}>
        Erro ao carregar dados do dashboard: {error.message}
      </Alert>
    );
  }

  const statCards: StatData[] = [
    {
      title: "Total de Mensagens",
      value: stats?.totalMessages?.toLocaleString("pt-BR") || "0",
      change: stats?.messageGrowth || "0%",
      isPositive: !stats?.messageGrowth?.startsWith("-"),
      subtext: "vs mês anterior",
      icon: <Forum />,
    },
    {
      title: "Leads Ativos",
      value: stats?.activeLeads?.toLocaleString("pt-BR") || "0",
      change: `${stats?.activeInstances || 0} conexões`,
      isPositive: true,
      subtext: "instâncias ativas",
      icon: <PersonAdd />,
    },
    {
      title: "Status da API",
      value: stats?.apiStatus === "healthy" ? "Saudável" : "Offline",
      change: stats?.uptime || "0%",
      isPositive: stats?.apiStatus === "healthy",
      subtext: "Últimas 24h",
      icon: <Api />,
    },
  ];

  return (
    <Box maxWidth="lg" mx="auto" display="flex" flexDirection="column" gap={4}>
      {/* Stats Grid */}
      <Grid container spacing={2}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={index}>
            <StatCard data={stat} />
          </Grid>
        ))}
      </Grid>

      {/* Balance Info */}
      {stats?.balance !== undefined && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Saldo disponível:{" "}
            <Typography component="span" fontWeight="bold" color="primary">
              R$ {Number(stats.balance).toFixed(2)}
            </Typography>
          </Typography>
        </Box>
      )}

      {/* Chart */}
      <ActivityChart />

      {/* Table */}
      <RecentConversations onNavigateToChat={onNavigateToChat} />

      <Box component="footer" textAlign="center" py={2}>
        <Box
          component="span"
          sx={{ color: "text.secondary", fontSize: "0.75rem" }}
        >
          © 2026 RespondIA. Todos os direitos reservados.
          <Box
            component="span"
            sx={{ color: "primary.main", ml: 1, cursor: "pointer" }}
          >
            Política de Privacidade
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardView;
