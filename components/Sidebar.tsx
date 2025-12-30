import React from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Avatar,
  Divider,
  useTheme
} from '@mui/material';
import { 
  Dashboard, 
  Link as LinkIcon, 
  AccountTree, 
  Chat, 
  Settings, 
  CreditCard,
  ExpandMore,
  Inventory2 // Novo ícone importado
} from '@mui/icons-material';
import { View } from '../types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentView: View;
  onNavigate: (view: View) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, currentView, onNavigate }) => {
  const theme = useTheme();

  const menuItems: { text: string; icon: React.ReactNode; view: View; badge?: boolean }[] = [
    { text: 'Painel', icon: <Dashboard />, view: 'dashboard' },
    { text: 'Conexões', icon: <LinkIcon />, view: 'connections' },
    { text: 'Estoque', icon: <Inventory2 />, view: 'inventory' }, // Novo item
    { text: 'Fluxos (Chatbot)', icon: <AccountTree />, view: 'chatbot' },
    { text: 'Chat Ao Vivo', icon: <Chat />, view: 'livechat', badge: true },
  ];

  const systemItems: { text: string; icon: React.ReactNode; view: View }[] = [
    { text: 'Configurações', icon: <Settings />, view: 'settings' },
    { text: 'Assinatura', icon: <CreditCard />, view: 'subscription' },
  ];

  const sidebarContent = (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Logo */}
      <Box 
        sx={{ 
          h: 64, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          px: 3, 
          py: 3,
          borderBottom: `1px solid ${theme.palette.divider}` 
        }}
      >
        <Box 
          sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            bgcolor: 'primary.main', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <Chat fontSize="small" />
        </Box>
        <Typography variant="h6" fontWeight="bold" color="text.primary">
          WA Automator
        </Typography>
      </Box>

      {/* Nav */}
      <Box flex={1} overflow="auto" py={2}>
        <Typography variant="overline" color="text.secondary" sx={{ px: 3, fontWeight: 700 }}>
          Menu Principal
        </Typography>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <ListItemButton 
              key={item.text} 
              selected={currentView === item.view}
              onClick={() => onNavigate(item.view)}
              sx={{ 
                borderRadius: 2, 
                mb: 0.5,
                '&.Mui-selected': { 
                  bgcolor: theme.palette.mode === 'dark' ? '#2a3942' : '#e0e0e0',
                  '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#2a3942' : '#d5d5d5' }
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40, 
                color: currentView === item.view ? 'primary.main' : 'text.secondary' 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: currentView === item.view ? 'text.primary' : 'text.secondary'
                }} 
              />
              {item.badge && (
                 <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
              )}
            </ListItemButton>
          ))}
        </List>

        <Typography variant="overline" color="text.secondary" sx={{ px: 3, mt: 2, fontWeight: 700, display: 'block' }}>
          Sistema
        </Typography>
        <List sx={{ px: 2 }}>
          {systemItems.map((item) => (
            <ListItemButton 
              key={item.text}
              selected={currentView === item.view}
              onClick={() => onNavigate(item.view)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  variant: 'body2', 
                  fontWeight: 500,
                  color: 'text.secondary'
                }} 
              />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* User */}
      <Box p={2} sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            p: 1, 
            borderRadius: 2, 
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <Avatar 
            src="https://picsum.photos/100/100?random=5" 
            sx={{ width: 36, height: 36 }}
          />
          <Box flex={1} overflow="hidden">
            <Typography variant="body2" fontWeight={600} noWrap>
              Sarah Wilson
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Plano Pro
            </Typography>
          </Box>
          <ExpandMore color="action" />
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <Box 
        sx={{ 
          width: 280, 
          height: '100vh', 
          bgcolor: 'background.paper', 
          borderRight: `1px solid ${theme.palette.divider}`,
          position: 'sticky',
          top: 0,
          display: { xs: 'none', md: 'block' }
        }}
      >
        {sidebarContent}
      </Box>
    </>
  );
};

export default Sidebar;