"use client";

import { Box, Container, Grid, Typography, Paper } from "@mui/material";
import { PainPoint } from "./data";

interface PainPointsSectionProps {
  painPoints: PainPoint[];
}

const PainPointsSection = ({ painPoints }: PainPointsSectionProps) => {
  return (
    <Box
      component="section"
      sx={{
        py: 10,
        bgcolor: "#0f131a",
        borderTop: "1px solid #2a3942",
        borderBottom: "1px solid #2a3942",
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          color="white"
          mb={1}
        >
          Você se identifica com alguma dessas situações?
        </Typography>
        <Grid container spacing={3} sx={{ mt: 4 }}>
          {painPoints.map((point, index) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
              <Paper
                sx={{
                  p: 3,
                  bgcolor: "#090b11",
                  borderRadius: 2,
                  border: "1px solid rgba(248, 113, 113, 0.3)",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  {point.icon}
                  <Typography variant="h6" fontWeight="bold" color="white">
                    {point.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="#8696a0">
                  {point.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <Typography
            variant="h6"
            sx={{ color: "#00fe9b", fontWeight: "bold", mb: 1 }}
          >
            ✨ E se existisse uma solução para tudo isso?
          </Typography>
          <Typography color="#8696a0">
            Uma secretária que trabalha 24h, nunca esquece nada, e custa menos
            que uma pizza por dia.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PainPointsSection;
