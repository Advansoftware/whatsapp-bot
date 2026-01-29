"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Add,
  Cancel,
  CheckCircle,
  Delete
} from '@mui/icons-material';
import { dailyMessagingApi } from '@/lib/api';

// Helper to calculate journey day (days since start + 1)
function getJourneyDay(startDateStr: string): number {
  const startDate = new Date(startDateStr);
  const now = new Date();
  const oneDay = 1000 * 60 * 60 * 24;
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / oneDay);
  return daysSinceStart + 1; // Day 1 = purchase day
}

interface Subscriber {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  currentDay: number;
  startDate: string;
  source: string;
}

interface DailySubscribersProps {
  appId: string;
  subscribers: Subscriber[];
  onRefresh: () => void;
}

export default function DailySubscribers({ appId, subscribers, onRefresh }: DailySubscribersProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [subscriberForm, setSubscriberForm] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'paused': return 'warning';
      case 'opted_out': return 'error';
      case 'refunded': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'completed': return 'Completo';
      case 'paused': return 'Pausado';
      case 'opted_out': return 'Optou sair';
      case 'refunded': return 'Reembolsado';
      default: return status;
    }
  };

  const handleCreateSubscriber = async () => {
    try {
      await dailyMessagingApi.createSubscriber({ ...subscriberForm, appId });
      setCreateDialogOpen(false);
      setSubscriberForm({ name: '', email: '', phone: '' });
      setSuccess('Assinante criado com sucesso!');
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar assinante');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await dailyMessagingApi.updateSubscriber(id, { status });
      setSuccess('Status atualizado!');
      onRefresh();
    } catch (err: any) {
      setError('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este assinante?')) return;
    try {
      await dailyMessagingApi.deleteSubscriber(id);
      setSuccess('Assinante excluído!');
      onRefresh();
    } catch (err: any) {
      setError('Erro ao excluir assinante');
    }
  };

  const filteredSubscribers = statusFilter 
    ? subscribers.filter(s => s.status === statusFilter)
    : subscribers;

  return (
    <Box>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
          Novo Assinante
        </Button>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="paused">Pausado</MenuItem>
            <MenuItem value="completed">Completo</MenuItem>
            <MenuItem value="opted_out">Optou sair</MenuItem>
            <MenuItem value="refunded">Reembolsado</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Início</TableCell>
              <TableCell>Dia da Jornada</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Origem</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSubscribers.map((sub) => {
              const journeyDay = getJourneyDay(sub.startDate);
              const isExpired = journeyDay > 365;
              return (
                <TableRow key={sub.id}>
                  <TableCell>{sub.name}</TableCell>
                  <TableCell>{sub.phone}</TableCell>
                  <TableCell>{new Date(sub.startDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={isExpired ? 'Finalizado' : `Dia ${journeyDay}/365`} 
                      color={isExpired ? 'default' : journeyDay > 300 ? 'warning' : 'primary'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={getStatusLabel(sub.status)} color={getStatusColor(sub.status) as any} size="small" />
                  </TableCell>
                  <TableCell>{sub.source}</TableCell>
                  <TableCell align="right">
                    {sub.status === 'active' && (
                      <Tooltip title="Pausar">
                        <IconButton size="small" onClick={() => handleUpdateStatus(sub.id, 'paused')}>
                          <Cancel />
                        </IconButton>
                      </Tooltip>
                    )}
                    {sub.status === 'paused' && (
                      <Tooltip title="Ativar">
                        <IconButton size="small" onClick={() => handleUpdateStatus(sub.id, 'active')}>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Excluir">
                      <IconButton size="small" color="error" onClick={() => handleDelete(sub.id)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {!filteredSubscribers.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">Nenhum assinante encontrado</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Assinante</DialogTitle>
        <DialogContent>
          <TextField
            label="Nome"
            fullWidth
            margin="normal"
            value={subscriberForm.name}
            onChange={(e) => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
          />
          <TextField
            label="Telefone (com DDD)"
            fullWidth
            margin="normal"
            placeholder="+5535999999999"
            value={subscriberForm.phone}
            onChange={(e) => setSubscriberForm({ ...subscriberForm, phone: e.target.value })}
          />
          <TextField
            label="Email (opcional)"
            fullWidth
            margin="normal"
            value={subscriberForm.email}
            onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateSubscriber}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
