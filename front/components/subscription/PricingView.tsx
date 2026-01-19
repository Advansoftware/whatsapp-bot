"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Check,
  Close,
  Star,
  Rocket,
  Business,
  ExpandMore,
  ExpandLess,
  WhatsApp,
  SmartToy,
  Support,
  Lock,
  LocalOffer,
  CreditCard,
  Security,
} from '@mui/icons-material';
import api from '../../lib/api';
import CheckoutView from './CheckoutView';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  enterprise?: boolean;
  icon: React.ReactNode;
  color: string;
  features: PlanFeature[];
  ctaText: string;
  ctaAction?: 'checkout' | 'contact';
}

const plans: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    description: 'Pare de perder clientes por não responder a tempo',
    priceMonthly: 197,
    priceYearly: 1970,
    icon: <Rocket sx={{ fontSize: 32 }} />,
    color: '#4CAF50',
    ctaText: 'Testar 7 Dias Grátis',
    ctaAction: 'checkout',
    features: [
      { name: 'Respostas automáticas 24h', included: true },
      { name: 'Entende áudios longos pra você', included: true },
      { name: 'Lembra das conversas anteriores', included: true },
      { name: 'Até 1.000 mensagens/mês', included: true },
      { name: 'Suporte por WhatsApp', included: true },
      { name: 'Agenda compromissos', included: false },
      { name: 'Controle de despesas', included: false },
      { name: 'Gestão de tarefas', included: false },
      { name: 'Mensagens ilimitadas', included: false },
    ],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    description: 'Nunca mais perca um cliente ou compromisso',
    priceMonthly: 297,
    priceYearly: 2970,
    popular: true,
    icon: <Star sx={{ fontSize: 32 }} />,
    color: '#00a884',
    ctaText: 'Quero Minha Secretária IA',
    ctaAction: 'checkout',
    features: [
      { name: 'Atendimento 24h sem você fazer nada', included: true },
      { name: 'Agenda compromissos na sua agenda', included: true },
      { name: 'Controla suas despesas automaticamente', included: true },
      { name: 'Cria e lembra suas tarefas', included: true },
      { name: 'Transcreve áudios longos em segundos', included: true },
      { name: 'Mensagens ilimitadas', included: true },
      { name: 'Suporte prioritário', included: true },
      { name: 'Integração Google Calendar', included: true },
      { name: 'Relatórios de atendimento', included: true },
    ],
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    description: 'Soluções personalizadas para sua empresa',
    priceMonthly: 0,
    priceYearly: 0,
    enterprise: true,
    icon: <Business sx={{ fontSize: 32 }} />,
    color: '#64748b',
    ctaText: 'Falar no WhatsApp',
    ctaAction: 'contact',
    features: [
      { name: 'Múltiplos números de WhatsApp', included: true },
      { name: 'Equipe com vários atendentes', included: true },
      { name: 'Integrações personalizadas', included: true },
      { name: 'Treinamento da IA para seu negócio', included: true },
      { name: 'Suporte dedicado', included: true },
      { name: 'SLA garantido', included: true },
      { name: 'API para integração', included: true },
      { name: 'White-label disponível', included: true },
    ],
  },
];

const faqs = [
  {
    question: 'Posso mudar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor será calculado proporcionalmente.',
  },
  {
    question: 'Como funciona o período de teste?',
    answer: 'Oferecemos 7 dias grátis em todos os planos para você testar. Não cobramos nada durante esse período e você pode cancelar quando quiser.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartões de crédito (Visa, Mastercard, American Express) e débito. Todos os pagamentos são processados de forma segura pelo Stripe.',
  },
  {
    question: 'O que acontece se eu exceder os limites do meu plano?',
    answer: 'Você receberá uma notificação quando estiver próximo do limite. Se ultrapassar, poderá fazer upgrade ou aguardar o próximo ciclo de faturamento.',
  },
  {
    question: 'Posso cancelar minha assinatura?',
    answer: 'Sim, você pode cancelar a qualquer momento sem multas ou taxas. Seu acesso continuará até o final do período pago.',
  },
  {
    question: 'A IA realmente entende e responde os clientes?',
    answer: 'Sim! Nossa IA é treinada para entender o contexto das conversas, lembrar do histórico e responder de forma natural, como uma secretária real.',
  },
];

const PricingView: React.FC = () => {
  const theme = useTheme();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await api.get('/api/subscription/current');
      setCurrentSubscription(data);
    } catch (err) {
      console.log('No active subscription');
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (plan.ctaAction === 'contact') {
      window.open(
        'https://wa.me/5535984216196?text=Olá!%20Tenho%20interesse%20no%20plano%20Empresarial%20do%20RespondIA.',
        '_blank'
      );
      return;
    }

    setSelectedPlan(plan.id);
    setShowCheckout(true);
  };

  const handleManageSubscription = async () => {
    setLoadingPlan('manage');
    try {
      const response = await api.post('/api/subscription/create-portal-session');
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir portal');
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateSavings = (monthly: number, yearly: number) => {
    const yearlyFromMonthly = monthly * 12;
    const savings = yearlyFromMonthly - yearly;
    const percentage = Math.round((savings / yearlyFromMonthly) * 100);
    return { savings, percentage };
  };

  // Show checkout view
  if (showCheckout && selectedPlan) {
    return (
      <CheckoutView
        planId={selectedPlan}
        billingPeriod={isYearly ? 'yearly' : 'monthly'}
        onBack={() => {
          setShowCheckout(false);
          setSelectedPlan(null);
        }}
        onSuccess={() => {
          fetchSubscription();
        }}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Planos simples e transparentes
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Escolha o plano ideal. Cancele a qualquer momento.
        </Typography>

        {/* Billing Toggle */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            borderRadius: 3,
            p: 1,
            gap: 2,
          }}
        >
          <Typography
            sx={{
              fontWeight: !isYearly ? 600 : 400,
              color: !isYearly ? 'primary.main' : 'text.secondary',
              cursor: 'pointer',
            }}
            onClick={() => setIsYearly(false)}
          >
            Mensal
          </Typography>
          <Switch
            checked={isYearly}
            onChange={(e) => setIsYearly(e.target.checked)}
            color="primary"
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{
                fontWeight: isYearly ? 600 : 400,
                color: isYearly ? 'primary.main' : 'text.secondary',
                cursor: 'pointer',
              }}
              onClick={() => setIsYearly(true)}
            >
              Anual
            </Typography>
            <Chip
              label="~17% off"
              size="small"
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Current Subscription Banner */}
      {currentSubscription && (
        <Alert
          severity="info"
          sx={{ mb: 4 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleManageSubscription}
              disabled={loadingPlan === 'manage'}
            >
              {loadingPlan === 'manage' ? <CircularProgress size={16} /> : 'Gerenciar'}
            </Button>
          }
        >
          Você está no plano <strong>{currentSubscription.planName}</strong> (
          {currentSubscription.billingPeriod === 'yearly' ? 'Anual' : 'Mensal'}).
          Próxima cobrança: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
        </Alert>
      )}

      {/* Plans Grid */}
      <Grid container spacing={3} justifyContent="center" sx={{ mb: 8 }}>
        {plans.map((plan) => {
          const monthlyEquivalent = isYearly && plan.priceYearly > 0 
            ? plan.priceYearly / 12 
            : plan.priceMonthly;
          const savings = calculateSavings(plan.priceMonthly, plan.priceYearly);
          const isCurrentPlan = currentSubscription?.planId === plan.id;

          return (
            <Grid size={{ xs: 12, sm: 6 }} lg={4} key={plan.id}>
              <Card
                elevation={plan.popular ? 8 : 2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: plan.popular
                    ? `2px solid ${plan.color}`
                    : isCurrentPlan
                    ? `2px solid ${theme.palette.success.main}`
                    : '1px solid',
                  borderColor: plan.popular
                    ? plan.color
                    : isCurrentPlan
                    ? 'success.main'
                    : 'divider',
                  borderRadius: 3,
                  overflow: 'visible',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: plan.popular ? 'translateY(-8px)' : 'translateY(-4px)',
                    boxShadow: theme.shadows[plan.popular ? 12 : 8],
                  },
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <Chip
                    label="MAIS VENDIDO"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 700,
                      px: 2,
                      bgcolor: plan.color,
                      color: '#111b21',
                    }}
                  />
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && !plan.popular && (
                  <Chip
                    label="Seu Plano Atual"
                    color="success"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 700,
                      px: 2,
                    }}
                  />
                )}

                {/* Enterprise Badge */}
                {plan.enterprise && (
                  <Chip
                    label="🏢 EMPRESAS"
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 700,
                      px: 2,
                      bgcolor: '#64748b',
                      color: 'white',
                    }}
                  />
                )}

                <CardContent sx={{ flexGrow: 1, pt: 4 }}>
                  {/* Plan Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: alpha(plan.color, 0.15),
                        color: plan.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {plan.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700}>
                        {plan.name}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                    {plan.description}
                  </Typography>

                  {/* Price */}
                  <Box sx={{ mb: 3 }}>
                    {plan.enterprise ? (
                      <Typography variant="h4" fontWeight={700}>
                        Sob consulta
                      </Typography>
                    ) : (
                      <>
                        {isYearly && plan.priceMonthly > 0 && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ textDecoration: 'line-through', mb: 0.5 }}
                          >
                            {formatPrice(plan.priceMonthly)}/mês
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                          <Typography variant="h3" fontWeight={700}>
                            {formatPrice(monthlyEquivalent)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            /mês
                          </Typography>
                        </Box>
                        {isYearly && savings.savings > 0 && (
                          <Chip
                            label={`Economia de ${formatPrice(savings.savings)}/ano`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </>
                    )}
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Features List */}
                  <List dense disablePadding>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          {feature.included ? (
                            <Check sx={{ color: 'success.main', fontSize: 20 }} />
                          ) : (
                            <Close sx={{ color: 'text.disabled', fontSize: 20 }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={feature.name}
                          primaryTypographyProps={{
                            variant: 'body2',
                            color: feature.included ? 'text.primary' : 'text.disabled',
                            fontWeight: feature.included && plan.popular ? 500 : 400,
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={plan.popular ? 'contained' : 'outlined'}
                    size="large"
                    disabled={isCurrentPlan || loadingPlan === plan.id}
                    onClick={() => handleSubscribe(plan)}
                    startIcon={plan.enterprise ? <WhatsApp /> : undefined}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 700,
                      bgcolor: plan.popular ? plan.color : undefined,
                      color: plan.popular ? '#111b21' : undefined,
                      borderColor: !plan.popular ? plan.color : undefined,
                      '&:hover': {
                        bgcolor: plan.popular ? alpha(plan.color, 0.9) : alpha(plan.color, 0.1),
                      },
                    }}
                  >
                    {loadingPlan === plan.id ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : isCurrentPlan ? (
                      'Plano Atual'
                    ) : (
                      plan.ctaText
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Features Included */}
      <Paper sx={{ p: 4, mb: 6, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          O que está incluído em todos os planos
        </Typography>
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {[
            { icon: <Security />, title: 'Criptografia de ponta', desc: 'Seus dados protegidos com criptografia avançada' },
            { icon: <Lock />, title: '7 dias grátis', desc: 'Teste sem compromisso antes de pagar' },
            { icon: <Support />, title: 'Suporte técnico', desc: 'Equipe pronta para ajudar você' },
            { icon: <CreditCard />, title: 'Pagamento seguro', desc: 'Processado pelo Stripe com total segurança' },
            { icon: <LocalOffer />, title: 'Sem fidelidade', desc: 'Cancele quando quiser sem multas' },
            { icon: <SmartToy />, title: 'IA de última geração', desc: 'Tecnologia avançada para automação inteligente' },
          ].map((item, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* FAQ Section */}
      <Paper sx={{ p: 4, mb: 6, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Perguntas Frequentes
        </Typography>
        <List>
          {faqs.map((faq, index) => (
            <React.Fragment key={index}>
              <ListItem
                component="div"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                sx={{ 
                  borderRadius: 2, 
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemText
                  primary={faq.question}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                {expandedFaq === index ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              <Collapse in={expandedFaq === index}>
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {faq.answer}
                  </Typography>
                </Box>
              </Collapse>
              {index < faqs.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Trust Badges */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Pagamento seguro processado por
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
            mt: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <Typography variant="h6" fontWeight={700} color="primary">
              stripe
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="success" />
            <Typography variant="body2">SSL Seguro</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCard color="primary" />
            <Typography variant="body2">PCI Compliant</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PricingView;
