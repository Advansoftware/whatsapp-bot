"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Pagination
} from '@mui/material';
import { dailyMessagingApi } from '@/lib/api';

interface SendLog {
  id: string;
  dayNumber: number;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  subscriber: { name: string; phone: string };
}

interface DailyLogsProps {
  appId: string;
}

export default function DailyLogs({ appId }: DailyLogsProps) {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const data = await dailyMessagingApi.getLogs({ 
          appId, 
          limit: 50, 
          offset: (page - 1) * 50 
        });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to load logs', err);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [appId, page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviado';
      case 'failed': return 'Falhou';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  return (
    <Box>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Data</TableCell>
              <TableCell>Assinante</TableCell>
              <TableCell>Dia</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Erro</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.createdAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell>{log.subscriber?.name || log.subscriber?.phone}</TableCell>
                <TableCell>{log.dayNumber}</TableCell>
                <TableCell>
                  <Chip label={getStatusLabel(log.status)} color={getStatusColor(log.status) as any} size="small" />
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.error || '-'}
                </TableCell>
              </TableRow>
            ))}
            {!logs.length && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {loading ? 'Carregando...' : 'Nenhum log encontrado'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {total > 50 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={Math.ceil(total / 50)} page={page} onChange={(_, p) => setPage(p)} />
        </Box>
      )}
    </Box>
  );
}
