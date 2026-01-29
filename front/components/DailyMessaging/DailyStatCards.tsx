"use client";

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';

interface DailyStatCardsProps {
  stats: {
    totalSubscribers: number;
    activeSubscribers: number;
    messagesCount: number;
    todayLogs: number;
  } | null;
}

export default function DailyStatCards({ stats }: DailyStatCardsProps) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{stats?.totalSubscribers || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Total Assinantes</Typography>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">{stats?.activeSubscribers || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Ativos</Typography>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">{stats?.messagesCount || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Mensagens Cadastradas</Typography>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ flex: '1 1 calc(50% - 8px)', minWidth: 150 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">{stats?.todayLogs || 0}</Typography>
            <Typography variant="body2" color="text.secondary">Envios Hoje</Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
