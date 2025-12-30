import React from 'react';
import { Paper, Typography, Box, Button, ButtonGroup, useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

const data: ChartDataPoint[] = [
  { time: '00:00', messages: 200 },
  { time: '02:00', messages: 450 },
  { time: '04:00', messages: 600 },
  { time: '06:00', messages: 550 },
  { time: '08:00', messages: 1200 },
  { time: '10:00', messages: 1600 },
  { time: '12:00', messages: 1500 },
  { time: '14:00', messages: 1900 },
  { time: '16:00', messages: 2100 },
  { time: '18:00', messages: 2402 },
  { time: '20:00', messages: 2200 },
  { time: '22:00', messages: 1800 },
  { time: '23:59', messages: 1000 },
];

const ActivityChart: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper 
      elevation={0} 
      className="border border-gray-200 dark:border-[#2a3942]"
      sx={{ p: 3, borderRadius: 3 }}
    >
      <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={4} gap={2}>
        <Box>
          <Typography variant="h6" color="text.primary">
            Mensagens por Hora
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Volume de tráfego nas últimas 24 horas
          </Typography>
        </Box>
        <Box sx={{ bgcolor: 'background.default', p: 0.5, borderRadius: 2 }}>
            <ButtonGroup variant="text" size="small" aria-label="time range">
                <Button sx={{ color: 'text.primary', bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}>24h</Button>
                <Button sx={{ color: 'text.secondary' }}>7d</Button>
                <Button sx={{ color: 'text.secondary' }}>30d</Button>
            </ButtonGroup>
        </Box>
      </Box>

      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
              dy={10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme.palette.background.paper, 
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '8px',
                color: theme.palette.text.primary
              }}
              itemStyle={{ color: theme.palette.primary.main }}
              formatter={(value: number) => [value, 'Mensagens']}
              labelStyle={{ color: theme.palette.text.secondary }}
            />
            <Area 
              type="monotone" 
              dataKey="messages" 
              stroke={theme.palette.primary.main} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorMessages)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default ActivityChart;