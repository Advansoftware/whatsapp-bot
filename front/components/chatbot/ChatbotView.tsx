import React from 'react';
import { Box, Typography, Button, Paper, Grid } from '@mui/material';
import { AccountTree, Add } from '@mui/icons-material';

const ChatbotView: React.FC = () => {
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
        <Button variant="contained" startIcon={<Add />}>
          Novo Fluxo
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ccc', bgcolor: 'transparent', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
            <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Criar Novo Fluxo</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
           <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
             <Box display="flex" alignItems="center" gap={2} mb={2}>
               <AccountTree color="primary" />
               <Typography variant="h6">Boas Vindas</Typography>
             </Box>
             <Typography variant="body2" color="text.secondary" paragraph>
               Fluxo padrão para novos contatos. Envia mensagem de saudação e menu inicial.
             </Typography>
             <Box mt="auto">
               <Button size="small">Editar</Button>
             </Box>
           </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatbotView;
