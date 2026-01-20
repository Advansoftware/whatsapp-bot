"use client";

import React from "react";
import { Grid, Card, CardActionArea, Typography, Box } from "@mui/material";
import { PREDEFINED_TEMPLATES, AutomationTemplate } from "./types";

interface TemplateGridProps {
  onSelectTemplate: (template: AutomationTemplate) => void;
}

/**
 * Grid de templates pré-definidos para automações
 */
export default function TemplateGrid({ onSelectTemplate }: TemplateGridProps) {
  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Modelos de Automação
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {PREDEFINED_TEMPLATES.map((template, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                transition: "all 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: 2,
                },
              }}
            >
              <CardActionArea
                onClick={() => onSelectTemplate(template)}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  p: 2,
                  textAlign: "left",
                }}
              >
                <Box color="primary.main" mb={1}>
                  {template.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {template.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {template.description}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
