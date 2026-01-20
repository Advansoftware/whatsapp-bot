"use client";

import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Paper,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { AccountBalanceWallet, Check } from "@mui/icons-material";
import { gastometriaFeatures, gastometriaPlanFeatures } from "./data";

interface GastometriaSectionProps {
  onLoginClick: () => void;
}

const GastometriaSection = ({ onLoginClick }: GastometriaSectionProps) => {
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        background:
          "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, #0d0d1a 50%, rgba(168, 85, 247, 0.1) 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow effects */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: "25%",
          width: 256,
          height: 256,
          bgcolor: "rgba(139, 92, 246, 0.3)",
          borderRadius: "50%",
          filter: "blur(100px)",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          right: "25%",
          width: 256,
          height: 256,
          bgcolor: "rgba(168, 85, 247, 0.3)",
          borderRadius: "50%",
          filter: "blur(100px)",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Grid
          container
          spacing={4}
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Content */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Chip
              icon={
                <AccountBalanceWallet sx={{ fontSize: 16, color: "#a78bfa" }} />
              }
              label="Parceria Exclusiva"
              sx={{
                bgcolor: "rgba(139, 92, 246, 0.2)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#c4b5fd",
                mb: 3,
                "& .MuiChip-label": {
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                },
              }}
            />

            <Typography
              variant="h3"
              sx={{
                fontWeight: "bold",
                color: "white",
                mb: 2,
                fontSize: { xs: "1.75rem", md: "2.5rem" },
              }}
            >
              Sua vida financeira,{" "}
              <Box component="span" sx={{ color: "#a78bfa" }}>
                sob controle total.
              </Box>
            </Typography>

            <Typography
              sx={{
                color: "#9ca3af",
                fontSize: { xs: "1rem", md: "1.125rem" },
                mb: 4,
                maxWidth: 560,
              }}
            >
              O <strong style={{ color: "#a78bfa" }}>Gastometria</strong> é o
              app de gestão financeira pessoal com IA que categoriza seus gastos
              automaticamente, cria metas e gera relatórios completos. Importe
              seus extratos bancários de forma simples e segura.{" "}
              <Box component="span" sx={{ color: "white", fontWeight: 500 }}>
                Agora integrado ao RespondIA, registre despesas pelo WhatsApp!
              </Box>
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
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
                  "&:hover": {
                    bgcolor: "rgba(139, 92, 246, 0.1)",
                    borderColor: "#8b5cf6",
                  },
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
              <Typography variant="h6" fontWeight="bold" color="white" mb={3}>
                🔗 Como funciona a integração
              </Typography>
              <List>
                {gastometriaFeatures.map((item, idx) => (
                  <ListItem key={idx} sx={{ px: 0, py: 1 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Check sx={{ color: "#10b981" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{ color: "#e9edef" }}
                    />
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
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AccountBalanceWallet sx={{ color: "white" }} />
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={500} color="white">
                    Gastometria
                  </Typography>
                  <Typography variant="caption" color="#8696a0">
                    Gestão Financeira com IA
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Plans Table */}
        <Box sx={{ mt: 8 }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            textAlign="center"
            color="white"
            mb={2}
          >
            Planos
          </Typography>
          <Table
            sx={{
              color: "white",
              "& .MuiTableCell-root": {
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                {gastometriaPlanFeatures.headers.map((header) => (
                  <TableCell align="center" key={header}>
                    <Typography color="white" fontWeight="bold">
                      {header}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {gastometriaPlanFeatures.rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <Typography color="#8696a0">{row.label}</Typography>
                  </TableCell>
                  {row.values.map((value, idx) => (
                    <TableCell align="center" key={idx}>
                      <Typography color="white">{value}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Container>
    </Box>
  );
};

export default GastometriaSection;
