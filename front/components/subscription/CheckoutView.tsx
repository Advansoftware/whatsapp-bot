import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack,
  Check,
  Lock,
  CreditCard,
  Schedule,
  Verified,
  WhatsApp,
  SmartToy,
  Campaign,
  CalendarMonth,
  TaskAlt,
  Receipt,
  Security,
  LocalOffer,
} from '@mui/icons-material';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import api from '../../lib/api';

// Initialize Stripe - use your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

interface CheckoutViewProps {
  planId: string;
  billingPeriod: 'monthly' | 'yearly';
  onBack: () => void;
  onSuccess?: () => void;
}

const plans: Record<string, Plan> = {
  essencial: {
    id: 'essencial',
    name: 'Essencial',
    description: 'Pare de perder clientes por não responder a tempo',
    priceMonthly: 197,
    priceYearly: 1970,
    features: [
      'Respostas automáticas 24h',
      'Entende áudios longos pra você',
      'Lembra das conversas anteriores',
      'Até 1.000 mensagens/mês',
      'Suporte por WhatsApp',
    ],
  },
  profissional: {
    id: 'profissional',
    name: 'Profissional',
    description: 'Nunca mais perca um cliente ou compromisso',
    priceMonthly: 297,
    priceYearly: 2970,
    features: [
      'Atendimento 24h sem você fazer nada',
      'Agenda compromissos na sua agenda',
      'Controla suas despesas automaticamente',
      'Cria e lembra suas tarefas',
      'Transcreve áudios longos em segundos',
      'Mensagens ilimitadas',
      'Suporte prioritário',
    ],
  },
};

const featureIcons: Record<string, React.ReactNode> = {
  'Respostas automáticas 24h': <WhatsApp fontSize="small" />,
  'Entende áudios longos pra você': <SmartToy fontSize="small" />,
  'Lembra das conversas anteriores': <SmartToy fontSize="small" />,
  'Até 1.000 mensagens/mês': <Campaign fontSize="small" />,
  'Suporte por WhatsApp': <WhatsApp fontSize="small" />,
  'Atendimento 24h sem você fazer nada': <WhatsApp fontSize="small" />,
  'Agenda compromissos na sua agenda': <CalendarMonth fontSize="small" />,
  'Controla suas despesas automaticamente': <Receipt fontSize="small" />,
  'Cria e lembra suas tarefas': <TaskAlt fontSize="small" />,
  'Transcreve áudios longos em segundos': <SmartToy fontSize="small" />,
  'Mensagens ilimitadas': <Campaign fontSize="small" />,
  'Suporte prioritário': <Verified fontSize="small" />,
};

const CheckoutView: React.FC<CheckoutViewProps> = ({
  planId,
  billingPeriod,
  onBack,
  onSuccess,
}) => {
  const theme = useTheme();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const plan = plans[planId];
  const price = billingPeriod === 'yearly' ? plan?.priceYearly : plan?.priceMonthly;
  const monthlyEquivalent = billingPeriod === 'yearly' ? price / 12 : price;
  const savings = billingPeriod === 'yearly' 
    ? (plan?.priceMonthly * 12) - plan?.priceYearly 
    : 0;

  useEffect(() => {
    const createCheckout = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post('/api/subscription/create-embedded-checkout', {
          planId,
          billingPeriod,
        });

        setClientSecret(response.clientSecret);
        setActiveStep(1);
      } catch (err: any) {
        setError(err.message || 'Erro ao iniciar checkout');
      } finally {
        setLoading(false);
      }
    };

    if (plan) {
      createCheckout();
    }
  }, [planId, billingPeriod]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleComplete = useCallback(() => {
    setActiveStep(2);
    onSuccess?.();
  }, [onSuccess]);

  if (!plan) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Alert severity="error">Plano não encontrado</Alert>
        <Button onClick={onBack} sx={{ mt: 2 }}>
          Voltar
        </Button>
      </Box>
    );
  }

  const steps = ['Selecionar Plano', 'Pagamento', 'Confirmação'];

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          onClick={onBack}
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Finalizar Assinatura
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pagamento seguro processado pelo Stripe
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 400px' },
          gap: 4,
        }}
      >
        {/* Checkout Form */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.background.paper, 0.6)
              : 'background.paper',
          }}
        >
          {activeStep === 2 ? (
            <Fade in>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Check sx={{ fontSize: 40 }} />
                </Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                  Assinatura Confirmada!
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4 }}>
                  Seu plano {plan.name} foi ativado com sucesso.
                  <br />
                  Você tem 7 dias de teste grátis!
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onBack}
                  sx={{ borderRadius: 2, px: 4 }}
                >
                  Começar a Usar
                </Button>
              </Box>
            </Fade>
          ) : loading ? (
            <Box sx={{ py: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <CircularProgress size={24} />
                <Typography>Preparando checkout seguro...</Typography>
              </Box>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Box>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout 
                className={theme.palette.mode === 'dark' ? 'stripe-dark' : 'stripe-light'}
              />
            </EmbeddedCheckoutProvider>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">
                Não foi possível carregar o checkout
              </Typography>
              <Button onClick={onBack} sx={{ mt: 2 }}>
                Tentar Novamente
              </Button>
            </Box>
          )}
        </Paper>

        {/* Order Summary */}
        <Box>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: theme.palette.mode === 'dark'
                ? alpha(theme.palette.background.paper, 0.6)
                : 'background.paper',
              position: 'sticky',
              top: 24,
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Resumo do Pedido
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Plan Info */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography fontWeight={600}>Plano {plan.name}</Typography>
                <Chip
                  label={billingPeriod === 'yearly' ? 'Anual' : 'Mensal'}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {plan.description}
              </Typography>
            </Box>

            {/* Features */}
            <List dense disablePadding sx={{ mb: 3 }}>
              {plan.features.slice(0, 5).map((feature, index) => (
                <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'success.main' }}>
                    {featureIcons[feature] || <Check fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={feature}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
              {plan.features.length > 5 && (
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>
                    <Check fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`+${plan.features.length - 5} recursos`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      color: 'text.secondary',
                    }}
                  />
                </ListItem>
              )}
            </List>

            <Divider sx={{ my: 2 }} />

            {/* Pricing */}
            <Box sx={{ mb: 2 }}>
              {billingPeriod === 'yearly' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Preço mensal regular
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    {formatPrice(plan.priceMonthly)}/mês
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {billingPeriod === 'yearly' ? 'Valor equivalente' : 'Valor mensal'}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatPrice(monthlyEquivalent)}/mês
                </Typography>
              </Box>
              {savings > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">
                    Economia no ano
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    -{formatPrice(savings)}
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Total */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                Total {billingPeriod === 'yearly' ? 'anual' : ''}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatPrice(price)}
                </Typography>
                {billingPeriod === 'yearly' && (
                  <Typography variant="caption" color="text.secondary">
                    cobrado anualmente
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Trial Badge */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                border: '1px solid',
                borderColor: alpha(theme.palette.success.main, 0.3),
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Schedule sx={{ color: 'success.main' }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    7 dias grátis para testar
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cancele a qualquer momento sem cobranças
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Trust Badges */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Lock sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Pagamento 100% seguro com criptografia SSL
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CreditCard sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Processado pelo Stripe - PCI Compliant
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <LocalOffer sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Garantia de satisfação ou seu dinheiro de volta
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Security Badge */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            <Security sx={{ fontSize: 20, color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={600} color="primary.main">
              stripe
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Checkout Seguro
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Custom styles for Stripe Elements in dark mode */}
      <style>
        {`
          .stripe-dark .EmbeddedCheckout {
            --colorBackground: ${theme.palette.background.paper};
            --colorText: ${theme.palette.text.primary};
            --colorPrimary: ${theme.palette.primary.main};
            --colorDanger: ${theme.palette.error.main};
            --fontFamily: ${theme.typography.fontFamily};
            --borderRadius: 8px;
          }
        `}
      </style>
    </Box>
  );
};

export default CheckoutView;
