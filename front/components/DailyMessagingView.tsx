"use client";

import React, { useState, useEffect } from 'react';
import { Box, Typography,  CircularProgress, Alert } from '@mui/material';
import { dailyMessagingApi } from '@/lib/api';
import DailyAppsList from './DailyMessaging/DailyAppsList';
import DailyAppDetail from './DailyMessaging/DailyAppDetail';

export default function DailyMessagingView() {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApps = async () => {
    try {
      setLoading(true);
      const data = await dailyMessagingApi.getApps();
      setApps(data);
    } catch (err: any) {
      console.error('Failed to load apps:', err);
      setError('Erro ao carregar aplicativos. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedAppId(null);
    setViewMode('list');
    loadApps(); // Refresh stats on list when returning
  };

  if (loading && viewMode === 'list') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header only shown in list mode, or maybe always? let's keep it simple for now */}
      {viewMode === 'list' && (
         <Box sx={{ mb: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
              📬 Gestor de Mensagens Diárias
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie seus produtos, cursos e funis de mensagens diárias (jornada de 365 dias).
            </Typography>
         </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {viewMode === 'list' ? (
        <DailyAppsList 
          apps={apps} 
          onSelectApp={handleSelectApp} 
          onRefresh={loadApps} 
        />
      ) : (
        selectedAppId && (
          <DailyAppDetail 
            appId={selectedAppId} 
            onBack={handleBackToList} 
          />
        )
      )}
    </Box>
  );
}
