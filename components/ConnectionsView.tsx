import React from 'react';
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
  useTheme
} from '@mui/material';
import { 
  Check, 
  SmartToy, 
  MoreVert, 
  Settings, 
  OpenInNew,
  QrCodeScanner,
  Refresh
} from '@mui/icons-material';

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
  const steps = ['Inicializando Cliente', 'Gerando QR Code', 'Conectado'];

  const logs = [
    { time: '[10:42:01]', type: 'INFO', msg: 'Inicializando cliente WWebJS v2.24.1...', color: '#4ade80' },
    { time: '[10:42:02]', type: 'INFO', msg: 'Carregando dados da sessão do armazenamento local...', color: '#4ade80' },
    { time: '[10:42:03]', type: 'WARN', msg: 'Nenhuma sessão ativa encontrada. Iniciando novo fluxo de autenticação.', color: '#facc15' },
    { time: '[10:42:03]', type: 'INFO', msg: 'Buscando motor de navegador mais recente...', color: '#4ade80' },
    { time: '[10:42:05]', type: 'INFO', msg: 'Navegador iniciado com sucesso (PID: 23901)', color: '#4ade80' },
    { time: '[10:42:06]', type: 'SUCCESS', msg: 'QR Code gerado. Aguardando leitura do usuário...', color: '#4ade80' },
    { time: '[10:42:07]', type: 'DEBUG', msg: 'Aguardando evento de "autenticado"...', color: '#60a5fa', animate: true },
  ];

  return (
    <Box maxWidth="lg" mx="auto" display="flex" flexDirection="column" gap={4}>
      <Box mb={2}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Conecte sua conta do WhatsApp
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Escaneie o código QR para vincular seu dispositivo à plataforma de automação. Suportamos Múltiplos Dispositivos (Beta).
        </Typography>
      </Box>

      {/* Main Connection Card */}
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
            <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, boxShadow: 3, position: 'relative' }}>
              <Box 
                sx={{ 
                  width: 250, 
                  height: 250, 
                  backgroundImage: `url('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Example')`,
                  backgroundSize: 'contain',
                  opacity: 0.8
                }} 
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: '50%', boxShadow: 1, display: 'flex' }}>
                   <SmartToy sx={{ fontSize: 40, color: '#25D366' }} />
                </Box>
              </Box>
            </Box>
            <Box mt={3} textAlign="center">
               <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                 <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                 <Typography variant="body2" color="text.secondary">Aguardando leitura...</Typography>
               </Box>
               <Link href="#" component="button" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mx: 'auto' }}>
                 <Refresh fontSize="small" /> Recarregar Código QR
               </Link>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Stepper */}
      <Paper elevation={0} sx={{ p: 4, border: `1px solid ${theme.palette.divider}` }}>
        <Stepper alternativeLabel activeStep={1} connector={<ColorlibConnector />}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Terminal Logs */}
      <Box>
        <Box display="flex" justifyContent="space-between" mb={1} px={1}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
            Logs do Sistema
          </Typography>
          <Box display="flex" gap={1}>
            {[1, 2, 3].map(i => <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: theme.palette.action.disabled }} />)}
          </Box>
        </Box>
        <Paper 
          elevation={0}
          sx={{ 
            bgcolor: '#000', 
            color: '#e0e0e0', 
            p: 2, 
            fontFamily: 'monospace', 
            fontSize: '0.85rem',
            height: 200,
            overflowY: 'auto',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          {logs.map((log, index) => (
            <Box key={index} display="flex" gap={1} mb={0.5} sx={{ opacity: log.animate ? 1 : 0.8 }} className={log.animate ? 'animate-pulse' : ''}>
              <Box component="span" sx={{ color: 'grey.500', userSelect: 'none' }}>{log.time}</Box>
              <Box component="span" sx={{ color: log.color, fontWeight: 'bold' }}>{log.type}:</Box>
              <Box component="span">{log.msg}</Box>
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  );
};

export default ConnectionsView;