import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useDashboardActivity } from '../hooks/useApi';

const ActivityChart: React.FC = () => {
  const theme = useTheme();
  const { data: activityData, isLoading, error } = useDashboardActivity();

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Alert severity="error">Erro ao carregar gráfico de atividade</Alert>
      </Paper>
    );
  }

  // Fallback data if API returns empty
  const chartData = activityData?.length ? activityData : [
    { name: 'Seg', incoming: 0, outgoing: 0 },
    { name: 'Ter', incoming: 0, outgoing: 0 },
    { name: 'Qua', incoming: 0, outgoing: 0 },
    { name: 'Qui', incoming: 0, outgoing: 0 },
    { name: 'Sex', incoming: 0, outgoing: 0 },
    { name: 'Sáb', incoming: 0, outgoing: 0 },
    { name: 'Dom', incoming: 0, outgoing: 0 },
  ];

  return (
    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Atividade de Mensagens
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Últimos 7 dias
      </Typography>
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis 
              dataKey="name" 
              stroke={theme.palette.text.secondary}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <YAxis 
              stroke={theme.palette.text.secondary}
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 8
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="incoming" 
              name="Recebidas"
              stroke={theme.palette.primary.main} 
              fillOpacity={1} 
              fill="url(#colorIncoming)" 
            />
            <Area 
              type="monotone" 
              dataKey="outgoing" 
              name="Enviadas"
              stroke={theme.palette.secondary.main} 
              fillOpacity={1} 
              fill="url(#colorOutgoing)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ActivityChart;