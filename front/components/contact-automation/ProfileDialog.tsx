"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Divider,
  Chip,
  Alert,
  Avatar,
  Autocomplete,
  Grid,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
  ContactAutomationProfile,
  CreateProfileDto,
  CreateFieldDto,
  CreateMenuOptionDto,
  AvailableContact,
  BOT_TYPES,
} from "./types";

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: CreateProfileDto) => Promise<void>;
  profile?: ContactAutomationProfile | null;
  availableContacts: AvailableContact[];
  preselectedContact?: AvailableContact | null;
}

interface FieldForm extends CreateFieldDto {
  id?: string;
}

interface MenuOptionForm extends CreateMenuOptionDto {
  id?: string;
}

export default function ProfileDialog({
  open,
  onClose,
  onSave,
  profile,
  availableContacts,
  preselectedContact,
}: ProfileDialogProps) {
  const isEditing = !!profile;

  const [contactName, setContactName] = useState(profile?.contactName || preselectedContact?.name || "");
  const [contactNickname, setContactNickname] = useState(
    profile?.contactNickname || "",
  );
  const [selectedContact, setSelectedContact] =
    useState<AvailableContact | null>(
      profile
        ? {
            remoteJid: profile.remoteJid,
            name: profile.contactName,
            profilePicUrl: profile.profilePicUrl,
          }
        : preselectedContact || null,
    );
  const [description, setDescription] = useState(profile?.description || "");
  const [botType, setBotType] = useState<"menu" | "free_text" | "mixed">(
    profile?.botType || "menu",
  );
  const [fields, setFields] = useState<FieldForm[]>(
    profile?.fields?.map((f) => ({
      id: f.id,
      fieldName: f.fieldName,
      fieldLabel: f.fieldLabel,
      fieldValue: f.fieldValue,
      botPromptPatterns: f.botPromptPatterns,
      fieldType: f.fieldType,
      priority: f.priority,
      isRequired: f.isRequired,
    })) || [],
  );
  const [menuOptions, setMenuOptions] = useState<MenuOptionForm[]>(
    profile?.menuOptions?.map((m) => ({
      id: m.id,
      optionValue: m.optionValue,
      optionLabel: m.optionLabel,
      optionDescription: m.optionDescription,
      keywords: m.keywords,
      priority: m.priority,
      isExitOption: m.isExitOption,
    })) || [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when profile or open state changes
  useEffect(() => {
    if (open) {
      setContactName(profile?.contactName || preselectedContact?.name || "");
      setContactNickname(profile?.contactNickname || "");
      setSelectedContact(
        profile
          ? {
              remoteJid: profile.remoteJid,
              name: profile.contactName,
              profilePicUrl: profile.profilePicUrl,
            }
          : preselectedContact || null,
      );
      setDescription(profile?.description || "");
      setBotType(profile?.botType || "menu");
      setFields(
        profile?.fields?.map((f) => ({
          id: f.id,
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldValue: f.fieldValue,
          botPromptPatterns: f.botPromptPatterns,
          fieldType: f.fieldType,
          priority: f.priority,
          isRequired: f.isRequired,
        })) || [],
      );
      setMenuOptions(
        profile?.menuOptions?.map((m) => ({
          id: m.id,
          optionValue: m.optionValue,
          optionLabel: m.optionLabel,
          optionDescription: m.optionDescription,
          keywords: m.keywords,
          priority: m.priority,
          isExitOption: m.isExitOption,
        })) || [],
      );
      setError(null);
    }
  }, [open, profile, preselectedContact]);

  const handleAddField = () => {
    setFields([
      ...fields,
      {
        fieldName: "",
        fieldLabel: "",
        fieldValue: "",
        botPromptPatterns: [],
        fieldType: "text",
        priority: fields.length,
        isRequired: true,
      },
    ]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    key: keyof FieldForm,
    value: any,
  ) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };

    // Auto-generate fieldName from fieldLabel
    if (key === "fieldLabel") {
      newFields[index].fieldName = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }

    setFields(newFields);
  };

  // Menu Options handlers
  const handleAddMenuOption = () => {
    setMenuOptions([
      ...menuOptions,
      {
        optionValue: "",
        optionLabel: "",
        optionDescription: "",
        keywords: [],
        priority: menuOptions.length,
        isExitOption: false,
      },
    ]);
  };

  const handleRemoveMenuOption = (index: number) => {
    setMenuOptions(menuOptions.filter((_, i) => i !== index));
  };

  const handleMenuOptionChange = (
    index: number,
    key: keyof MenuOptionForm,
    value: any,
  ) => {
    const newOptions = [...menuOptions];
    newOptions[index] = { ...newOptions[index], [key]: value };
    setMenuOptions(newOptions);
  };

  const handleSave = async () => {
    setError(null);

    if (!selectedContact && !isEditing) {
      setError("Selecione um contato");
      return;
    }

    if (!contactName.trim()) {
      setError("Nome do contato é obrigatório");
      return;
    }

    // Validate fields
    for (const field of fields) {
      if (!field.fieldLabel.trim() || !field.fieldValue.trim()) {
        setError("Todos os campos devem ter nome e valor preenchidos");
        return;
      }
    }

    // Validate menu options
    for (const option of menuOptions) {
      if (!option.optionValue.trim() || !option.optionLabel.trim()) {
        setError("Todas as opções de menu devem ter valor e descrição preenchidos");
        return;
      }
    }

    setSaving(true);
    try {
      await onSave({
        remoteJid: selectedContact?.remoteJid || profile?.remoteJid || "",
        contactName: contactName.trim(),
        contactNickname: contactNickname.trim() || undefined,
        profilePicUrl: selectedContact?.profilePicUrl || profile?.profilePicUrl,
        description: description.trim() || undefined,
        botType,
        fields: fields.map((f, index) => ({
          fieldName: f.fieldName,
          fieldLabel: f.fieldLabel,
          fieldValue: f.fieldValue,
          botPromptPatterns: f.botPromptPatterns,
          fieldType: f.fieldType,
          priority: index,
          isRequired: f.isRequired,
        })),
        menuOptions: menuOptions.map((m, index) => ({
          optionValue: m.optionValue,
          optionLabel: m.optionLabel,
          optionDescription: m.optionDescription || undefined,
          keywords: m.keywords || [],
          priority: index,
          isExitOption: m.isExitOption || false,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? "Editar Perfil de Automação" : "Novo Perfil de Automação"}
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* Contact Selection */}
          {!isEditing && (
            <Autocomplete
              options={availableContacts}
              getOptionLabel={(option) => option.name}
              value={selectedContact}
              onChange={(_, newValue) => {
                setSelectedContact(newValue);
                if (newValue) {
                  setContactName(newValue.name);
                }
              }}
              renderOption={(props, option) => {
                const { key, ...restProps } = props;
                return (
                  <Box
                    component="li"
                    key={option.remoteJid}
                    {...restProps}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Avatar
                      src={option.profilePicUrl}
                      sx={{ width: 32, height: 32 }}
                    >
                      {option.name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.remoteJid.replace("@s.whatsapp.net", "")}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField {...params} label="Selecione o Contato" required />
              )}
            />
          )}

          {/* Basic Info */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Nome do Contato"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                fullWidth
                required
                helperText="Como você quer chamar este contato"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Apelido (opcional)"
                value={contactNickname}
                onChange={(e) => setContactNickname(e.target.value)}
                fullWidth
                helperText="Alternativa para IA entender (ex: 'empresa de água')"
              />
            </Grid>
          </Grid>

          <TextField
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            helperText="O que este contato faz? (ajuda a IA entender o contexto)"
          />

          <FormControl fullWidth>
            <InputLabel>Tipo de Bot</InputLabel>
            <Select
              value={botType}
              label="Tipo de Bot"
              onChange={(e) => setBotType(e.target.value as any)}
            >
              {BOT_TYPES.map((type) => (
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

          <Divider sx={{ my: 2 }} />

          {/* Fields Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" fontWeight="medium">
              Campos para Automação
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddField}
              size="small"
            >
              Adicionar Campo
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Configure os dados que a IA deve fornecer ao bot (ex: CPF, número de
            identificador)
          </Typography>

          {fields.length === 0 && (
            <Alert severity="info">
              Adicione campos como CPF, número de conta, identificador, etc.
            </Alert>
          )}

          {fields.map((field, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle2">Campo {index + 1}</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveField(index)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Nome do Campo"
                    value={field.fieldLabel}
                    onChange={(e) =>
                      handleFieldChange(index, "fieldLabel", e.target.value)
                    }
                    fullWidth
                    required
                    placeholder="Ex: CPF, Identificador, Matrícula"
                    helperText="Como você quer chamar este dado"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Valor"
                    value={field.fieldValue}
                    onChange={(e) =>
                      handleFieldChange(index, "fieldValue", e.target.value)
                    }
                    fullWidth
                    required
                    placeholder="Ex: 123.456.789-00"
                    helperText="O valor que a IA deve fornecer ao bot"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Padrões de reconhecimento (opcional)"
                    value={(field.botPromptPatterns || []).join(", ")}
                    onChange={(e) =>
                      handleFieldChange(
                        index,
                        "botPromptPatterns",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    fullWidth
                    helperText="Como o bot pede este dado? Separe por vírgula (ex: digite seu cpf, informe o cpf)"
                    placeholder="digite seu cpf, informe o cpf, qual seu cpf"
                  />
                </Grid>
              </Grid>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          {/* Menu Options Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" fontWeight="medium">
              Opções de Menu
            </Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddMenuOption}
              size="small"
            >
              Adicionar Opção
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Configure as opções do menu do bot. A IA usará as palavras-chave para selecionar a opção correta automaticamente.
          </Typography>

          {menuOptions.length === 0 && (
            <Alert severity="info">
              Adicione opções como "1 - Segunda via de conta", "2 - Consultar saldo", etc.
            </Alert>
          )}

          {menuOptions.map((option, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                border: 1,
                borderColor: option.isExitOption ? "warning.main" : "divider",
                borderRadius: 1,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                bgcolor: option.isExitOption ? "warning.50" : "transparent",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle2">
                  Opção {index + 1}
                  {option.isExitOption && (
                    <Chip label="Saída" size="small" color="warning" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemoveMenuOption(index)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="Valor da Opção"
                    value={option.optionValue}
                    onChange={(e) =>
                      handleMenuOptionChange(index, "optionValue", e.target.value)
                    }
                    fullWidth
                    required
                    placeholder="Ex: 1, 2, #"
                    helperText="O que digitar para selecionar"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    label="Descrição da Opção"
                    value={option.optionLabel}
                    onChange={(e) =>
                      handleMenuOptionChange(index, "optionLabel", e.target.value)
                    }
                    fullWidth
                    required
                    placeholder="Ex: Segunda via de contas"
                    helperText="O que esta opção faz"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Palavras-chave para IA"
                    value={(option.keywords || []).join(", ")}
                    onChange={(e) =>
                      handleMenuOptionChange(
                        index,
                        "keywords",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    fullWidth
                    helperText="Separe por vírgula. A IA usará essas palavras para escolher a opção correta"
                    placeholder="fatura, boleto, segunda via, conta, débito"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Opção de Saída?</InputLabel>
                    <Select
                      value={option.isExitOption ? "yes" : "no"}
                      label="Opção de Saída?"
                      onChange={(e) =>
                        handleMenuOptionChange(index, "isExitOption", e.target.value === "yes")
                      }
                    >
                      <MenuItem value="no">Não - Continua a navegação</MenuItem>
                      <MenuItem value="yes">Sim - Finaliza a conversa</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar Perfil"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
