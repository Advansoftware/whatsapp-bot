"use client";

import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button,
  InputAdornment,
  IconButton,
  Divider,
  useTheme
} from '@mui/material';
import { 
  CloudUpload, 
  VisibilityOff, 
  Visibility, 
  Save, 
  Key, 
  Api 
} from '@mui/icons-material';

const SettingsView: React.FC = () => {
  const theme = useTheme();
  const [showKey, setShowKey] = React.useState(false);

  return (
    <Box maxWidth="md" mx="auto" pb={8}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Configurações White Label
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Personalize a marca do seu painel e configure conexões de API externas.
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={4}>
        {/* Branding Section */}
        <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Box px={3} py={2} borderBottom={`1px solid ${theme.palette.divider}`}>
            <Typography variant="h6" fontWeight="600">Identidade Visual</Typography>
          </Box>
          
          <Box p={3} display="flex" flexDirection="column" gap={4}>
            {/* Logo Upload */}
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>Logotipo da Aplicação</Typography>
                <Typography variant="caption" color="text.secondary">
                  Tamanho recomendado: 512x512px. <br/> Tamanho máx: 2MB.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Box 
                  sx={{ 
                    border: `2px dashed ${theme.palette.divider}`, 
                    borderRadius: 2, 
                    p: 4, 
                    textAlign: 'center',
                    bgcolor: theme.palette.action.hover,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: theme.palette.action.selected },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: '50%', 
                      bgcolor: 'primary.main', 
                      bgOpacity: 0.1,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      color: 'primary.contrastText'
                    }}
                  >
                    <CloudUpload fontSize="large" />
                  </Box>
                  <Typography variant="subtitle2">Clique para enviar ou arraste e solte</Typography>
                  <Typography variant="caption" color="text.secondary">SVG, PNG, JPG ou GIF</Typography>
                </Box>
              </Grid>
            </Grid>

            <Divider />

            {/* Colors */}
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>Cores da Marca</Typography>
                <Typography variant="caption" color="text.secondary">
                  Escolha as cores que correspondem à identidade da sua marca.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                      Cor Primária
                    </Typography>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1} 
                      p={1} 
                      border={`1px solid ${theme.palette.divider}`} 
                      borderRadius={1}
                      bgcolor="background.default"
                    >
                      <Box 
                        component="input" 
                        type="color" 
                        defaultValue="#00a884"
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          border: 'none', 
                          p: 0, 
                          bgcolor: 'transparent',
                          cursor: 'pointer' 
                        }} 
                      />
                      <Typography variant="body2" fontFamily="monospace">#00A884</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                      Cor Secundária
                    </Typography>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      gap={1} 
                      p={1} 
                      border={`1px solid ${theme.palette.divider}`} 
                      borderRadius={1}
                      bgcolor="background.default"
                    >
                      <Box 
                        component="input" 
                        type="color" 
                        defaultValue="#1f2c34"
                        sx={{ 
                          width: 32, 
                          height: 32, 
                          border: 'none', 
                          p: 0, 
                          bgcolor: 'transparent',
                          cursor: 'pointer' 
                        }} 
                      />
                      <Typography variant="body2" fontFamily="monospace">#1F2C34</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* API Integration */}
        <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
          <Box px={3} py={2} borderBottom={`1px solid ${theme.palette.divider}`}>
            <Typography variant="h6" fontWeight="600">Integração de API</Typography>
          </Box>
          <Box p={3} display="flex" flexDirection="column" gap={3}>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Chave API OpenAI</Typography>
              <TextField
                fullWidth
                type={showKey ? 'text' : 'password'}
                defaultValue="sk-proj-****************************"
                placeholder="sk-..."
                variant="outlined"
                helperText="Usado para respostas do chatbot de IA e respostas automáticas."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Key color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowKey(!showKey)} edge="end">
                        {showKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>Chave API Evolution</Typography>
              <TextField
                fullWidth
                type="password"
                defaultValue="••••••••••••••••••••••••••••••"
                variant="outlined"
                helperText="Conecta sua instância do WhatsApp ao motor de automação."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Api color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton edge="end">
                        <VisibilityOff />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

          </Box>
        </Paper>

        <Box display="flex" justifyContent="flex-end" gap={2}>
           <Button variant="text" color="inherit">Cancelar</Button>
           <Button variant="contained" startIcon={<Save />} disableElevation size="large">
             Salvar Alterações
           </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SettingsView;