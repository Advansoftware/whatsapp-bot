import React from 'react';
import { 
  Paper, 
  Typography, 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Avatar, 
  Chip,
  Pagination,
  useTheme
} from '@mui/material';
import { Search, FilterList, Visibility, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Conversation } from '../types';

const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Alice Freeman',
    phone: '+1 (555) 012-3456',
    avatar: 'https://picsum.photos/100/100?random=1',
    lastMessage: "Olá, gostaria de saber mais sobre o plano premium.",
    status: 'Open',
    time: '12:42'
  },
  {
    id: '2',
    name: 'John Doe',
    phone: '+1 (555) 987-6543',
    avatar: 'https://picsum.photos/100/100?random=2',
    lastMessage: 'Pode reagendar meu compromisso para terça?',
    status: 'Pending',
    time: '11:30'
  },
  {
    id: '3',
    name: 'Michael Chen',
    phone: '+1 (555) 456-7890',
    avatar: 'https://picsum.photos/100/100?random=3',
    lastMessage: 'Obrigado pelo suporte rápido!',
    status: 'Closed',
    time: '09:15'
  },
  {
    id: '4',
    name: 'Emma Stone',
    phone: '+1 (555) 222-3333',
    avatar: 'https://picsum.photos/100/100?random=4',
    lastMessage: 'A integração com Shopify está funcionando agora?',
    status: 'Open',
    time: 'Ontem'
  }
];

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'Open': return 'Aberto';
    case 'Pending': return 'Pendente';
    case 'Closed': return 'Fechado';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Open': return 'success';
    case 'Pending': return 'warning';
    case 'Closed': return 'default';
    default: return 'default';
  }
};

const RecentConversations: React.FC = () => {
  const theme = useTheme();

  return (
    <Paper 
      elevation={0} 
      className="border border-gray-200 dark:border-[#2a3942] overflow-hidden"
      sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column' }}
    >
      <Box p={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" color="text.primary">
          Conversas Recentes
        </Typography>
        <Box display="flex" gap={1}>
          <TextField
            placeholder="Buscar contato..."
            size="small"
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { 
                bgcolor: 'background.default',
                borderRadius: 2,
                '& fieldset': { border: 'none' },
                width: { xs: 150, sm: 250 }
              }
            }}
          />
          <IconButton sx={{ color: 'text.secondary' }}>
            <FilterList />
          </IconButton>
        </Box>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>NOME / CONTATO</TableCell>
              <TableCell>ÚLTIMA MENSAGEM</TableCell>
              <TableCell align="center">STATUS</TableCell>
              <TableCell align="right">HORA</TableCell>
              <TableCell align="right">AÇÃO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conversations.map((row) => (
              <TableRow 
                key={row.id} 
                hover 
                sx={{ 
                  cursor: 'pointer',
                  '&:last-child td, &:last-child th': { border: 0 } 
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar src={row.avatar} alt={row.name} sx={{ width: 32, height: 32 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="text.primary">{row.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.phone}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {row.lastMessage}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={getStatusLabel(row.status)} 
                    size="small" 
                    color={getStatusColor(row.status) as any}
                    variant="outlined"
                    sx={{ 
                        fontWeight: 600, 
                        fontSize: '0.7rem',
                        height: 22,
                        bgcolor: row.status === 'Open' ? 'rgba(0,168,132,0.1)' : row.status === 'Pending' ? 'rgba(255,210,121,0.1)' : 'rgba(134,150,160,0.1)',
                        borderColor: row.status === 'Open' ? 'rgba(0,168,132,0.3)' : row.status === 'Pending' ? 'rgba(255,210,121,0.3)' : 'rgba(134,150,160,0.3)',
                        color: row.status === 'Open' ? 'success.main' : row.status === 'Pending' ? 'warning.main' : 'text.secondary'
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {row.time}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box p={2} display="flex" justifyContent="space-between" alignItems="center" sx={{ bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          Mostrando <Box component="span" fontWeight="bold" color="text.primary">1</Box> a <Box component="span" fontWeight="bold" color="text.primary">4</Box> de <Box component="span" fontWeight="bold" color="text.primary">120</Box> resultados
        </Typography>
        <Box display="flex" gap={1}>
            <IconButton size="small" disabled sx={{ bgcolor: 'action.hover' }}><ChevronLeft /></IconButton>
            <IconButton size="small" sx={{ bgcolor: 'action.hover' }}><ChevronRight /></IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default RecentConversations;