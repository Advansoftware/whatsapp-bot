"use client";

import { Box, Container, Typography, Button } from "@mui/material";

interface CTASectionProps {
  onLoginClick: () => void;
}

const CTASection = ({ onLoginClick }: CTASectionProps) => {
  return (
    <Box
      component="section"
      sx={{ py: 12, bgcolor: "#202c33", borderTop: "1px solid #2a3942" }}
    >
      <Container maxWidth="md">
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h4" fontWeight="bold" color="white" mb={2}>
            Pronto para transformar seu atendimento?
          </Typography>
          <Typography color="#8696a0" mb={4}>
            Junte-se a milhares de negócios que já automatizaram seu WhatsApp
            com inteligência artificial.
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
  );
};

export default CTASection;
