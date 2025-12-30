import React from 'react';
import { 
  Box, 
  Typography, 
  IconButton, 
  Badge,
  useTheme
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  DarkMode, 
  LightMode, 
  Notifications, 
  Help 
} from '@mui/icons-material';

interface HeaderProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleTheme, isDarkMode }) => {
  const theme = useTheme();

  return (
    <Box 
      component="header" 
      sx={{ 
        height: 64, 
        px: 3, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${theme.palette.divider}`,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <IconButton sx={{ display: { md: 'none' } }}>
          <MenuIcon />
        </IconButton>
        <Box display={{ xs: 'none', md: 'block' }}>
          <Typography variant="h6" color="text.primary">
            Visão Geral
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Bem-vindo de volta ao seu espaço de trabalho
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1.5}>
        <IconButton onClick={toggleTheme} sx={{ bgcolor: 'action.hover' }}>
          {isDarkMode ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
        </IconButton>
        
        <IconButton sx={{ bgcolor: 'action.hover' }}>
          <Badge color="error" variant="dot">
            <Notifications fontSize="small" />
          </Badge>
        </IconButton>

        <IconButton sx={{ bgcolor: 'action.hover' }}>
          <Help fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Header;