"use client";

import { Box, Container, Typography } from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";

const Footer = () => {
  return (
    <Box component="footer" sx={{ py: 4, borderTop: "1px solid #2a3942" }}>
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #00fe9b 0%, #00cc7a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AutoAwesome sx={{ color: "white", fontSize: 18 }} />
            </Box>
            <Typography variant="body2" fontWeight="bold">
              <span>Respond</span>
              <span style={{ color: "#00fe9b" }}>IA</span>
            </Typography>
          </Box>
          <Typography variant="caption" color="#8696a0">
            © 2026 RespondIA. Todos os direitos reservados.
          </Typography>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Typography
              variant="caption"
              sx={{
                color: "#8696a0",
                cursor: "pointer",
                "&:hover": { color: "#00fe9b" },
              }}
            >
              Termos de Uso
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#8696a0",
                cursor: "pointer",
                "&:hover": { color: "#00fe9b" },
              }}
            >
              Política de Privacidade
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
