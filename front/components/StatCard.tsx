"use client";

import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { StatData } from '../types';

interface StatCardProps {
  data: StatData;
}

const StatCard: React.FC<StatCardProps> = ({ data }) => {
  return (
    <Paper 
      elevation={0} 
      className="relative overflow-hidden transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-[#2a3942]"
      sx={{ p: 3, height: '100%' }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
            {data.title}
          </Typography>
          <Typography variant="h4" color="text.primary">
            {data.value}
          </Typography>
        </Box>
        <Box 
          sx={{ 
            bgcolor: 'background.default', 
            p: 1, 
            borderRadius: 2, 
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {data.icon}
        </Box>
      </Box>
      
      <Box display="flex" alignItems="center" gap={1}>
        <Chip 
          label={
            <Box display="flex" alignItems="center" gap={0.5}>
              {data.isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
              {data.change}
            </Box>
          } 
          size="small"
          sx={{ 
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: data.isPositive ? 'rgba(0, 168, 132, 0.1)' : 'rgba(241, 92, 109, 0.1)',
            color: data.isPositive ? 'success.main' : 'error.main',
            borderRadius: '6px'
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {data.subtext}
        </Typography>
      </Box>
    </Paper>
  );
};

export default StatCard;