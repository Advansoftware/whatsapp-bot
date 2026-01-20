"use client";

import { Box, Container, Grid, Typography } from "@mui/material";
import {
  AutoAwesome,
  CalendarMonth,
  Forum,
  Psychology,
  RecordVoiceOver,
} from "@mui/icons-material";

const IntegrationsSection = () => {
  const integrations = [
    { icon: <AutoAwesome sx={{ color: "#00a884" }} />, label: "IA Avançada" },
    {
      icon: <CalendarMonth sx={{ color: "#00a884" }} />,
      label: "Agenda Google",
    },
    { icon: <Forum sx={{ color: "#00a884" }} />, label: "WhatsApp" },
    { icon: <Psychology sx={{ color: "#8b5cf6" }} />, label: "Gastometria" },
    {
      icon: <RecordVoiceOver sx={{ color: "#00a884" }} />,
      label: "Transcrição",
    },
  ];

  return (
    <Box component="section" sx={{ py: 5, borderBottom: "1px solid #2a3942" }}>
      <Container maxWidth="lg">
        <Typography
          variant="body2"
          textAlign="center"
          color="#8696a0"
          mb={4}
          sx={{ textTransform: "uppercase", letterSpacing: 2 }}
        >
          Integrações Disponíveis
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {integrations.map((item, idx) => (
            <Grid size={{ xs: 6, md: 2.4 }} key={idx}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                {item.icon}
                <Typography variant="body2" fontWeight={500} color="white">
                  {item.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default IntegrationsSection;
