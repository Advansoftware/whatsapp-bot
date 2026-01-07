import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Link, 
  Step, 
  StepLabel, 
  Stepper,
  StepConnector,
  stepConnectorClasses,
  styled,
  useTheme,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  IconButton,
  Chip
} from '@mui/material';
import { 
  Check, 
  SmartToy, 
  MoreVert, 
  Settings, 
  OpenInNew,
  QrCodeScanner,
  Refresh,
  Add,
  Delete,
  Sync,
  LinkOff,
  QrCode2
} from '@mui/icons-material';
import { useConnections } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';
import api from '../lib/api';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { completed?: boolean; active?: boolean };
}>(({ theme, ownerState }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage: `linear-gradient( 136deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    boxShadow: '0 4px 10px 0 rgba(0,0,0,.25)',
  }),
  ...(ownerState.completed && {
    backgroundImage: `linear-gradient( 136deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  }),
}));

function ColorlibStepIcon(props: any) {
  const { active, completed, className } = props;

  const icons: { [index: string]: React.ReactElement } = {
    1: <Check />,
    2: <QrCodeScanner />,
    3: <SmartToy />,
  };

  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

const ConnectionsView: React.FC = () => {
  const theme = useTheme();
  const { data: connections, isLoading, error, refetch } = useConnections();
  const { socket } = useSocket();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [syncingInstances, setSyncingInstances] = useState<Record<string, string>>({});
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [reconnectDialogOpen, setReconnectDialogOpen] = useState(false);
  const [instanceToReconnect, setInstanceToReconnect] = useState<any>(null);

  const steps = ['Inicializando Cliente', 'Gerando QR Code', 'Conectado'];

  // Listen for real-time WebSocket updates from Evolution API webhooks
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: any) => {
      console.log('[WebSocket] Received:', data);
      
      // Handle History Sync (NEW)
      if (data.type === 'history_sync' && data.instanceKey) {
         setSyncingInstances(prev => ({...prev, [data.instanceKey]: 'syncing'}));
         return;
      }
      
      // Handle QR Code updates
      if (data.type === 'qrcode_update' && data.instanceKey) {
        console.log('[WebSocket] QR Code update for:', data.instanceKey);
        setSelectedInstance((prev: any) => {
          if (prev?.instanceKey === data.instanceKey || prev?.name === data.instanceKey) {
            return { ...prev, qrCodeUrl: data.qrcode, status: 'qr_ready' };
          }
          return prev;
        });
        setSyncingInstances(prev => ({...prev, [data.instanceKey]: 'qr_ready'}));
      }
      
      // Handle connection state updates
      if (data.type === 'connection_update' && data.instanceKey) {
        console.log('[WebSocket] Connection update for:', data.instanceKey, 'state:', data.state);
        const state = data.state;
        
        // Always update the selected instance status if it matches, regardless of state
        setSelectedInstance((prev: any) => {
          if (prev?.instanceKey === data.instanceKey || prev?.name === data.instanceKey) {
             // Map evolution states to our internal status
             let newStatus = 'disconnected';
             if (state === 'open' || state === 'connected') newStatus = 'connected';
             else if (state === 'connecting') newStatus = 'syncing'; // temporary internal state
             
             return { ...prev, status: newStatus };
          }
          return prev;
        });

        if (state === 'open' || state === 'connected') {
          setSyncingInstances(prev => ({...prev, [data.instanceKey]: 'connected'}));
          refetch();
        } else if (state === 'close' || state === 'closed') {
          setSyncingInstances(prev => ({...prev, [data.instanceKey]: 'disconnected'}));
          refetch();
        } else if (state === 'connecting') {
          setSyncingInstances(prev => ({...prev, [data.instanceKey]: 'syncing'}));
        }
      }
    };

    socket.on('new_message', handleMessage);

    return () => {
      socket.off('new_message', handleMessage);
    };
  }, [socket, refetch]);

  const handleCreateConnection = async () => {
    if (!newInstanceName.trim()) return;
    
    setCreating(true);
    try {
      const result = await api.createConnection(newInstanceName);
      setSelectedInstance(result);
      setSyncingInstances(prev => ({...prev, [result.instanceKey]: 'initializing'}));
      setCreateDialogOpen(false);
      setNewInstanceName('');
      refetch();
    } catch (err) {
      console.error('Error creating connection:', err);
    } finally {
      setCreating(false);
    }
  };

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

  const confirmDeleteConnection = (id: string) => {
    setInstanceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConnection = async () => {
    if (!instanceToDelete) return;
    
    try {
      await api.deleteConnection(instanceToDelete);
      // Immediately clear selection if we deleted the active one
      if (selectedInstance?.id === instanceToDelete) {
        setSelectedInstance(null);
      }
      refetch();
    } catch (err) {
      console.error('Error deleting connection:', err);
    } finally {
        setDeleteDialogOpen(false);
        setInstanceToDelete(null);
    }
  };

  const confirmReconnect = (conn: any) => {
    setInstanceToReconnect(conn);
    setReconnectDialogOpen(true);
  };

  const handleReconnect = async () => {
    if (!instanceToReconnect) return;
    
    setReconnecting(instanceToReconnect.id);
    setReconnectDialogOpen(false);
    
    try {
      const result = await api.reconnectInstance(instanceToReconnect.id);
      console.log('[Reconnect] Result:', result);
      
      // Selecionar a instância para mostrar o QR code
      setSelectedInstance({
        ...instanceToReconnect,
        ...result,
      });
      
      setSyncingInstances(prev => ({...prev, [result.instanceKey]: 'qr_ready'}));
      refetch();
    } catch (err) {
      console.error('Error reconnecting:', err);
    } finally {
      setReconnecting(null);
      setInstanceToReconnect(null);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'connected':
        return 2;
      case 'qr_ready':
        return 1;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'qr_ready':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 'lg', mx: 'auto' }}>
        Erro ao carregar conexões: {error.message}
      </Alert>
    );
  }

  return (
    <Box maxWidth="lg" mx="auto" display="flex" flexDirection="column" gap={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Conectar WhatsApp
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie suas instâncias do WhatsApp conectadas à plataforma.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Nova Conexão
        </Button>
      </Box>

      {/* Existing Connections */}
      {connections && connections.length > 0 && (
        <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
          <Box p={3} borderBottom={`1px solid ${theme.palette.divider}`} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              Suas Conexões ({connections.length})
            </Typography>
            <IconButton 
              onClick={() => refetch()} 
              size="small" 
              title="Atualizar status"
              color="primary"
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
          <Box>
            {connections.map((conn) => (
              <Box
                key={conn.id}
                sx={{
                  p: 3,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <SmartToy color="primary" />
                  <Box>
                    <Typography fontWeight={500}>{conn.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {conn.instanceKey}
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  {syncingInstances[conn.instanceKey] === 'syncing' ? (
                    <Chip
                      icon={<Sync sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />}
                      label="Sincronizando..."
                      color="info"
                      size="small"
                    />
                  ) : (
                    <Chip
                      label={conn.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      color={getStatusColor(conn.status) as any}
                      size="small"
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={() => confirmReconnect(conn)}
                    color="primary"
                    disabled={reconnecting === conn.id}
                    title="Reconectar (gerar novo QR code)"
                  >
                    {reconnecting === conn.id ? (
                      <CircularProgress size={18} />
                    ) : (
                      <QrCode2 fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => confirmDeleteConnection(conn.id)}
                    color="error"
                    title="Excluir conexão"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Main Connection Card - Show when no connections or creating new */}
      {(!connections || connections.length === 0 || selectedInstance) && (
        <Paper elevation={0} sx={{ overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
          <Grid container>
            {/* Instructions */}
            <Grid item xs={12} md={6} sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Instruções
              </Typography>
              <Box component="ol" sx={{ pl: 2, '& li': { mb: 2, color: 'text.secondary' } }}>
                <li>
                  <Typography component="span" fontWeight="500" color="text.primary">Abra o WhatsApp</Typography> no seu celular
                </li>
                <li>
                  Toque em <Typography component="span" fontWeight="500" color="text.primary">Menu</Typography> <MoreVert fontSize="inherit" /> ou <Typography component="span" fontWeight="500" color="text.primary">Configurações</Typography> <Settings fontSize="inherit" /> e selecione <Typography component="span" fontWeight="500" color="text.primary">Aparelhos Conectados</Typography>
                </li>
                <li>
                  Toque em <Typography component="span" fontWeight="500" color="text.primary">Conectar um aparelho</Typography>
                </li>
                <li>
                  Aponte seu celular para esta tela para capturar o código
                </li>
              </Box>
              <Box mt={4} pt={3} borderTop={`1px solid ${theme.palette.divider}`}>
                <Link href="#" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                  Precisa de ajuda para conectar? <OpenInNew fontSize="small" />
                </Link>
              </Box>
            </Grid>

            {/* QR Code Area */}
            <Grid item xs={12} md={6} sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderLeft: { md: `1px solid ${theme.palette.divider}` }
            }}>
              {selectedInstance ? (
                <>
                    {/* Show success when connected */}
                    {selectedInstance.status === 'connected' ? (
                      <Box sx={{ textAlign: 'center', p: 4 }}>
                        <Check sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                        <Typography variant="h6" color="success.main" gutterBottom>
                          WhatsApp Conectado!
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Sua instância está pronta para enviar e receber mensagens.
                        </Typography>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, boxShadow: 3, position: 'relative' }}>
                          {(!selectedInstance.qrCodeUrl || selectedInstance.qrCodeUrl.length < 50) ? (
                             <Box sx={{ width: 250, height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                               <CircularProgress />
                               <Typography variant="body2" color="text.secondary">Gerando código...</Typography>
                             </Box>
                          ) : (
                            <Box 
                              sx={{ 
                                width: 250, 
                                height: 250, 
                                backgroundImage: selectedInstance.qrCodeUrl?.startsWith('data:image') 
                                  ? `url('${selectedInstance.qrCodeUrl}')`
                                  : `url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedInstance.qrCodeUrl)}')`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                              }} 
                            />
                          )}
                        </Box>
                        <Box mt={3} textAlign="center">
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                            {syncingInstances[selectedInstance.instanceKey] === 'syncing' ? (
                              <>
                                <Sync sx={{ fontSize: 16, color: 'info.main', animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
                                <Typography variant="body2" color="info.main">Sincronizando contatos...</Typography>
                              </>
                            ) : (
                              <>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', animation: 'pulse 2s infinite' }} />
                                <Typography variant="body2" color="text.secondary">Aguardando leitura...</Typography>
                              </>
                            )}
                          </Box>
                          <Button
                            startIcon={<Refresh />}
                            size="small"
                            onClick={() => api.refreshQrCode(selectedInstance.id)}
                          >
                            Recarregar Código QR
                          </Button>
                        </Box>
                      </>
                    )}
                </>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography color="text.secondary" mb={2}>
                    Crie uma nova conexão para começar
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    Nova Conexão
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Stepper */}
      {selectedInstance && (
        <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}` }}>
          <Stepper alternativeLabel activeStep={getStatusStep(selectedInstance.status)} connector={<ColorlibConnector />}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
      )}

      {/* Create Connection Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome da Instância"
            placeholder="Ex: Atendimento Principal"
            fullWidth
            value={newInstanceName}
            onChange={(e) => setNewInstanceName(e.target.value)}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreateConnection} variant="contained" disabled={creating || !newInstanceName.trim()}>
            {creating ? <CircularProgress size={24} /> : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Excluir Conexão?</DialogTitle>
        <DialogContent>
            <Typography>
                Tem certeza que deseja excluir esta conexão? Esta ação irá desconectar o WhatsApp e parar o bot para esta instância.
            </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConnection} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reconnect Confirmation Dialog */}
      <Dialog open={reconnectDialogOpen} onClose={() => setReconnectDialogOpen(false)}>
        <DialogTitle>Reconectar WhatsApp?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Esta ação irá:
          </Typography>
          <Box component="ul" sx={{ pl: 2, mt: 1 }}>
            <li>
              <Typography variant="body2" color="text.secondary">
                Desconectar a sessão atual do WhatsApp
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                Gerar um novo QR Code para reconexão
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="success.main" fontWeight={500}>
                Manter todos os seus dados (mensagens, contatos, etc.)
              </Typography>
            </li>
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            Você precisará escanear o novo QR Code com seu celular.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconnectDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleReconnect} color="primary" variant="contained" startIcon={<QrCode2 />}>
            Reconectar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConnectionsView;