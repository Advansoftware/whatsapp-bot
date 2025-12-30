import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Construction } from '@mui/icons-material';

interface PlaceholderViewProps {
  title: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  return (
    <Box 
      height="100%" 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="50vh"
      gap={2}
    >
      <Construction sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.5 }} />
      <Typography variant="h5" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Esta funcionalidade está em desenvolvimento.
      </Typography>
      <Button variant="outlined" sx={{ mt: 2 }}>
        Voltar ao Início
      </Button>
    </Box>
  );
};

export default PlaceholderView;