"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  InputAdornment,
  Autocomplete,
  CircularProgress,
  Avatar,
  Box,
  Typography,
} from "@mui/material";
import api from "../../lib/api";

interface CreateDealModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialStageId?: string;
  dealToEdit?: any;
}

const CreateDealModal: React.FC<CreateDealModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialStageId,
  dealToEdit,
}) => {
  const [form, setForm] = useState({
    title: "",
    value: "",
    priority: "medium",
    expectedCloseDate: "",
    contactId: "",
    stageId: "",
    notes: "",
  });

  const [contactOptions, setContactOptions] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (dealToEdit) {
        setForm({
          title: dealToEdit.title,
          value: dealToEdit.value ? String(dealToEdit.value) : "",
          priority: dealToEdit.priority || "medium",
          expectedCloseDate: dealToEdit.expectedCloseDate ? dealToEdit.expectedCloseDate.split('T')[0] : "",
          contactId: dealToEdit.contactId || "",
          stageId: dealToEdit.stageId,
          notes: dealToEdit.notes || "",
        });
        if (dealToEdit.contact) {
            setContactOptions([dealToEdit.contact]);
        }
      } else {
        setForm({
          title: "",
          value: "",
          priority: "medium",
          expectedCloseDate: "",
          contactId: "",
          stageId: initialStageId || "",
          notes: "",
        });
      }
    }
  }, [open, dealToEdit, initialStageId]);

  const fetchContacts = async (query: string) => {
    if (!query) return;
    setLoadingContacts(true);
    try {
      const res = await api.getCRMContacts(1, 10, query);
      // API might return { data: [], meta: {} } or just { contacts: [] } or just []
      // Check ContactsView implementation: usually res.data or res.contacts
      setContactOptions(res.data || res.contacts || res || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit({
        ...form,
        value: form.value ? parseFloat(form.value) : 0,
        expectedCloseDate: form.expectedCloseDate ? new Date(form.expectedCloseDate).toISOString() : undefined
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{dealToEdit ? "Editar Negócio" : "Novo Negócio"}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Título do Negócio"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Venda de Plano Enterprise"
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Autocomplete
                options={contactOptions}
                getOptionLabel={(option) => option.pushName || option.remoteJid || ""}
                loading={loadingContacts}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(event, value) => {
                    fetchContacts(value);
                }}
                onChange={(event, value: any) => {
                    setForm({ ...form, contactId: value?.id || "" });
                    // Auto-fill title if empty
                    if (!form.title && value) {
                        setForm(prev => ({ ...prev, title: `Negócio com ${value.pushName || "Cliente"}` }));
                    }
                }}
                value={contactOptions.find(c => c.id === form.contactId) || null}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Contato Vinculado"
                        placeholder="Pesquise o contato..."
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loadingContacts ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
                renderOption={(props, option) => {
                    // Extract key from props to avoid React key warning
                    const { key, ...otherProps } = props;
                    return (
                        <li key={option.id} {...otherProps}>
                            <Box display="flex" alignItems="center" gap={1.5} width="100%">
                                <Avatar 
                                    src={option.profilePicUrl} 
                                    alt={option.pushName || option.remoteJid}
                                    sx={{ width: 32, height: 32 }}
                                >
                                    {(option.pushName || option.remoteJid)?.charAt(0)?.toUpperCase()}
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {option.pushName || option.remoteJid}
                                    </Typography>
                                    {option.pushName && (
                                        <Typography variant="caption" color="text.secondary">
                                            {option.remoteJid.replace('@s.whatsapp.net', '')}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </li>
                    );
                }}
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              label="Valor (R$)"
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
              }}
            />
          </Grid>

          <Grid size={{ xs: 6 }}>
            <TextField
              fullWidth
              select
              label="Prioridade"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <MenuItem value="low">Baixa</MenuItem>
              <MenuItem value="medium">Média</MenuItem>
              <MenuItem value="high">Alta</MenuItem>
              <MenuItem value="urgent">Urgente</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              type="date"
              label="Data Prevista de Fechamento"
              value={form.expectedCloseDate}
              onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
             <TextField
               fullWidth
               multiline
               rows={3}
               label="Notas"
               value={form.notes}
               onChange={(e) => setForm({ ...form, notes: e.target.value })}
             />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !form.title}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDealModal;
