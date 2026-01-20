"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { Feature } from "./data";

interface FeaturesSectionProps {
  features: Feature[];
}

const FeaturesSection = ({ features }: FeaturesSectionProps) => {
  return (
    <Box component="section" id="features" sx={{ py: 12 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          color="white"
          mb={1}
        >
          Recursos Completos para seu Negócio
        </Typography>
        <Typography textAlign="center" color="#8696a0" mb={8}>
          Uma plataforma completa com IA avançada, automações inteligentes e
          integrações poderosas.
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
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="white"
                  mb={1.5}
                >
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="#8696a0" lineHeight={1.7}>
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default FeaturesSection;
