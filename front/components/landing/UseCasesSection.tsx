"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { UseCase } from "./data";

interface UseCasesSectionProps {
  useCases: UseCase[];
}

const UseCasesSection = ({ useCases }: UseCasesSectionProps) => {
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
          Casos de Uso
        </Typography>
        <Typography textAlign="center" color="#8696a0" mb={8}>
          Veja como nossos usuários estão aproveitando a plataforma.
        </Typography>
        <Grid container spacing={3}>
          {useCases.map((useCase, idx) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
              <Paper
                sx={{
                  p: 3,
                  bgcolor: "#111b21",
                  borderRadius: 2,
                  border: "1px solid #2a3942",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <Typography fontSize={24}>{useCase.icon}</Typography>
                  <Typography variant="h6" fontWeight="bold" color="white">
                    {useCase.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="#8696a0" mb={2}>
                  {useCase.description}
                </Typography>
                <Typography variant="caption" sx={{ color: "#00a884" }}>
                  {useCase.tag}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default UseCasesSection;
