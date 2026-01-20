"use client";

import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  Slider,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import { AIFormData } from "./types";

interface ConfigTabProps {
  formData: AIFormData;
  setFormData: (data: AIFormData) => void;
  saving: boolean;
  onSave: () => void;
}

/**
 * Tab de configuração da Secretária IA
 */
export default function ConfigTab({
  formData,
  setFormData,
  saving,
  onSave,
}: ConfigTabProps) {
  return (
    <Grid container spacing={3}>
      {/* Configurações Gerais */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SettingsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Configurações Gerais
            </Typography>
            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, enabled: e.target.checked })
                  }
                  color="primary"
                />
              }
              label="Ativar Secretária IA"
            />

            {/* Modo Secretária Pessoal */}
            <Box
              sx={{
                mt: 2,
                ml: 2,
                p: 1.5,
                bgcolor: (theme) =>
                  formData.testMode
                    ? theme.palette.mode === "dark"
                      ? "rgba(156, 39, 176, 0.15)"
                      : "rgba(156, 39, 176, 0.08)"
                    : theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.03)",
                border: (theme) =>
                  formData.testMode
                    ? "1px solid rgba(156, 39, 176, 0.4)"
                    : theme.palette.mode === "dark"
                      ? "1px solid rgba(255, 255, 255, 0.1)"
                      : "1px solid rgba(0, 0, 0, 0.1)",
                borderRadius: 1,
                opacity: formData.enabled ? 1 : 0.5,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.testMode}
                    onChange={(e) =>
                      setFormData({ ...formData, testMode: e.target.checked })
                    }
                    color="secondary"
                    disabled={!formData.enabled}
                  />
                }
                label={
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      sx={{
                        color: formData.testMode
                          ? "secondary.main"
                          : "text.primary",
                      }}
                    >
                      👤 Secretária Pessoal
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      Quando você enviar mensagem, ela será sua assistente
                      pessoal
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Modo de Operação */}
            <Box sx={{ mt: 3 }}>
              <Typography gutterBottom fontWeight="bold">
                Modo de Operação
              </Typography>
              <ToggleButtonGroup
                value={formData.mode}
                exclusive
                onChange={(_, v) => v && setFormData({ ...formData, mode: v })}
                fullWidth
                size="small"
              >
                <ToggleButton value="passive">Passivo</ToggleButton>
                <ToggleButton value="active">Ativo</ToggleButton>
                <ToggleButton value="supervised">Supervisionado</ToggleButton>
              </ToggleButtonGroup>
              <Paper sx={{ mt: 1, p: 2, bgcolor: "background.default" }}>
                {formData.mode === "passive" && (
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="info.main"
                    >
                      👁️ Modo Passivo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      A IA apenas <strong>observa e analisa</strong> as
                      mensagens.
                    </Typography>
                  </Box>
                )}
                {formData.mode === "active" && (
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="success.main"
                    >
                      🤖 Modo Ativo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      A IA <strong>responde automaticamente</strong> todas as
                      mensagens.
                    </Typography>
                  </Box>
                )}
                {formData.mode === "supervised" && (
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="warning.main"
                    >
                      👀 Modo Supervisionado
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      A IA <strong>prepara respostas</strong> mas aguarda
                      aprovação.
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>

            {/* Personalidade */}
            <Box sx={{ mt: 3 }}>
              <Typography gutterBottom fontWeight="bold">
                Personalidade
              </Typography>
              <ToggleButtonGroup
                value={formData.personality}
                exclusive
                onChange={(_, v) =>
                  v && setFormData({ ...formData, personality: v })
                }
                fullWidth
                size="small"
              >
                <ToggleButton value="professional">Profissional</ToggleButton>
                <ToggleButton value="friendly">Amigável</ToggleButton>
                <ToggleButton value="casual">Casual</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Temperatura */}
            <Box sx={{ mt: 3 }}>
              <Typography gutterBottom fontWeight="bold">
                Temperatura (Criatividade): {formData.temperature}
              </Typography>
              <Slider
                value={formData.temperature}
                onChange={(_, v) =>
                  setFormData({ ...formData, temperature: v as number })
                }
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: "Preciso" },
                  { value: 0.5, label: "Balanceado" },
                  { value: 1, label: "Criativo" },
                ]}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Dados do Proprietário */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <PersonIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Dados do Proprietário
            </Typography>
            <Divider sx={{ my: 2 }} />

            <TextField
              fullWidth
              label="Nome do Proprietário"
              value={formData.ownerName}
              onChange={(e) =>
                setFormData({ ...formData, ownerName: e.target.value })
              }
              placeholder="Ex: João Silva"
              sx={{ mb: 2 }}
              helperText="A IA usará esse nome quando precisar mencionar você"
            />

            <TextField
              fullWidth
              label="WhatsApp do Proprietário"
              value={formData.ownerPhone}
              onChange={(e) =>
                setFormData({ ...formData, ownerPhone: e.target.value })
              }
              placeholder="Ex: 5511999999999"
              helperText="Número para receber notificações importantes"
            />
          </CardContent>
        </Card>

        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Escalação
            </Typography>
            <Divider sx={{ my: 2 }} />

            <TextField
              fullWidth
              label="Palavras de Escalação"
              value={formData.escalationWords}
              onChange={(e) =>
                setFormData({ ...formData, escalationWords: e.target.value })
              }
              placeholder="reclamação, problema, gerente"
              helperText="Separe por vírgula"
              multiline
              rows={2}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Prompt do Sistema */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Prompt do Sistema
            </Typography>
            <Divider sx={{ my: 2 }} />
            <TextField
              fullWidth
              multiline
              rows={6}
              value={formData.systemPrompt}
              onChange={(e) =>
                setFormData({ ...formData, systemPrompt: e.target.value })
              }
              placeholder="Instruções personalizadas para a IA..."
              helperText="Personalize como a secretária deve se comportar"
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Botão Salvar */}
      <Grid size={{ xs: 12 }}>
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            onClick={onSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
