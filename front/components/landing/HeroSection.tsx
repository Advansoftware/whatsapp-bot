"use client";

import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Chip,
  Paper,
} from "@mui/material";
import {
  AutoAwesome,
  CheckCircle,
  PlayCircle,
  DoneAll,
  SentimentSatisfied,
  AttachFile,
  Mic,
} from "@mui/icons-material";

interface HeroSectionProps {
  onLoginClick: () => void;
  scrollToSection: (id: string) => void;
}

const HeroSection = ({ onLoginClick, scrollToSection }: HeroSectionProps) => {
  return (
    <Box
      component="section"
      sx={{ py: { xs: 8, lg: 12 }, position: "relative", overflow: "hidden" }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          {/* Hero Content */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                maxWidth: 600,
              }}
            >
              <Chip
                icon={
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#00a884",
                      animation: "pulse 2s infinite",
                    }}
                  />
                }
                label="Secretária IA Integrada"
                sx={{
                  bgcolor: "#202c33",
                  border: "1px solid #2a3942",
                  color: "#8696a0",
                  fontSize: "0.75rem",
                  width: "fit-content",
                  "& .MuiChip-label": {
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  },
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
                Sua <span style={{ color: "#00a884" }}>Secretária IA</span> no
                WhatsApp
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  fontSize: "1.125rem",
                  color: "#8696a0",
                  lineHeight: 1.7,
                  maxWidth: 500,
                }}
              >
                Automatize atendimento, gerencie agenda, controle despesas e
                organize tarefas. Uma secretária inteligente que aprende e
                memoriza conversas, integrada ao Calendário do Google e muito
                mais.
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                  pt: 1,
                }}
              >
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
                  <Typography variant="caption" color="#8696a0">
                    Sem cartão de crédito
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CheckCircle sx={{ fontSize: 16, color: "#00a884" }} />
                  <Typography variant="caption" color="#8696a0">
                    7 dias grátis
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>

          {/* Hero Visual - Chat Demo */}
          <Grid
            size={{ xs: 12, lg: 6 }}
            sx={{
              display: { xs: "none", lg: "flex" },
              justifyContent: "flex-end",
            }}
          >
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
                <Box
                  sx={{
                    bgcolor: "#202c33",
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #00a884 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AutoAwesome sx={{ color: "white", fontSize: 22 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="white"
                    >
                      RespondIA
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#00a884",
                          animation: "pulse 2s infinite",
                        }}
                      />
                      <Typography variant="caption" sx={{ color: "#00a884" }}>
                        Respondendo agora...
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Chat Messages */}
                <Box
                  sx={{
                    flex: 1,
                    bgcolor: "#0b141a",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                    overflow: "auto",
                  }}
                >
                  {/* User message */}
                  <Box sx={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                    <Paper
                      sx={{
                        bgcolor: "#005c4b",
                        p: 1.5,
                        borderRadius: 2,
                        borderTopRightRadius: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="white">
                        Oi, queria agendar um horário pra amanhã às 15h
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}
                        >
                          10:42
                        </Typography>
                        <DoneAll sx={{ fontSize: 14, color: "#53bdeb" }} />
                      </Box>
                    </Paper>
                  </Box>

                  {/* AI response 1 */}
                  <Box sx={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                    <Paper
                      sx={{
                        bgcolor: "#202c33",
                        p: 1.5,
                        borderRadius: 2,
                        borderTopLeftRadius: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="white">
                        Olá! 👋 Deixa eu verificar a agenda...
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.4)",
                          display: "block",
                          textAlign: "right",
                          fontSize: 10,
                          mt: 0.5,
                        }}
                      >
                        10:42
                      </Typography>
                    </Paper>
                  </Box>

                  {/* AI response 2 */}
                  <Box sx={{ alignSelf: "flex-start", maxWidth: "80%" }}>
                    <Paper
                      sx={{
                        bgcolor: "#202c33",
                        p: 1.5,
                        borderRadius: 2,
                        borderTopLeftRadius: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="white">
                        ✅ <strong>Horário disponível!</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}
                      >
                        Agendei para você:
                      </Typography>
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          bgcolor: "rgba(0, 168, 132, 0.1)",
                          borderRadius: 1,
                          border: "1px solid rgba(0, 168, 132, 0.2)",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ color: "#00a884", fontWeight: 500 }}
                        >
                          📅 Amanhã, 15:00
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "rgba(255,255,255,0.6)" }}
                        >
                          Já adicionei na sua agenda
                        </Typography>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}
                      >
                        Posso ajudar em mais alguma coisa?
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255,255,255,0.4)",
                          display: "block",
                          textAlign: "right",
                          fontSize: 10,
                          mt: 0.5,
                        }}
                      >
                        10:43
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Typing indicator */}
                  <Box sx={{ alignSelf: "flex-start" }}>
                    <Paper
                      sx={{
                        bgcolor: "#202c33",
                        px: 2,
                        py: 1.5,
                        borderRadius: 2,
                        borderTopLeftRadius: 0.5,
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
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
                <Box
                  sx={{
                    bgcolor: "#202c33",
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <SentimentSatisfied sx={{ color: "rgba(255,255,255,0.4)" }} />
                  <AttachFile sx={{ color: "rgba(255,255,255,0.4)" }} />
                  <Box
                    sx={{
                      flex: 1,
                      bgcolor: "#2a3942",
                      borderRadius: 4,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Mensagem
                    </Typography>
                  </Box>
                  <Mic sx={{ color: "rgba(255,255,255,0.4)" }} />
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HeroSection;
