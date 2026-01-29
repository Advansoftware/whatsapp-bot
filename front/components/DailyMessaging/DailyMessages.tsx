"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
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
  Alert,
  Typography
} from '@mui/material';
import {
  Add,
  Upload,
  Edit,
  Delete
} from '@mui/icons-material';
import { dailyMessagingApi } from '@/lib/api';

interface DailyMessage {
  id: string;
  dayNumber: number;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isActive: boolean;
}

interface DailyMessagesProps {
  appId: string;
  messages: DailyMessage[];
  onRefresh: () => void;
}

export default function DailyMessages({ appId, messages, onRefresh }: DailyMessagesProps) {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({ dayNumber: 1, content: '', mediaUrl: '' });
  const [csvContent, setCsvContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveMessage = async () => {
    try {
      await dailyMessagingApi.createOrUpdateMessage({
        appId,
        dayNumber: messageForm.dayNumber,
        content: messageForm.content,
        mediaUrl: messageForm.mediaUrl || undefined,
      });
      setMessageDialogOpen(false);
      setMessageForm({ dayNumber: 1, content: '', mediaUrl: '' });
      setSuccess('Mensagem salva!');
      onRefresh();
    } catch (err: any) {
      setError('Erro ao salvar mensagem');
    }
  };

  const handleImportCsv = async () => {
    try {
      const lines = csvContent.split('\n').filter(l => l.trim());
      const messagesToImport = lines.map(line => {
        const [dayNumberStr, content, mediaUrl] = line.split(';');
        return {
          dayNumber: parseInt(dayNumberStr, 10),
          content: content?.trim() || '',
          mediaUrl: mediaUrl?.trim() || undefined,
        };
      }).filter(m => m.dayNumber && m.content);

      const result = await dailyMessagingApi.importMessages(appId, messagesToImport);
      setImportDialogOpen(false);
      setCsvContent('');
      setSuccess(`Importação concluída: ${result.created} criadas, ${result.updated} atualizadas`);
      onRefresh();
    } catch (err: any) {
      setError('Erro na importação');
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setMessageDialogOpen(true)}>
          Nova Mensagem
        </Button>
        <Button variant="outlined" startIcon={<Upload />} onClick={() => setImportDialogOpen(true)}>
          Importar CSV
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80 }}>Dia</TableCell>
              <TableCell>Mensagem</TableCell>
              <TableCell sx={{ width: 100 }}>Mídia</TableCell>
              <TableCell sx={{ width: 100 }} align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell>
                  <Chip label={`Dia ${msg.dayNumber}`} color="primary" size="small" />
                </TableCell>
                <TableCell sx={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.content}
                </TableCell>
                <TableCell>{msg.mediaUrl ? '✓' : '-'}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => {
                      setMessageForm({ dayNumber: msg.dayNumber, content: msg.content, mediaUrl: msg.mediaUrl || '' });
                      setMessageDialogOpen(true);
                    }}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!messages.length && (
              <TableRow>
                <TableCell colSpan={4} align="center">Nenhuma mensagem cadastrada</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mensagem do Dia</DialogTitle>
        <DialogContent>
          <TextField
            label="Número do Dia (1-365)"
            type="number"
            fullWidth
            margin="normal"
            inputProps={{ min: 1, max: 365 }}
            value={messageForm.dayNumber}
            onChange={(e) => setMessageForm({ ...messageForm, dayNumber: parseInt(e.target.value) || 1 })}
          />
          <TextField
            label="Conteúdo da Mensagem"
            fullWidth
            margin="normal"
            multiline
            rows={4}
            value={messageForm.content}
            onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
          />
          <TextField
            label="URL de Mídia (opcional)"
            fullWidth
            margin="normal"
            placeholder="https://..."
            value={messageForm.mediaUrl}
            onChange={(e) => setMessageForm({ ...messageForm, mediaUrl: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveMessage}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar Mensagens via CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Formato do arquivo CSV: dia;mensagem;url_midia (opcional)<br />
            Exemplo:<br />
            1;Olá, bem-vindo ao dia 1!;https://...<br />
            2;Mensagem do dia 2
          </Typography>
          <Box sx={{ mt: 2 }}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setCsvContent(event.target?.result as string || '');
                  };
                  reader.readAsText(file);
                }
              }}
              style={{ display: 'none' }}
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input">
              <Button variant="outlined" component="span" startIcon={<Upload />}>
                Selecionar Arquivo CSV
              </Button>
            </label>
            {csvContent && (
              <Typography variant="body2" sx={{ mt: 1 }} color="success.main">
                ✓ Arquivo carregado ({csvContent.split('\n').filter(l => l.trim()).length} linhas)
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportDialogOpen(false); setCsvContent(''); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleImportCsv} disabled={!csvContent}>Importar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
