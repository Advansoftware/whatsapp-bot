"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  Message,
  ArrowForward
} from '@mui/icons-material';
import { dailyMessagingApi } from '@/lib/api';

interface App {
  id: string;
  name: string;
  _count: {
    subscribers: number;
    messages: number;
  };
}

interface DailyAppsListProps {
  apps: App[];
  onSelectApp: (appId: string) => void;
  onRefresh: () => void;
}

export default function DailyAppsList({ apps, onSelectApp, onRefresh }: DailyAppsListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState('');
  
  // Menu state for delete
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const handleCreateApp = async () => {
    if (!appName.trim()) return;
    
    try {
      setLoading(true);
      await dailyMessagingApi.createApp(appName);
      setCreateDialogOpen(false);
      setAppName('');
      onRefresh();
    } catch (err: any) {
      setError('Erro ao criar aplicativo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedAppId) return;
    
    if (!confirm('Tem certeza? Isso excluirá todos os assinantes, mensagens e histórico deste aplicativo.')) {
      setAnchorEl(null);
      return;
    }

    try {
      setLoading(true);
      await dailyMessagingApi.deleteApp(selectedAppId);
      onRefresh();
    } catch (err: any) {
      setError('Erro ao excluir aplicativo');
    } finally {
      setLoading(false);
      setAnchorEl(null);
      setSelectedAppId(null);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Seus Aplicativos / Produtos
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => setCreateDialogOpen(true)}
        >
          Novo App
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {apps.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Message sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum aplicativo encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie seu primeiro aplicativo para começar a enviar mensagens diárias.
          </Typography>
          <Button variant="outlined" onClick={() => setCreateDialogOpen(true)}>
            Criar Agora
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {apps.map((app) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.id}>
              <Card 
                variant="outlined" 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 2
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom noWrap title={app.name}>
                      {app.name}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                        setSelectedAppId(app.id);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Assinantes</Typography>
                      <Typography variant="h6">{app._count.subscribers}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Mensagens</Typography>
                      <Typography variant="h6">{app._count.messages}</Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 2, pt: 0 }}>
                  <Button 
                    variant="contained" 
                    size="small" 
                    endIcon={<ArrowForward />}
                    onClick={() => onSelectApp(app.id)}
                  >
                    Gerenciar
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Novo Aplicativo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Dê um nome para identificar este produto ou curso (ex: "Curso de Inglês", "Mentoria 2025").
          </Typography>
          <TextField
            autoFocus
            label="Nome do Aplicativo"
            fullWidth
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateApp} 
            disabled={!appName.trim() || loading}
          >
            {loading ? 'Criando...' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={handleDeleteApp} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>
    </Box>
  );
}
