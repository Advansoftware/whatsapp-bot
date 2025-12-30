import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Chat } from '@mui/icons-material';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithGoogle, isLoading } = useAuth();
  const [error, setError] = useState<string>('');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Falha na autenticação com Google');
      return;
    }

    try {
      setError('');
      await loginWithGoogle(credentialResponse.credential);
      onLoginSuccess?.();
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
      console.error('Login error:', err);
    }
  };

  const handleGoogleError = () => {
    setError('Falha na autenticação com Google. Tente novamente.');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#111b21',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background effects */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: 500,
          height: 500,
          bgcolor: 'rgba(0, 168, 132, 0.1)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          right: '-5%',
          width: 400,
          height: 400,
          bgcolor: 'rgba(0, 168, 132, 0.05)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }}
      />

      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          mx: 2,
          bgcolor: '#202c33',
          borderRadius: 3,
          border: '1px solid #2a3942',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ pt: 6, pb: 3, px: 4, textAlign: 'center' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(0, 168, 132, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              border: '1px solid rgba(0, 168, 132, 0.2)',
            }}
          >
            <Chat sx={{ fontSize: 32, color: '#00a884' }} />
          </Box>
          <Typography
            variant="h4"
            sx={{ color: '#e9edef', fontWeight: 'bold', mb: 1 }}
          >
            Bem-vindo
          </Typography>
          <Typography sx={{ color: '#8696a0', fontSize: 14 }}>
            Faça login no seu painel de automação WhatsApp
          </Typography>
        </Box>

        {/* Login Form */}
        <Box sx={{ p: 4, pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#00a884' }} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Typography
                sx={{
                  color: '#8696a0',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Continue com
              </Typography>

              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="filled_black"
                size="large"
                width="300"
                text="signin_with"
                shape="rectangular"
              />

              <Typography
                sx={{
                  color: '#8696a0',
                  fontSize: 12,
                  textAlign: 'center',
                  maxWidth: 280,
                }}
              >
                Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
              </Typography>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            bgcolor: '#182329',
            py: 2,
            px: 4,
            textAlign: 'center',
            borderTop: '1px solid #2a3942',
          }}
        >
          <Typography sx={{ color: '#8696a0', fontSize: 14 }}>
            Não tem uma conta?{' '}
            <Box
              component="span"
              sx={{ color: '#00a884', fontWeight: 600, cursor: 'pointer' }}
            >
              O cadastro é automático
            </Box>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginView;