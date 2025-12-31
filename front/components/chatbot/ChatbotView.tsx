
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Chip
} from '@mui/material';
import { AccountTree, Add, Edit, Delete, Save } from '@mui/icons-material';
import { api } from '../../lib/api';

interface ChatNode {
  content: string;
  type: 'text' | 'button';
  parentId?: string;
}

interface ChatFlow {
  id?: string;
  name: string;
  keyword: string;
  isActive: boolean;
  nodes: ChatNode[];
}

const ChatbotView: React.FC = () => {
  const [flows, setFlows] = useState<ChatFlow[]>([]);
  const [open, setOpen] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<ChatFlow>({
    name: '',
    keyword: '',
    isActive: true,
    nodes: [{ content: '', type: 'text' }]
  });

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const data = await api.getFlows();
      setFlows(data);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (currentFlow.id) {
        await api.updateFlow(currentFlow.id, currentFlow);
      } else {
        await api.createFlow(currentFlow);
      }
      setOpen(false);
      loadFlows();
    } catch (error) {
      console.error('Error saving flow:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este fluxo?')) {
      try {
        await api.deleteFlow(id);
        loadFlows();
      } catch (error) {
        console.error('Error deleting flow:', error);
      }
    }
  };

  const handleEdit = (flow: ChatFlow) => {
    setCurrentFlow(flow);
    setOpen(true);
  };

  const handleAddNew = () => {
    setCurrentFlow({
      name: '',
      keyword: '',
      isActive: true,
      nodes: [{ content: '', type: 'text' }]
    });
    setOpen(true);
  };

  return (
    <Box maxWidth="lg" mx="auto" p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Fluxos de Conversa
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Crie e gerencie fluxos automatizados para seus atendimentos.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Novo Fluxo
        </Button>
      </Box>

      <Grid container spacing={3}>
        {flows.map((flow) => (
          <Grid item xs={12} md={4} key={flow.id}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <AccountTree color="primary" />
                <Typography variant="h6">{flow.name}</Typography>
              </Box>
              
              <Box mb={2}>
                <Chip label={`Gatilho: "${flow.keyword}"`} size="small" color="secondary" variant="outlined" />
                <Chip 
                  label={flow.isActive ? 'Ativo' : 'Inativo'} 
                  size="small" 
                  color={flow.isActive ? 'success' : 'default'} 
                  sx={{ ml: 1 }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                Passos: {flow.nodes?.length || 0}
              </Typography>

              <Box mt="auto" display="flex" justifyContent="flex-end" gap={1}>
                <IconButton onClick={() => handleEdit(flow)} color="primary">
                  <Edit />
                </IconButton>
                <IconButton onClick={() => handleDelete(flow.id!)} color="error">
                  <Delete />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}
        
        {flows.length === 0 && (
           <Grid item xs={12}>
             <Typography align="center" color="text.secondary" py={4}>
               Nenhum fluxo criado. Clique em "Novo Fluxo" para começar.
             </Typography>
           </Grid>
        )}
      </Grid>

      {/* Dialog for Create/Edit */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{currentFlow.id ? 'Editar Fluxo' : 'Novo Fluxo'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Nome do Fluxo"
                value={currentFlow.name}
                onChange={(e) => setCurrentFlow({ ...currentFlow, name: e.target.value })}
                placeholder="Ex: Boas Vindas"
              />
            </Grid>
            <Grid item xs={12} md={4}>
               <FormControlLabel
                control={
                  <Switch
                    checked={currentFlow.isActive}
                    onChange={(e) => setCurrentFlow({ ...currentFlow, isActive: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Palavra-chave Gatilho"
                value={currentFlow.keyword}
                onChange={(e) => setCurrentFlow({ ...currentFlow, keyword: e.target.value })}
                helperText="Quando o cliente enviar essa palavra exata, o fluxo iniciará."
              />
            </Grid>

            {/* Simplistic Node Editor for Step 1 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Resposta do Bot</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Mensagem de Resposta"
                value={currentFlow.nodes[0]?.content || ''}
                onChange={(e) => {
                  const newNodes = [...currentFlow.nodes];
                  newNodes[0] = { ...newNodes[0], content: e.target.value };
                  setCurrentFlow({ ...currentFlow, nodes: newNodes });
                }}
                placeholder="Olá! Como posso ajudar?"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} startIcon={<Save />}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatbotView;
