import React, { useState } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Divider,
  Link,
  IconButton,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import { Chat, Visibility, VisibilityOff } from '@mui/icons-material';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { loginWithGoogle, login, register, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [success, setSuccess] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password });
        setSuccess('Login realizado com sucesso! Redirecionando...');
      } else {
        await register(formData);
        setSuccess('Cadastro realizado com sucesso! Redirecionando...');
      }
      
      // Delay redirection to show success message
      setTimeout(() => {
        onLoginSuccess?.();
      }, 1500);
    } catch (err: any) {
      console.error('Auth error:', err);
      // Format error message better if possible
      let msg = err.message;
      if (msg === 'Unauthorized' || msg === 'Request failed') {
        msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
      } else if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        msg = 'Erro de conexão: O servidor não está respondendo. Verifique se o backend está rodando.';
      }
      setError(msg || 'Erro ao autenticar. Tente novamente.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Falha na autenticação com Google');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await loginWithGoogle(credentialResponse.credential);
      setSuccess('Login com Google realizado com sucesso!');
      setTimeout(() => {
        onLoginSuccess?.();
      }, 1500);
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.');
      console.error('Google login error:', err);
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
        <Box sx={{ pt: 6, pb: 2, px: 4, textAlign: 'center' }}>
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
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </Typography>
          <Typography sx={{ color: '#8696a0', fontSize: 14 }}>
            {isLogin 
              ? 'Faça login para acessar seu painel' 
              : 'Comece a automatizar seu WhatsApp hoje mesmo'}
          </Typography>
        </Box>

        {/* Login Form */}
        <Box sx={{ p: 4, pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!isLogin && (
                <TextField
                  fullWidth
                  label="Nome Completo"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  variant="outlined"
                  required={!isLogin}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#e9edef',
                      '& fieldset': { borderColor: '#2a3942' },
                      '&:hover fieldset': { borderColor: '#00a884' },
                    },
                    '& .MuiInputLabel-root': { color: '#8696a0' },
                  }}
                />
              )}

              <TextField
                fullWidth
                label="E-mail"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#e9edef',
                    '& fieldset': { borderColor: '#2a3942' },
                    '&:hover fieldset': { borderColor: '#00a884' },
                  },
                  '& .MuiInputLabel-root': { color: '#8696a0' },
                }}
              />

              <TextField
                fullWidth
                label="Senha"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: '#8696a0' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#e9edef',
                    '& fieldset': { borderColor: '#2a3942' },
                    '&:hover fieldset': { borderColor: '#00a884' },
                  },
                  '& .MuiInputLabel-root': { color: '#8696a0' },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{
                  mt: 2,
                  bgcolor: '#00a884',
                  '&:hover': { bgcolor: '#008f6f' },
                  height: 48,
                  fontWeight: 'bold',
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  isLogin ? 'Entrar' : 'Cadastrar'
                )}
              </Button>
            </Box>
          </form>

          <Box sx={{ my: 3, display: 'flex', alignItems: 'center' }}>
            <Divider sx={{ flex: 1, borderColor: '#2a3942' }} />
            <Typography sx={{ px: 2, color: '#8696a0', fontSize: 12 }}>
              OU
            </Typography>
            <Divider sx={{ flex: 1, borderColor: '#2a3942' }} />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              theme="filled_black"
              size="large"
              width="300"
              text={isLogin ? "signin_with" : "signup_with"}
              shape="rectangular"
            />
          </Box>
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
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <Link
              component="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({ name: '', email: '', password: '' });
              }}
              sx={{
                color: '#00a884',
                fontWeight: 600,
                textDecoration: 'none',
                verticalAlign: 'baseline',
              }}
            >
              {isLogin ? 'Cadastre-se' : 'Faça Login'}
            </Link>
          </Typography>
        </Box>
      </Paper>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginView;