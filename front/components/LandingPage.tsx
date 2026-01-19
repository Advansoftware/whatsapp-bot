"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Grid,
  Paper,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import {
  AutoAwesome,
  PlayCircle,
  CheckCircle,
  Schedule,
  PersonOff,
  EventBusy,
  HearingDisabled,
  MoneyOff,
  Repeat,
  Psychology,
  CalendarMonth,
  RecordVoiceOver,
  AccountBalanceWallet,
  Checklist,
  Forum,
  Campaign,
  Inventory2,
  DoneAll,
  SentimentSatisfied,
  AttachFile,
  Mic,
  Check,
  Star,
} from "@mui/icons-material";

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const theme = useTheme();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Pain points data
  const painPoints = [
    {
      icon: <Schedule sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Sem tempo",
      description: '"Passo o dia inteiro respondendo WhatsApp e não consigo trabalhar no que realmente importa."',
    },
    {
      icon: <PersonOff sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Perdendo clientes",
      description: '"Cliente mandou mensagem às 22h, vi só no dia seguinte. Ele já tinha comprado do concorrente."',
    },
    {
      icon: <EventBusy sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Esquecendo compromissos",
      description: '"Marquei uma reunião por WhatsApp e esqueci de anotar. Perdi o cliente."',
    },
    {
      icon: <HearingDisabled sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Áudios intermináveis",
      description: '"Cliente manda áudio de 5 minutos e não tenho tempo de ouvir. Acabo ignorando."',
    },
    {
      icon: <MoneyOff sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Gastando demais",
      description: '"Queria uma secretária mas não posso pagar R$ 2.000/mês de salário + encargos."',
    },
    {
      icon: <Repeat sx={{ fontSize: 28, color: "#f87171" }} />,
      title: "Repetição infinita",
      description: '"Respondo as mesmas perguntas 50 vezes por dia: preço, horário, endereço..."',
    },
  ];

  // Features data
  const features = [
    {
      icon: <Psychology />,
      title: "Secretária IA",
      description: "Uma assistente inteligente com memória de conversas. Gerencia agenda, despesas, tarefas e responde como uma secretária profissional.",
    },
    {
      icon: <CalendarMonth />,
      title: "Integração com Agenda do Google",
      description: "Agende compromissos pelo WhatsApp. A IA verifica horários disponíveis e cria eventos automaticamente no seu calendário.",
    },
    {
      icon: <AutoAwesome />,
      title: "Automações de Grupo",
      description: "Crie regras automáticas para grupos: colete dados de apostas, valores em dinheiro, e-mails. Perfeito para bolões e enquetes.",
    },
    {
      icon: <RecordVoiceOver />,
      title: "Transcrição de Áudio",
      description: "Mensagens de voz são transcritas automaticamente. A IA entende e responde como se fosse texto normal.",
    },
    {
      icon: <AccountBalanceWallet />,
      title: "Controle de Despesas",
      description: 'Registre gastos pelo WhatsApp: "Gastei 50 reais no mercado". A IA categoriza e controla suas finanças automaticamente.',
    },
    {
      icon: <Checklist />,
      title: "Gestão de Tarefas",
      description: "Crie e gerencie tarefas por voz ou texto. A IA organiza prioridades, define prazos e envia lembretes automáticos.",
    },
    {
      icon: <Forum />,
      title: "Chat ao Vivo",
      description: "Acompanhe todas as conversas em tempo real, incluindo grupos. Intervenha quando necessário e monitore o atendimento.",
    },
    {
      icon: <Campaign />,
      title: "Campanhas em Massa",
      description: "Envie mensagens personalizadas para milhares de contatos. Programe campanhas e acompanhe métricas de entrega.",
    },
    {
      icon: <Inventory2 />,
      title: "Gestão de Estoque",
      description: "Controle seu inventário integrado ao WhatsApp. A IA consulta disponibilidade e informa clientes automaticamente.",
    },
  ];

  // Use cases data
  const useCases = [
    { icon: "🎰", title: "Bolão da Mega-Sena", description: '"Crio uma automação temporária no grupo que coleta os números apostados por cada participante. No final, tenho um relatório completo!"', tag: "Automações de Grupo" },
    { icon: "🍽️", title: "Restaurante Delivery", description: '"A IA atende pedidos, verifica cardápio e disponibilidade no estoque. Reduzi 80% das ligações telefônicas."', tag: "Secretária IA + Estoque" },
    { icon: "💆", title: "Clínica de Estética", description: '"Pacientes agendam consultas pelo WhatsApp e já aparece direto na minha Agenda do Google. Nunca mais perdi um horário!"', tag: "Agenda do Google" },
    { icon: "💰", title: "Controle Financeiro", description: '"Envio áudio: \'Gastei 150 no mercado\'. A IA transcreve, categoriza e no final do mês tenho meu relatório de despesas."', tag: "Despesas + Transcrição" },
    { icon: "👥", title: "Rifa Beneficente", description: '"A automação coleta os números escolhidos e valores pagos. Posso ver quem confirmou e o total arrecadado em tempo real."', tag: "Automações de Grupo" },
    { icon: "🏋️", title: "Personal Trainer", description: '"Meus alunos agendam treinos e a IA organiza minha semana. Ainda envia lembretes automáticos um dia antes."', tag: "Agenda + Tarefas" },
  ];

  // Pricing plans
  const pricingPlans = [
    {
      name: "Starter",
      price: "R$ 97",
      period: "/mês",
      description: "Perfeito para começar a automatizar",
      features: ["1 conexão WhatsApp", "Secretária IA básica", "Transcrição de áudio", "Suporte por e-mail"],
      popular: false,
    },
    {
      name: "Professional",
      price: "R$ 197",
      period: "/mês",
      description: "Para negócios em crescimento",
      features: ["3 conexões WhatsApp", "Secretária IA avançada", "Integração Google Calendar", "Automações de grupo", "CRM completo", "Suporte prioritário"],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "R$ 497",
      period: "/mês",
      description: "Solução completa para grandes operações",
      features: ["10 conexões WhatsApp", "Todas as funcionalidades", "Campanhas em massa", "API personalizada", "Gerente de conta dedicado", "SLA garantido"],
      popular: false,
    },
  ];

  return (
    <Box sx={{ bgcolor: "#111b21", color: "#e9edef", minHeight: "100vh" }}>
      {/* Navbar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: "rgba(32, 44, 51, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #2a3942",
          boxShadow: "none",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 0 } }}>
            {/* Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #00a884 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0, 168, 132, 0.3)",
                }}
              >
                <AutoAwesome sx={{ color: "white", fontSize: 22 }} />
              </Box>
              <Typography variant="h6" fontWeight="bold">
                <span>Respond</span>
                <span style={{ color: "#00a884" }}>IA</span>
              </Typography>
            </Box>

            {/* Desktop Navigation */}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 4 }}>
              <Button
                color="inherit"
                onClick={() => scrollToSection("features")}
                sx={{ color: "#8696a0", "&:hover": { color: "#00a884" } }}
              >
                Funcionalidades
              </Button>
              <Button
                color="inherit"
                onClick={() => scrollToSection("pricing")}
                sx={{ color: "#8696a0", "&:hover": { color: "#00a884" } }}
              >
                Preços
              </Button>
              <Button
                color="inherit"
                sx={{ color: "#8696a0", "&:hover": { color: "#00a884" } }}
              >
                Documentação
              </Button>
            </Box>

            {/* Auth Buttons */}
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                onClick={onLoginClick}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  color: "#e9edef",
                  "&:hover": { bgcolor: "#2a3942" },
                }}
              >
                Entrar
              </Button>
              <Button
                onClick={onLoginClick}
                variant="contained"
                sx={{
                  bgcolor: "#00a884",
                  color: "#111b21",
                  fontWeight: "bold",
                  "&:hover": { bgcolor: "#008f6f" },
                  boxShadow: "0 0 15px rgba(0, 168, 132, 0.2)",
                }}
              >
                Começar Agora
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box component="section" sx={{ py: { xs: 8, lg: 12 }, position: "relative", overflow: "hidden" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            {/* Hero Content */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 600 }}>
                <Chip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00a884", animation: "pulse 2s infinite" }} />}
                  label="Secretária IA Integrada"
                  sx={{
                    bgcolor: "#202c33",
                    border: "1px solid #2a3942",
                    color: "#8696a0",
                    fontSize: "0.75rem",
                    width: "fit-content",
                    "& .MuiChip-label": { textTransform: "uppercase", letterSpacing: 1 },
                  }}
                />

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "2.5rem", sm: "3rem", lg: "3.75rem" },
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: "white",
                  }}
                >
                  Sua <span style={{ color: "#00a884" }}>Secretária IA</span> no WhatsApp
                </Typography>

                <Typography
                  variant="body1"
                  sx={{ fontSize: "1.125rem", color: "#8696a0", lineHeight: 1.7, maxWidth: 500 }}
                >
                  Automatize atendimento, gerencie agenda, controle despesas e organize tarefas. 
                  Uma secretária inteligente que aprende e memoriza conversas, integrada ao Calendário do Google e muito mais.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, pt: 1 }}>
                  <Button
                    onClick={onLoginClick}
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: "#00a884",
                      color: "#111b21",
                      fontWeight: "bold",
                      px: 4,
                      py: 1.5,
                      "&:hover": { bgcolor: "#008f6f", transform: "scale(1.02)" },
                      transition: "all 0.2s",
                      boxShadow: "0 4px 20px rgba(0, 168, 132, 0.25)",
                    }}
                  >
                    Testar Grátis
                  </Button>
                  <Button
                    onClick={() => scrollToSection("demo")}
                    variant="outlined"
                    size="large"
                    startIcon={<PlayCircle sx={{ color: "#00a884" }} />}
                    sx={{
                      borderColor: "#2a3942",
                      color: "#e9edef",
                      px: 4,
                      py: 1.5,
                      "&:hover": { bgcolor: "#2a3942", borderColor: "#2a3942" },
                    }}
                  >
                    Ver Demonstração
                  </Button>
                </Box>

                <Box sx={{ display: "flex", gap: 3, pt: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 16, color: "#00a884" }} />
                    <Typography variant="caption" color="#8696a0">Sem cartão de crédito</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <CheckCircle sx={{ fontSize: 16, color: "#00a884" }} />
                    <Typography variant="caption" color="#8696a0">7 dias grátis</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Hero Visual - Chat Demo */}
            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "flex-end" }}>
              <Box id="demo" sx={{ position: "relative" }}>
                {/* Glow effect */}
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 400,
                    height: 400,
                    bgcolor: "rgba(0, 168, 132, 0.05)",
                    borderRadius: "50%",
                    filter: "blur(100px)",
                  }}
                />

                {/* Chat Window */}
                <Paper
                  sx={{
                    width: 360,
                    height: 480,
                    bgcolor: "#202c33",
                    borderRadius: 3,
                    border: "1px solid #2a3942",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {/* Chat Header */}
                  <Box sx={{ bgcolor: "#202c33", px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #00a884 0%, #059669 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AutoAwesome sx={{ color: "white", fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} color="white">RespondIA</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00a884", animation: "pulse 2s infinite" }} />
                        <Typography variant="caption" sx={{ color: "#00a884" }}>Respondendo agora...</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Chat Messages */}
                  <Box sx={{ flex: 1, bgcolor: "#0b141a", p: 1.5, display: "flex", flexDirection: "column", gap: 1.5, overflow: "auto" }}>
                    {/* User message */}
                    <Box sx={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                      <Paper sx={{ bgcolor: "#005c4b", p: 1.5, borderRadius: 2, borderTopRightRadius: 0.5 }}>
                        <Typography variant="body2" color="white">Oi, queria agendar um horário pra amanhã às 15h</Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>10:42</Typography>
                          <DoneAll sx={{ fontSize: 14, color: "#53bdeb" }} />
                        </Box>
                      </Paper>
                    </Box>

                    {/* AI response 1 */}
                    <Box sx={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                      <Paper sx={{ bgcolor: "#202c33", p: 1.5, borderRadius: 2, borderTopLeftRadius: 0.5 }}>
                        <Typography variant="body2" color="white">Olá! 👋 Deixa eu verificar a agenda...</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", textAlign: "right", fontSize: 10, mt: 0.5 }}>10:42</Typography>
                      </Paper>
                    </Box>

                    {/* AI response 2 */}
                    <Box sx={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                      <Paper sx={{ bgcolor: "#202c33", p: 1.5, borderRadius: 2, borderTopLeftRadius: 0.5 }}>
                        <Typography variant="body2" color="white">✅ <strong>Horário disponível!</strong></Typography>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}>Agendei para você:</Typography>
                        <Box sx={{ mt: 1, p: 1, bgcolor: "rgba(0, 168, 132, 0.1)", borderRadius: 1, border: "1px solid rgba(0, 168, 132, 0.2)" }}>
                          <Typography variant="body2" sx={{ color: "#00a884", fontWeight: 500 }}>📅 Amanhã, 15:00</Typography>
                          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>Já adicionei na sua agenda</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}>Posso ajudar em mais alguma coisa?</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", display: "block", textAlign: "right", fontSize: 10, mt: 0.5 }}>10:43</Typography>
                      </Paper>
                    </Box>

                    {/* Typing indicator */}
                    <Box sx={{ alignSelf: "flex-start" }}>
                      <Paper sx={{ bgcolor: "#202c33", px: 2, py: 1.5, borderRadius: 2, borderTopLeftRadius: 0.5, display: "flex", gap: 0.5 }}>
                        {[0, 150, 300].map((delay) => (
                          <Box
                            key={delay}
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "rgba(255,255,255,0.4)",
                              animation: "bounce 1s infinite",
                              animationDelay: `${delay}ms`,
                            }}
                          />
                        ))}
                      </Paper>
                    </Box>
                  </Box>

                  {/* Chat Input */}
                  <Box sx={{ bgcolor: "#202c33", px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    <SentimentSatisfied sx={{ color: "rgba(255,255,255,0.4)" }} />
                    <AttachFile sx={{ color: "rgba(255,255,255,0.4)" }} />
                    <Box sx={{ flex: 1, bgcolor: "#2a3942", borderRadius: 4, px: 2, py: 1 }}>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)" }}>Mensagem</Typography>
                    </Box>
                    <Mic sx={{ color: "rgba(255,255,255,0.4)" }} />
                  </Box>
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pain Points Section */}
      <Box component="section" sx={{ py: 10, bgcolor: "#202c33", borderTop: "1px solid #2a3942", borderBottom: "1px solid #2a3942" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={1}>
            Você se identifica com alguma dessas situações?
          </Typography>
          <Grid container spacing={3} sx={{ mt: 4 }}>
            {painPoints.map((point, index) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
                <Paper sx={{ p: 3, bgcolor: "#111b21", borderRadius: 2, border: "1px solid rgba(248, 113, 113, 0.3)", height: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                    {point.icon}
                    <Typography variant="h6" fontWeight="bold" color="white">{point.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="#8696a0">{point.description}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: "center", mt: 6 }}>
            <Typography variant="h6" sx={{ color: "#00a884", fontWeight: "bold", mb: 1 }}>
              ✨ E se existisse uma solução para tudo isso?
            </Typography>
            <Typography color="#8696a0">
              Uma secretária que trabalha 24h, nunca esquece nada, e custa menos que uma pizza por dia.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Integrations */}
      <Box component="section" sx={{ py: 5, borderBottom: "1px solid #2a3942" }}>
        <Container maxWidth="lg">
          <Typography variant="body2" textAlign="center" color="#8696a0" mb={4} sx={{ textTransform: "uppercase", letterSpacing: 2 }}>
            Integrações Disponíveis
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {[
              { icon: <AutoAwesome sx={{ color: "#00a884" }} />, label: "IA Avançada" },
              { icon: <CalendarMonth sx={{ color: "#00a884" }} />, label: "Agenda Google" },
              { icon: <Forum sx={{ color: "#00a884" }} />, label: "WhatsApp" },
              { icon: <Psychology sx={{ color: "#8b5cf6" }} />, label: "Gastometria" },
              { icon: <RecordVoiceOver sx={{ color: "#00a884" }} />, label: "Transcrição" },
            ].map((item, idx) => (
              <Grid size={{ xs: 6, md: 2.4 }} key={idx}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {item.icon}
                  <Typography variant="body2" fontWeight={500} color="white">{item.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How It Works */}
      <Box component="section" sx={{ py: 12, bgcolor: "#202c33" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={1}>
            Como Funciona
          </Typography>
          <Typography textAlign="center" color="#8696a0" mb={8}>
            Configure sua Secretária IA em poucos minutos e veja a mágica acontecer.
          </Typography>
          <Grid container spacing={4}>
            {[
              { step: "1", title: "Conecte seu WhatsApp", desc: "Escaneie o QR Code e conecte sua conta em segundos. Sem complicação." },
              { step: "2", title: "Configure a IA", desc: "Defina o nome, tom de voz e informações do seu negócio ou vida pessoal." },
              { step: "3", title: "Integre Serviços", desc: "Conecte sua Agenda do Google, configure automações de grupo e integrações." },
              { step: "✓", title: "Pronto!", desc: "Sua secretária começa a trabalhar 24/7, respondendo e organizando tudo.", done: true },
            ].map((item, idx) => (
              <Grid size={{ xs: 12, md: 3 }} key={idx}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      bgcolor: item.done ? "#00a884" : "rgba(0, 168, 132, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    {item.done ? (
                      <Check sx={{ color: "#111b21", fontSize: 28 }} />
                    ) : (
                      <Typography variant="h5" fontWeight="bold" sx={{ color: "#00a884" }}>{item.step}</Typography>
                    )}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="white" mb={1}>{item.title}</Typography>
                  <Typography variant="body2" color="#8696a0">{item.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box component="section" id="features" sx={{ py: 12 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={1}>
            Recursos Completos para seu Negócio
          </Typography>
          <Typography textAlign="center" color="#8696a0" mb={8}>
            Uma plataforma completa com IA avançada, automações inteligentes e integrações poderosas.
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Paper
                  sx={{
                    p: 4,
                    bgcolor: "#202c33",
                    borderRadius: 2,
                    border: "1px solid #2a3942",
                    height: "100%",
                    transition: "all 0.3s",
                    "&:hover": { borderColor: "rgba(0, 168, 132, 0.5)" },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: "rgba(0, 168, 132, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 3,
                      color: "#00a884",
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" fontWeight="bold" color="white" mb={1.5}>{feature.title}</Typography>
                  <Typography variant="body2" color="#8696a0" lineHeight={1.7}>{feature.description}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Use Cases */}
      <Box component="section" sx={{ py: 12, bgcolor: "#202c33" }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={1}>
            Casos de Uso
          </Typography>
          <Typography textAlign="center" color="#8696a0" mb={8}>
            Veja como nossos usuários estão aproveitando a plataforma.
          </Typography>
          <Grid container spacing={3}>
            {useCases.map((useCase, idx) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
                <Paper sx={{ p: 3, bgcolor: "#111b21", borderRadius: 2, border: "1px solid #2a3942", height: "100%" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Typography fontSize={24}>{useCase.icon}</Typography>
                    <Typography variant="h6" fontWeight="bold" color="white">{useCase.title}</Typography>
                  </Box>
                  <Typography variant="body2" color="#8696a0" mb={2}>{useCase.description}</Typography>
                  <Typography variant="caption" sx={{ color: "#00a884" }}>{useCase.tag}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Gastometria Partnership Section */}
      <Box
          component="section"
          sx={{
            py: { xs: 8, md: 12 },
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, #0d0d1a 50%, rgba(168, 85, 247, 0.1) 100%)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Glow effects */}
          <Box sx={{ position: "absolute", top: 0, left: "25%", width: 256, height: 256, bgcolor: "rgba(139, 92, 246, 0.3)", borderRadius: "50%", filter: "blur(100px)" }} />
          <Box sx={{ position: "absolute", bottom: 0, right: "25%", width: 256, height: 256, bgcolor: "rgba(168, 85, 247, 0.3)", borderRadius: "50%", filter: "blur(100px)" }} />

          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
            <Grid container spacing={4} alignItems="center" justifyContent="space-between">
              {/* Content */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Chip
                  icon={<AccountBalanceWallet sx={{ fontSize: 16, color: "#a78bfa" }} />}
                  label="Parceria Exclusiva"
                  sx={{
                    bgcolor: "rgba(139, 92, 246, 0.2)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    color: "#c4b5fd",
                    mb: 3,
                    "& .MuiChip-label": { fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 1 },
                  }}
                />

                <Typography variant="h3" sx={{ fontWeight: "bold", color: "white", mb: 2, fontSize: { xs: "1.75rem", md: "2.5rem" } }}>
                  Sua vida financeira, <Box component="span" sx={{ color: "#a78bfa" }}>sob controle total.</Box>
                </Typography>

                <Typography sx={{ color: "#9ca3af", fontSize: { xs: "1rem", md: "1.125rem" }, mb: 4, maxWidth: 560 }}>
                  O <strong style={{ color: "#a78bfa" }}>Gastometria</strong> é o app de gestão financeira pessoal com IA que categoriza seus gastos automaticamente, cria metas e gera relatórios completos. Importe seus extratos bancários de forma simples e segura. <Box component="span" sx={{ color: "white", fontWeight: 500 }}>Agora integrado ao RespondIA, registre despesas pelo WhatsApp!</Box>
                </Typography>

                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
                  <Button
                    variant="contained"
                    href="https://gastometria.com.br"
                    target="_blank"
                    sx={{
                      bgcolor: "#8b5cf6",
                      color: "white",
                      fontWeight: "bold",
                      px: 4,
                      py: 1.5,
                      "&:hover": { bgcolor: "#7c3aed" },
                    }}
                  >
                    Começar Grátis
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={onLoginClick}
                    sx={{
                      borderColor: "rgba(139, 92, 246, 0.5)",
                      color: "#a78bfa",
                      px: 4,
                      py: 1.5,
                      "&:hover": { bgcolor: "rgba(139, 92, 246, 0.1)", borderColor: "#8b5cf6" },
                    }}
                  >
                    Ver Integração
                  </Button>
                </Box>
              </Grid>

              {/* Features List */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  sx={{
                    bgcolor: "rgba(17, 17, 26, 0.8)",
                    borderRadius: 3,
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    p: 4,
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" color="white" mb={3}>🔗 Como funciona a integração</Typography>
                  <List>
                    {[{ icon: <Check sx={{ color: "#10b981" }} />, text: "Registre gastos pelo WhatsApp" },
                      { icon: <Check sx={{ color: "#10b981" }} />, text: "Envie fotos de notas fiscais" },
                      { icon: <Check sx={{ color: "#10b981" }} />, text: "IA categoriza automaticamente" },
                      { icon: <Check sx={{ color: "#10b981" }} />, text: "Sincroniza com seu Gastometria" },
                      { icon: <Check sx={{ color: "#10b981" }} />, text: "Relatórios financeiros completos" }].map((item, idx) => (
                      <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.text} primaryTypographyProps={{ color: "#e9edef" }} />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ borderColor: "rgba(139, 92, 246, 0.2)", my: 2 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AccountBalanceWallet sx={{ color: "white" }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500} color="white">Gastometria</Typography>
                      <Typography variant="caption" color="#8696a0">Gestão Financeira com IA</Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>

            {/* Plans Table */}
            <Box sx={{ mt: 8 }}>
              <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={2}>Planos</Typography>
              <Table sx={{ color: "white", "& .MuiTableCell-root": { borderBottom: "1px solid rgba(255,255,255,0.1)" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell align="center"><Typography color="white" fontWeight="bold">Básico</Typography></TableCell>
                    <TableCell align="center"><Typography color="white" fontWeight="bold">Pro</Typography></TableCell>
                    <TableCell align="center"><Typography color="white" fontWeight="bold">Plus</Typography></TableCell>
                    <TableCell align="center"><Typography color="white" fontWeight="bold">Infinity</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Typography color="#8696a0">Carteiras</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Até 3</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Ilimitadas</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Ilimitadas</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Ilimitadas</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography color="#8696a0">Créditos IA/mês</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">0</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">100</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">300</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">500</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography color="#8696a0">Importação CSV/OFX</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography color="#8696a0">OCR notas fiscais</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✕</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">✓</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Typography color="#8696a0">Suporte</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Email</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">Prioritário</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">24/7</Typography></TableCell>
                    <TableCell align="center"><Typography color="white">24/7</Typography></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Container>
        </Box>

      {/* Pricing Section */}
      <Box component="section" id="pricing" sx={{ py: 12 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" color="white" mb={1}>
            Planos simples e transparentes
          </Typography>
          <Typography textAlign="center" color="#8696a0" mb={8}>
            Comece grátis por 7 dias. Cancele quando quiser.
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {pricingPlans.map((plan, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Paper
                  sx={{
                    p: 4,
                    bgcolor: "#202c33",
                    borderRadius: 3,
                    border: plan.popular ? "2px solid #00a884" : "1px solid #2a3942",
                    position: "relative",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {plan.popular && (
                    <Chip
                      icon={<Star sx={{ fontSize: 14 }} />}
                      label="Mais Popular"
                      sx={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        bgcolor: "#00a884",
                        color: "#111b21",
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                      }}
                    />
                  )}
                  <Typography variant="h6" fontWeight="bold" color="white" mb={1}>{plan.name}</Typography>
                  <Box sx={{ display: "flex", alignItems: "baseline", mb: 1 }}>
                    <Typography variant="h3" fontWeight="bold" color="white">{plan.price}</Typography>
                    <Typography color="#8696a0">{plan.period}</Typography>
                  </Box>
                  <Typography variant="body2" color="#8696a0" mb={3}>{plan.description}</Typography>
                  <Divider sx={{ borderColor: "#2a3942", mb: 3 }} />
                  <List sx={{ flex: 1 }}>
                    {plan.features.map((feature, fIdx) => (
                      <ListItem key={fIdx} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircle sx={{ color: "#00a884", fontSize: 20 }} />
                        </ListItemIcon>
                        <ListItemText primary={feature} primaryTypographyProps={{ variant: "body2", color: "#e9edef" }} />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    variant={plan.popular ? "contained" : "outlined"}
                    onClick={onLoginClick}
                    sx={{
                      mt: 3,
                      py: 1.5,
                      fontWeight: "bold",
                      ...(plan.popular
                        ? { bgcolor: "#00a884", color: "#111b21", "&:hover": { bgcolor: "#008f6f" } }
                        : { borderColor: "#2a3942", color: "#e9edef", "&:hover": { bgcolor: "#2a3942" } }),
                    }}
                  >
                    Começar Agora
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box component="section" sx={{ py: 12, bgcolor: "#202c33", borderTop: "1px solid #2a3942" }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" fontWeight="bold" color="white" mb={2}>
              Pronto para transformar seu atendimento?
            </Typography>
            <Typography color="#8696a0" mb={4}>
              Junte-se a milhares de negócios que já automatizaram seu WhatsApp com inteligência artificial.
            </Typography>
            <Button
              onClick={onLoginClick}
              variant="contained"
              size="large"
              sx={{
                bgcolor: "#00a884",
                color: "#111b21",
                fontWeight: "bold",
                px: 6,
                py: 1.5,
                fontSize: "1rem",
                "&:hover": { bgcolor: "#008f6f" },
                boxShadow: "0 4px 20px rgba(0, 168, 132, 0.25)",
              }}
            >
              Testar Grátis por 7 Dias
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 4, borderTop: "1px solid #2a3942" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  background: "linear-gradient(135deg, #00a884 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoAwesome sx={{ color: "white", fontSize: 18 }} />
              </Box>
              <Typography variant="body2" fontWeight="bold">
                <span>Respond</span>
                <span style={{ color: "#00a884" }}>IA</span>
              </Typography>
            </Box>
            <Typography variant="caption" color="#8696a0">
              © 2026 RespondIA. Todos os direitos reservados.
            </Typography>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Typography variant="caption" sx={{ color: "#8696a0", cursor: "pointer", "&:hover": { color: "#00a884" } }}>
                Termos de Uso
              </Typography>
              <Typography variant="caption" sx={{ color: "#8696a0", cursor: "pointer", "&:hover": { color: "#00a884" } }}>
                Política de Privacidade
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </Box>
  );
};

export default LandingPage;
