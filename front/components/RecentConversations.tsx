import React, { useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Avatar,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import { useRecentConversations } from '../hooks/useApi';
import { useSocket } from '../hooks/useSocket';

const RecentConversations: React.FC = () => {
  const theme = useTheme();
  const { data: conversations, isLoading, error, refetch } = useRecentConversations();
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      console.log('New message received:', data);
      refetch();
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, refetch]);

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
        <Alert severity="error">Erro ao carregar conversas recentes</Alert>
      </Paper>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'processed':
        return 'Respondido';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  const getInitials = (contact: string) => {
    // Extract numbers for initials
    const numbers = contact.replace(/\D/g, '');
    return numbers.slice(-2) || '??';
  };

  return (
    <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
      <Box p={3} borderBottom={`1px solid ${theme.palette.divider}`}>
        <Typography variant="h6" fontWeight="bold">
          Conversas Recentes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Últimas mensagens recebidas
        </Typography>
      </Box>
      
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contato</TableCell>
              <TableCell>Última Mensagem</TableCell>
              <TableCell>Instância</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Tempo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conversations && conversations.length > 0 ? (
              conversations.map((conv) => (
                <TableRow 
                  key={conv.id} 
                  hover 
                  sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar 
                        sx={{ 
                          bgcolor: theme.palette.primary.main,
                          width: 36,
                          height: 36,
                          fontSize: 14
                        }}
                      >
                        {getInitials(conv.contact)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {conv.contact}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {conv.lastMessage}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {conv.instanceName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(conv.status)} 
                      color={getStatusColor(conv.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(conv.timestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    Nenhuma conversa ainda. As mensagens aparecerão aqui quando chegarem.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default RecentConversations;