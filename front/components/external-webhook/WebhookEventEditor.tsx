"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Autocomplete,
  Paper,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import { ContentCopy, Code, Add } from "@mui/icons-material";
import { WebhookEvent, CreateWebhookEventDto } from "./types";

interface WebhookEventEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateWebhookEventDto) => void;
  event?: WebhookEvent | null;
  samplePayload?: any;
  loading?: boolean;
}

// Extrai todos os campos de um objeto recursivamente
function extractFields(obj: any, prefix = ""): string[] {
  const fields: string[] = [];
  if (!obj || typeof obj !== "object") return fields;

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    fields.push(fieldPath);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      fields.push(...extractFields(value, fieldPath));
    }
  }

  return fields;
}

const WebhookEventEditor: React.FC<WebhookEventEditorProps> = ({
  open,
  onClose,
  onSave,
  event,
  samplePayload,
  loading,
}) => {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventField, setEventField] = useState("");
  const [eventValue, setEventValue] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");

  const isEditing = !!event;

  // Extrair campos disponíveis do payload de exemplo
  const availableFields = useMemo(() => {
    if (!samplePayload) return [];
    return extractFields(samplePayload);
  }, [samplePayload]);

  // Extrair valores únicos para o campo selecionado
  const fieldValue = useMemo(() => {
    if (!samplePayload || !eventField) return null;
    const parts = eventField.split(".");
    let value = samplePayload;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }, [samplePayload, eventField]);

  useEffect(() => {
    if (event) {
      setName(event.name);
      setDescription(event.description || "");
      setEventField(event.eventField);
      setEventValue(event.eventValue);
      setMessageTemplate(event.messageTemplate);
    } else {
      setName("");
      setDescription("");
      setEventField("");
      setEventValue("");
      setMessageTemplate("");
    }
  }, [event, open]);

  // Quando selecionar um campo, auto-preencher o valor
  useEffect(() => {
    if (fieldValue !== null && fieldValue !== undefined && !isEditing) {
      setEventValue(String(fieldValue));
    }
  }, [fieldValue, isEditing]);

  const insertField = (field: string) => {
    const placeholder = `{{${field}}}`;
    setMessageTemplate((prev) => prev + placeholder);
  };

  const handleSave = () => {
    onSave({
      name,
      description,
      eventField,
      eventValue,
      messageTemplate,
    });
  };

  // Preview da mensagem
  const previewMessage = useMemo(() => {
    if (!samplePayload || !messageTemplate) return messageTemplate;

    return messageTemplate.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split(".");
      let value = samplePayload;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value === undefined || value === null) return match;
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  }, [samplePayload, messageTemplate]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? "Editar Evento" : "Novo Evento"}
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} mt={1}>
          {/* Nome e Descrição */}
          <Box display="flex" gap={2}>
            <TextField
              label="Nome do Evento"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              placeholder="Ex: Deploy Falhou"
            />
            <TextField
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              placeholder="Quando o deploy falhar no Coolify"
            />
          </Box>

          {/* Identificação do Evento */}
          <Paper
            sx={{
              p: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} mb={2}>
              🎯 Identificação do Evento
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Defina qual campo do payload identifica este evento e qual valor ele deve ter
            </Typography>

            <Box display="flex" gap={2}>
              <Autocomplete
                value={eventField}
                onChange={(_, value) => setEventField(value || "")}
                options={availableFields}
                freeSolo
                fullWidth
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Campo do Evento"
                    placeholder="Ex: event, type, action"
                    helperText="Campo do JSON que identifica o tipo de evento"
                  />
                )}
              />
              <TextField
                label="Valor Esperado"
                value={eventValue}
                onChange={(e) => setEventValue(e.target.value)}
                fullWidth
                placeholder="Ex: deployment_failed"
                helperText="Valor que o campo deve ter para acionar este evento"
              />
            </Box>
          </Paper>

          {/* Campos Disponíveis */}
          {availableFields.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                📋 Campos Disponíveis (clique para inserir)
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap" maxHeight={120} overflow="auto">
                {availableFields.map((field) => (
                  <Chip
                    key={field}
                    label={`{{${field}}}`}
                    size="small"
                    variant="outlined"
                    onClick={() => insertField(field)}
                    sx={{ cursor: "pointer", fontFamily: "monospace", fontSize: "0.75rem" }}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Template da Mensagem */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              ✉️ Template da Mensagem
            </Typography>
            <TextField
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              multiline
              rows={6}
              fullWidth
              placeholder={`🚨 *Deploy Falhou!*

📦 Projeto: {{project}}
🌐 Ambiente: {{environment}}
❌ Mensagem: {{message}}

🔗 {{deployment_url}}`}
              helperText="Use {{campo}} para inserir valores dinâmicos do payload. Suporta campos aninhados como {{data.user.name}}"
            />
          </Box>

          {/* Preview */}
          {samplePayload && messageTemplate && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                👁️ Preview (baseado no último payload recebido)
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  whiteSpace: "pre-wrap",
                  fontFamily: "system-ui",
                  fontSize: "0.9rem",
                }}
              >
                {previewMessage}
              </Paper>
            </Box>
          )}

          {/* Payload de Exemplo */}
          {samplePayload && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                📄 Payload de Exemplo
              </Typography>
              <Paper
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.background.default, 0.5),
                  overflow: "auto",
                  maxHeight: 200,
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(samplePayload, null, 2)}
              </Paper>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || !eventField || !eventValue || !messageTemplate || loading}
        >
          {loading ? "Salvando..." : "Salvar Evento"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookEventEditor;
