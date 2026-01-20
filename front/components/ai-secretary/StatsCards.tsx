"use client";

import React from "react";
import { Grid, Paper, Typography } from "@mui/material";
import { AIStats } from "./types";

interface StatsCardsProps {
  stats: AIStats | null;
}

/**
 * Cards de estatísticas da Secretária IA
 */
export default function StatsCards({ stats }: StatsCardsProps) {
  const statsItems = [
    {
      value: stats?.activeConversations || 0,
      label: "Conversas Ativas",
      color: "primary.main",
    },
    {
      value: stats?.approvedSuggestions || 0,
      label: "Aprovadas",
      color: "success.main",
    },
    {
      value: stats?.overrides || 0,
      label: "Overrides",
      color: "warning.main",
    },
    {
      value: stats?.escalations || 0,
      label: "Escalações",
      color: "error.main",
    },
    {
      value: stats?.totalInteractions || 0,
      label: "Total Interações",
      color: "info.main",
    },
    {
      value: stats?.approvalRate || "0%",
      label: "Taxa Aprovação",
      color: "success.main",
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {statsItems.map((item, index) => (
        <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" color={item.color}>
              {item.value}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {item.label}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
