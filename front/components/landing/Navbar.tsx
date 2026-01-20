"use client";

import {
  Box,
  AppBar,
  Container,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import { AutoAwesome } from "@mui/icons-material";

interface NavbarProps {
  onLoginClick: () => void;
  scrollToSection: (id: string) => void;
}

const Navbar = ({ onLoginClick, scrollToSection }: NavbarProps) => {
  return (
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
  );
};

export default Navbar;
