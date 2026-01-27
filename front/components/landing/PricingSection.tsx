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
} from "@mui/material";
import { CheckCircle, Star } from "@mui/icons-material";
import { PricingPlan } from "./data";

interface PricingSectionProps {
  plans: PricingPlan[];
  onLoginClick: () => void;
}

const PricingSection = ({ plans, onLoginClick }: PricingSectionProps) => {
  return (
    <Box component="section" id="pricing" sx={{ py: 12 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          color="white"
          mb={1}
        >
          Planos simples e transparentes
        </Typography>
        <Typography textAlign="center" color="#8696a0" mb={8}>
          Comece grátis por 7 dias. Cancele quando quiser.
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Paper
                sx={{
                  p: 4,
                  bgcolor: "#0f131a",
                  borderRadius: 3,
                  border: plan.popular
                    ? "2px solid #00fe9b"
                    : "1px solid #2a3942",
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
                      bgcolor: "#00fe9b",
                      color: "#090b11",
                      fontWeight: "bold",
                      fontSize: "0.75rem",
                    }}
                  />
                )}
                <Typography variant="h6" fontWeight="bold" color="white" mb={1}>
                  {plan.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", mb: 1 }}>
                  <Typography variant="h3" fontWeight="bold" color="white">
                    {plan.price}
                  </Typography>
                  <Typography color="#8696a0">{plan.period}</Typography>
                </Box>
                <Typography variant="body2" color="#8696a0" mb={3}>
                  {plan.description}
                </Typography>
                <Divider sx={{ borderColor: "#2a3942", mb: 3 }} />
                <List sx={{ flex: 1 }}>
                  {plan.features.map((feature, fIdx) => (
                    <ListItem key={fIdx} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckCircle sx={{ color: "#00fe9b", fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{
                          variant: "body2",
                          color: "#e9edef",
                        }}
                      />
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
                      ? {
                          bgcolor: "#00fe9b",
                          color: "#090b11",
                          "&:hover": { bgcolor: "#008f6f" },
                        }
                      : {
                          borderColor: "#2a3942",
                          color: "#e9edef",
                          "&:hover": { bgcolor: "#2a3942" },
                        }),
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
  );
};

export default PricingSection;
