"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Link,
  Person,
  Message,
  History,
  PlayArrow,
  Refresh
} from '@mui/icons-material';
import { dailyMessagingApi } from '@/lib/api';

import DailyStatCards from './DailyStatCards';
import DailyIntegrations from './DailyIntegrations';
import DailySubscribers from './DailySubscribers';
import DailyMessages from './DailyMessages';
import DailyLogs from './DailyLogs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`daily-tabpanel-${index}`}
      aria-labelledby={`daily-tab-${index}`}
      {...other}
      sx={{ py: 3 }}
    >
      {value === index && children}
    </Box>
  );
}

interface DailyAppDetailProps {
  appId: string;
  onBack: () => void;
}

export default function DailyAppDetail({ appId, onBack }: DailyAppDetailProps) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [app, setApp] = useState<any>(null); // Ideally fetch app details
  const [stats, setStats] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // We load different data based on tab to save bandwidth, or load all?
  // Let's load essential data on mount and refresh
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, subsData, msgsData] = await Promise.all([
        dailyMessagingApi.getStats(appId),
        dailyMessagingApi.getSubscribers(appId),
        dailyMessagingApi.getMessages(appId)
      ]);
      setStats(statsData);
      setSubscribers(subsData);
      setMessages(msgsData);
    } catch (err: any) {
      setError('Erro ao carregar dados do aplicativo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerDaily = async () => {
    try {
      const result = await dailyMessagingApi.triggerDaily();
      setSuccess(`Envio disparado com sucesso!`);
      loadData();
    } catch (err: any) {
      setError('Erro ao disparar envio');
    }
  };

  if (loading && !stats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
        Voltar para Lista
      </Button>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      {/* Stats */}
      <DailyStatCards stats={stats} />

      {/* Quick Actions */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" startIcon={<PlayArrow />} onClick={handleTriggerDaily}>
          Disparar Envio Diário
        </Button>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>
          Atualizar Dados
        </Button>
      </Box>

      {/* Tabs */}
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<Person />} label="Assinantes" />
          <Tab icon={<Message />} label="Mensagens" />
          <Tab icon={<Link />} label="Integrações" />
          <Tab icon={<History />} label="Logs" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <DailySubscribers appId={appId} subscribers={subscribers} onRefresh={loadData} />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <DailyMessages appId={appId} messages={messages} onRefresh={loadData} />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <DailyIntegrations appId={appId} />
        </TabPanel>

        <TabPanel value={tab} index={3}>
           {/* Logs component fetches its own data to handle pagination better */}
          <DailyLogs appId={appId} />
        </TabPanel>
      </Paper>
    </Box>
  );
}
