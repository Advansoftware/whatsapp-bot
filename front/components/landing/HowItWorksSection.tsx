"use client";

import { Box, Container, Grid, Typography } from "@mui/material";
import { Check } from "@mui/icons-material";
import { HowItWorksStep } from "./data";

interface HowItWorksSectionProps {
  steps: HowItWorksStep[];
}

const HowItWorksSection = ({ steps }: HowItWorksSectionProps) => {
  return (
    <Box component="section" sx={{ py: 12, bgcolor: "#202c33" }}>
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          color="white"
          mb={1}
        >
          Como Funciona
        </Typography>
        <Typography textAlign="center" color="#8696a0" mb={8}>
          Configure sua Secretária IA em poucos minutos e veja a mágica
          acontecer.
        </Typography>
        <Grid container spacing={4}>
          {steps.map((item, idx) => (
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
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      sx={{ color: "#00a884" }}
                    >
                      {item.step}
                    </Typography>
                  )}
                </Box>
                <Typography variant="h6" fontWeight="bold" color="white" mb={1}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="#8696a0">
                  {item.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default HowItWorksSection;
