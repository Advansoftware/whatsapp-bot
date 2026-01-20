"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
} from "@mui/material";
import { Group } from "@mui/icons-material";
import {
  AutomationFormData,
  AvailableGroup,
  GroupAutomation,
  ACTION_TYPES,
  DATA_TYPES,
} from "./types";

interface AutomationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: AutomationFormData;
  setFormData: (data: AutomationFormData) => void;
  editingAutomation: GroupAutomation | null;
  groups: AvailableGroup[];
}

/**
 * Dialog para criar/editar automação
 */
export default function AutomationDialog({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  editingAutomation,
  groups,
}: AutomationDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingAutomation ? "Editar Automação" : "Nova Automação de Grupo"}
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          <TextField
            label="Nome da Automação"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Bolão Mega da Virada"
            fullWidth
            required
          />

          <TextField
            label="Descrição"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Descreva o que essa automação faz"
            fullWidth
            multiline
            rows={2}
          />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
            Selecione o Grupo
          </Typography>

          <Autocomplete
            options={groups}
            getOptionLabel={(option) => option.groupName || option.remoteJid}
            value={
              groups.find((g) => g.remoteJid === formData.groupRemoteJid) ||
              null
            }
            onChange={(_, newValue) =>
              setFormData({
                ...formData,
                groupRemoteJid: newValue?.remoteJid || "",
                groupNameMatch: "",
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Grupo específico"
                placeholder="Selecione um grupo"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Group sx={{ mr: 1, color: "text.secondary" }} />
                {option.groupName || option.remoteJid}
              </li>
            )}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            ou
          </Typography>

          <TextField
            label="Padrão de nome do grupo (regex)"
            value={formData.groupNameMatch}
            onChange={(e) =>
              setFormData({
                ...formData,
                groupNameMatch: e.target.value,
                groupRemoteJid: "",
              })
            }
            placeholder="Ex: mega.*virada"
            disabled={!!formData.groupRemoteJid}
            fullWidth
            helperText="Use regex para aplicar a múltiplos grupos com nomes similares"
          />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Tipo de Ação</InputLabel>
            <Select
              value={formData.actionType}
              label="Tipo de Ação"
              onChange={(e) =>
                setFormData({ ...formData, actionType: e.target.value })
              }
            >
              {ACTION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box>
                    <Typography>{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {formData.actionType === "collect_data" && (
            <FormControl fullWidth>
              <InputLabel>Tipo de Dados</InputLabel>
              <Select
                value={formData.dataType}
                label="Tipo de Dados"
                onChange={(e) => {
                  const dataType = DATA_TYPES.find(
                    (dt) => dt.value === e.target.value,
                  );
                  setFormData({
                    ...formData,
                    dataType: e.target.value,
                    capturePattern: dataType?.pattern || "",
                  });
                }}
              >
                {DATA_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {(formData.dataType === "custom" ||
            formData.actionType !== "collect_data") && (
            <TextField
              label="Padrão de Captura (Regex)"
              value={formData.capturePattern}
              onChange={(e) =>
                setFormData({ ...formData, capturePattern: e.target.value })
              }
              placeholder="Ex: \\d{1,2}"
              fullWidth
              helperText="Expressão regular para capturar dados das mensagens"
            />
          )}

          {formData.actionType === "webhook" && (
            <TextField
              label="URL do Webhook"
              value={formData.webhookUrl}
              onChange={(e) =>
                setFormData({ ...formData, webhookUrl: e.target.value })
              }
              placeholder="https://sua-api.com/webhook"
              fullWidth
              required
            />
          )}

          {formData.shouldReply && (
            <TextField
              label="Template de Resposta"
              value={formData.replyTemplate}
              onChange={(e) =>
                setFormData({ ...formData, replyTemplate: e.target.value })
              }
              placeholder="✅ Registrado: {{numbers}}"
              fullWidth
              multiline
              rows={2}
              helperText="Use {{variavel}} para interpolação. Ex: {{participantName}}, {{numbers}}, {{count}}"
            />
          )}

          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
            gap={2}
          >
            <TextField
              label="Válido a partir de"
              type="datetime-local"
              value={formData.startsAt}
              onChange={(e) =>
                setFormData({ ...formData, startsAt: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Expira em"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) =>
                setFormData({ ...formData, expiresAt: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.shouldReply}
                  onChange={(e) =>
                    setFormData({ ...formData, shouldReply: e.target.checked })
                  }
                />
              }
              label="Responder no grupo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.replyOnlyOnce}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      replyOnlyOnce: e.target.checked,
                    })
                  }
                />
              }
              label="1x por participante"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.skipAiAfter}
                  onChange={(e) =>
                    setFormData({ ...formData, skipAiAfter: e.target.checked })
                  }
                />
              }
              label="Pular IA após match"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
              }
              label="Ativo"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={
            !formData.name ||
            (!formData.groupRemoteJid && !formData.groupNameMatch)
          }
        >
          {editingAutomation ? "Salvar" : "Criar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
