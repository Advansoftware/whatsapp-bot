import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { Forum, PersonAdd, Api } from '@mui/icons-material';
import StatCard from './StatCard';
import ActivityChart from './ActivityChart';
import RecentConversations from './RecentConversations';
import { StatData } from '../types';

const DashboardView: React.FC = () => {
  const stats: StatData[] = [
    {
      title: 'Total de Mensagens',
      value: '84.392',
      change: '12%',
      isPositive: true,
      subtext: 'vs mês anterior',
      icon: <Forum />
    },
    {
      title: 'Leads Ativos',
      value: '1.240',
      change: '5.2%',
      isPositive: true,
      subtext: 'vs mês anterior',
      icon: <PersonAdd />
    },
    {
      title: 'Status da API',
      value: 'Saudável',
      change: '99.9% Online',
      isPositive: true,
      subtext: 'Últimas 24h',
      icon: <Api />
    }
  ];

  return (
    <Box maxWidth="lg" mx="auto" display="flex" flexDirection="column" gap={4}>
      {/* Stats Grid */}
      <Grid container spacing={2}>
        {stats.map((stat, index) => (
          <Grid item xs={12} md={4} key={index}>
            <StatCard data={stat} />
          </Grid>
        ))}
      </Grid>

      {/* Chart */}
      <ActivityChart />

      {/* Table */}
      <RecentConversations />
      
      <Box component="footer" textAlign="center" py={2}>
        <Box 
            component="span" 
            sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
        >
            © 2023 WA Automator. Todos os direitos reservados. 
            <Box component="span" sx={{ color: 'primary.main', ml: 1, cursor: 'pointer' }}>Política de Privacidade</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardView;