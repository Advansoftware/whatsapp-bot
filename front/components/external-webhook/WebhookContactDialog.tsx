"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Chip,
  IconButton,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { WebhookContact, CreateWebhookContactDto } from "./types";

interface WebhookContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateWebhookContactDto) => void;
  contact?: WebhookContact | null;
  loading?: boolean;
}

const WebhookContactDialog: React.FC<WebhookContactDialogProps> = ({
  open,
  onClose,
  onSave,
  contact,
  loading,
}) => {
  const [name, setName] = useState("");
  const [remoteJid, setRemoteJid] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const isEditing = !!contact;

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setRemoteJid(contact.remoteJid);
      setIsActive(contact.isActive);
      setCategories(contact.categories || []);
    } else {
      setName("");
      setRemoteJid("");
      setIsActive(true);
      setCategories([]);
    }
  }, [contact, open]);

  const handleAddCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory("");
    }
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleSave = () => {
    onSave({
      name,
      remoteJid,
      isActive,
      categories,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Número WhatsApp"
            value={remoteJid}
            onChange={(e) => setRemoteJid(e.target.value)}
            fullWidth
            required
            disabled={isEditing}
            placeholder="5511999999999"
            helperText="Número com código do país, sem símbolos"
          />
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="success"
              />
            }
            label="Ativo"
          />
          <Box>
            <Box display="flex" gap={1} mb={1}>
              <TextField
                label="Categoria (opcional)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                size="small"
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <IconButton onClick={handleAddCategory} color="primary">
                <Add />
              </IconButton>
            </Box>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  onDelete={() => handleRemoveCategory(cat)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name || !remoteJid || loading}
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookContactDialog;
