"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Send,
  Upload,
  PlayArrow,
  Refresh,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  Message,
  History,
} from '@mui/icons-material';
import { dailyMessagingApi } from '@/lib/api';

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

interface Subscriber {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  status: string;
  currentDay: number;
  startDate: string;
  lastSentAt: string | null;
  source: string;
  _count?: { sendLogs: number };
}

interface DailyMessage {
  id: string;
  dayNumber: number;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isActive: boolean;
}

interface SendLog {
  id: string;
  dayNumber: number;
  status: string;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
  subscriber: { name: string; phone: string };
}

interface Stats {
  totalSubscribers: number;
  activeSubscribers: number;
  messagesCount: number;
  todayLogs: number;
}

export default function DailyMessagingView() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [messages, setMessages] = useState<DailyMessage[]>([]);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);

  // Dialogs
  const [subscriberDialogOpen, setSubscriberDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Form data
  const [subscriberForm, setSubscriberForm] = useState({ name: '', email: '', phone: '' });
  const [messageForm, setMessageForm] = useState({ dayNumber: 1, content: '', mediaUrl: '' });
  const [csvContent, setCsvContent] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Load data
  const loadStats = useCallback(async () => {
    try {
      const data = await dailyMessagingApi.getStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadSubscribers = useCallback(async () => {
    try {
      const data = await dailyMessagingApi.getSubscribers(statusFilter || undefined);
      setSubscribers(data);
    } catch (err: any) {
      setError('Erro ao carregar assinantes');
    }
  }, [statusFilter]);

  const loadMessages = useCallback(async () => {
    try {
      const data = await dailyMessagingApi.getMessages();
      setMessages(data);
    } catch (err: any) {
      setError('Erro ao carregar mensagens');
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const data = await dailyMessagingApi.getLogs({ limit: 50, offset: (logsPage - 1) * 50 });
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch (err: any) {
      setError('Erro ao carregar logs');
    }
  }, [logsPage]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadSubscribers(), loadMessages(), loadLogs()]);
      setLoading(false);
    };
    load();
  }, [loadStats, loadSubscribers, loadMessages, loadLogs]);

  // Handlers
  const handleCreateSubscriber = async () => {
    try {
      await dailyMessagingApi.createSubscriber(subscriberForm);
      setSubscriberDialogOpen(false);
      setSubscriberForm({ name: '', email: '', phone: '' });
      setSuccess('Assinante criado com sucesso!');
      loadSubscribers();
      loadStats();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar assinante');
    }
  };

  const handleUpdateSubscriberStatus = async (id: string, status: string) => {
    try {
      await dailyMessagingApi.updateSubscriber(id, { status });
      setSuccess('Status atualizado!');
      loadSubscribers();
      loadStats();
    } catch (err: any) {
      setError('Erro ao atualizar status');
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm('Deseja excluir este assinante?')) return;
    try {
      await dailyMessagingApi.deleteSubscriber(id);
      setSuccess('Assinante excluído!');
      loadSubscribers();
      loadStats();
    } catch (err: any) {
      setError('Erro ao excluir assinante');
    }
  };

  const handleSaveMessage = async () => {
    try {
      await dailyMessagingApi.createOrUpdateMessage({
        dayNumber: messageForm.dayNumber,
        content: messageForm.content,
        mediaUrl: messageForm.mediaUrl || undefined,
      });
      setMessageDialogOpen(false);
      setMessageForm({ dayNumber: 1, content: '', mediaUrl: '' });
      setSuccess('Mensagem salva!');
      loadMessages();
      loadStats();
    } catch (err: any) {
      setError('Erro ao salvar mensagem');
    }
  };

  const handleImportCsv = async () => {
    try {
      const lines = csvContent.split('\n').filter(l => l.trim());
      const messages = lines.map(line => {
        const [dayNumberStr, content, mediaUrl] = line.split(';');
        return {
          dayNumber: parseInt(dayNumberStr, 10),
          content: content?.trim() || '',
          mediaUrl: mediaUrl?.trim() || undefined,
        };
      }).filter(m => m.dayNumber && m.content);

      const result = await dailyMessagingApi.importMessages(messages);
      setImportDialogOpen(false);
      setCsvContent('');
      setSuccess(`Importação concluída: ${result.created} criadas, ${result.updated} atualizadas`);
      loadMessages();
      loadStats();
    } catch (err: any) {
      setError('Erro na importação');
    }
  };

  const handleTriggerDaily = async () => {
    try {
      setLoading(true);
      const result = await dailyMessagingApi.triggerDaily();
      setSuccess(`Envio concluído: ${result.sent} enviadas, ${result.failed} falhas`);
      loadStats();
      loadLogs();
    } catch (err: any) {
      setError('Erro ao disparar envio');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'paused': return 'warning';
      case 'opted_out': return 'error';
      case 'refunded': return 'error';
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
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
      case 'sent': return 'Enviado';
      case 'failed': return 'Falhou';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  if (loading && !subscribers.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        📬 Mensagens Diárias
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gerencie assinantes e envie 1 mensagem por dia por 365 dias
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Stats Cards */}
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
              <Typography variant="h4" color="info.main">{stats?.messagesCount || 0}/365</Typography>
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

      {/* Quick Actions */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" startIcon={<PlayArrow />} onClick={handleTriggerDaily} disabled={loading}>
          Disparar Envio Agora
        </Button>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => { loadSubscribers(); loadMessages(); loadLogs(); loadStats(); }}>
          Atualizar
        </Button>
      </Box>

      {/* Tabs */}
      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<Person />} label="Assinantes" />
          <Tab icon={<Message />} label="Mensagens" />
          <Tab icon={<History />} label="Logs" />
        </Tabs>

        {/* Subscribers Tab */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
            <Button variant="contained" startIcon={<Add />} onClick={() => setSubscriberDialogOpen(true)}>
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
                  <TableCell>Dia Atual</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Origem</TableCell>
                  <TableCell>Último Envio</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.name}</TableCell>
                    <TableCell>{sub.phone}</TableCell>
                    <TableCell>{sub.currentDay}/365</TableCell>
                    <TableCell>
                      <Chip label={getStatusLabel(sub.status)} color={getStatusColor(sub.status) as any} size="small" />
                    </TableCell>
                    <TableCell>{sub.source}</TableCell>
                    <TableCell>{sub.lastSentAt ? new Date(sub.lastSentAt).toLocaleString('pt-BR') : '-'}</TableCell>
                    <TableCell align="right">
                      {sub.status === 'active' && (
                        <Tooltip title="Pausar">
                          <IconButton size="small" onClick={() => handleUpdateSubscriberStatus(sub.id, 'paused')}>
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      )}
                      {sub.status === 'paused' && (
                        <Tooltip title="Ativar">
                          <IconButton size="small" onClick={() => handleUpdateSubscriberStatus(sub.id, 'active')}>
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Excluir">
                        <IconButton size="small" color="error" onClick={() => handleDeleteSubscriber(sub.id)}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!subscribers.length && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Nenhum assinante encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Messages Tab */}
        <TabPanel value={tab} index={1}>
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
        </TabPanel>

        {/* Logs Tab */}
        <TabPanel value={tab} index={2}>
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
                    <TableCell colSpan={5} align="center">Nenhum log encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {logsTotal > 50 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination count={Math.ceil(logsTotal / 50)} page={logsPage} onChange={(_, p) => setLogsPage(p)} />
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Subscriber Dialog */}
      <Dialog open={subscriberDialogOpen} onClose={() => setSubscriberDialogOpen(false)} maxWidth="sm" fullWidth>
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
          <Button onClick={() => setSubscriberDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateSubscriber}>Salvar</Button>
        </DialogActions>
      </Dialog>

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
