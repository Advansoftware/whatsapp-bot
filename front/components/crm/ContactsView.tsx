import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  useTheme,
  alpha,
  Pagination,
} from "@mui/material";
import {
  Search,
  Person,
  Phone,
  Edit,
  Delete,
  Chat,
  LocalOffer,
  Add,
  Notes,
  History,
  TrendingUp,
  PeopleAlt,
  PersonAdd,
  Visibility,
} from "@mui/icons-material";
import api from "../../lib/api";
import ContactDetailsModal from "../ContactDetailsModal";

interface Contact {
  id: string;
  remoteJid: string;
  pushName: string | null;
  displayName: string;
  profilePicUrl: string | null;
  notes: string | null;
  tags: string[];
  cep?: string | null;
  birthDate: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  neighborhood?: string | null;
  university: string | null;
  course: string | null;
  occupation: string | null;
  city: string | null;
  state: string | null;
  university: string | null;
  course: string | null;
  occupation: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
}

interface ContactStats {
  totalContacts: number;
  activeContacts: number;
  newThisWeek: number;
}

interface ContactsViewProps {
  onNavigateToChat?: (conversation: any) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ onNavigateToChat }) => {
  const theme = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [detailsContactId, setDetailsContactId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    pushName: "",
    notes: "",
    tags: [] as string[],
    newTag: "",
    cep: "",
    birthDate: "",
    gender: "",
    city: "",
    state: "",
    neighborhood: "",
    university: "",
    course: "",
    occupation: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getCRMContacts(page, 30, searchQuery);
      setContacts(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError("Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getContactStats();
      setStats(data);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      loadContacts();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setEditForm({
      pushName: contact.pushName || "",
      notes: contact.notes || "",
      tags: contact.tags || [],
      newTag: "",
      cep: contact.cep || "",
      birthDate: contact.birthDate ? contact.birthDate.split("T")[0] : "",
      gender: contact.gender || "",
      city: contact.city || "",
      state: contact.state || "",
      neighborhood: contact.neighborhood || "",
      university: contact.university || "",
      course: contact.course || "",
      occupation: contact.occupation || "",
    });
    setEditOpen(true);
  };

  const handleSaveContact = async () => {
    if (!selectedContact) return;

    try {
      await api.updateCRMContact(selectedContact.id, {
        pushName: editForm.pushName,
        notes: editForm.notes,
        tags: editForm.tags,
        cep: editForm.cep || undefined,
        birthDate: editForm.birthDate || undefined,
        gender: editForm.gender || undefined,
        city: editForm.city || undefined,
        state: editForm.state || undefined,
        neighborhood: editForm.neighborhood || undefined,
        university: editForm.university || undefined,
        course: editForm.course || undefined,
        occupation: editForm.occupation || undefined,
      });
      setSuccess("Contato atualizado com sucesso!");
      setEditOpen(false);
      loadContacts();
    } catch (err) {
      setError("Erro ao atualizar contato");
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este contato?")) return;

    try {
      await api.deleteCRMContact(id);
      setSuccess("Contato excluído com sucesso!");
      loadContacts();
    } catch (err) {
      setError("Erro ao excluir contato");
    }
  };

  const addTag = () => {
    if (
      editForm.newTag.trim() &&
      !editForm.tags.includes(editForm.newTag.trim())
    ) {
      setEditForm({
        ...editForm,
        tags: [...editForm.tags, editForm.newTag.trim()],
        newTag: "",
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditForm({
      ...editForm,
      tags: editForm.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    setEditForm({ ...editForm, cep: cleanCep });

    // Buscar endereço quando CEP tiver 8 dígitos
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const address = await api.fetchAddressByCep(cleanCep);
        if (address) {
          setEditForm((prev) => ({
            ...prev,
            cep: cleanCep,
            city: address.localidade,
            state: address.uf,
            neighborhood: address.bairro,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const formatPhone = (jid: string) => {
    return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Box p={4}>
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            display="flex"
            alignItems="center"
            gap={1}
          >
            <PeopleAlt color="primary" />
            CRM - Contatos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie seus contatos, adicione notas e organize por tags.
          </Typography>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PeopleAlt color="primary" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {stats.totalContacts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Contatos
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Chat color="success" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.activeContacts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Conversas Ativas
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PersonAdd color="info" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {stats.newThisWeek}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Novos esta Semana
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nome, número ou notas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Contacts List */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : contacts.length === 0 ? (
          <Box p={6} textAlign="center">
            <PeopleAlt sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Nenhum contato encontrado
            </Typography>
            <Typography color="text.secondary">
              Os contatos aparecerão aqui quando você receber mensagens.
            </Typography>
          </Box>
        ) : (
          <>
            <List>
              {contacts.map((contact, idx) => (
                <React.Fragment key={contact.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 2,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={contact.profilePicUrl || undefined}
                        sx={{ width: 48, height: 48 }}
                      >
                        {contact.displayName.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            fontWeight="600"
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                color: "primary.main",
                                textDecoration: "underline",
                              },
                            }}
                            onClick={() => {
                              // Navigate to live chat with this contact
                              if (onNavigateToChat) {
                                onNavigateToChat({
                                  remoteJid: contact.remoteJid,
                                  contact: contact.displayName,
                                  instanceKey: contact.instanceId || "",
                                  profilePicUrl: contact.profilePicUrl,
                                });
                              }
                            }}
                          >
                            {contact.displayName}
                          </Typography>
                          {contact.tags?.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            component="span"
                          >
                            📱 {formatPhone(contact.remoteJid)}
                          </Typography>
                          {contact.lastMessage && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 400 }}
                            >
                              💬 {contact.lastMessage.substring(0, 50)}...
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {contact.messageCount} mensagens • Último contato:{" "}
                            {formatDate(contact.lastMessageAt)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Ver Detalhes">
                        <IconButton
                          onClick={() => setDetailsContactId(contact.id)}
                          color="primary"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton onClick={() => handleEditContact(contact)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton
                          onClick={() => handleDeleteContact(contact.id)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box display="flex" justifyContent="center" p={2}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* Edit Contact Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar src={selectedContact?.profilePicUrl || undefined}>
              {selectedContact?.displayName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedContact?.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedContact && formatPhone(selectedContact.remoteJid)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Contato"
                value={editForm.pushName}
                onChange={(e) =>
                  setEditForm({ ...editForm, pushName: e.target.value })
                }
                placeholder="Nome personalizado"
              />
            </Grid>

            {/* Dados Demográficos */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" gutterBottom>
                📊 Dados para Segmentação
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="CEP"
                value={editForm.cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="Digite o CEP para preencher automaticamente"
                helperText={
                  loadingCep
                    ? "Buscando endereço..."
                    : "Preencha o CEP para autocompletar cidade, estado e bairro"
                }
                InputProps={{
                  endAdornment: loadingCep ? (
                    <InputAdornment position="end">
                      <CircularProgress size={20} />
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="Data de Nascimento"
                value={editForm.birthDate}
                onChange={(e) =>
                  setEditForm({ ...editForm, birthDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Gênero"
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({ ...editForm, gender: e.target.value })
                }
                SelectProps={{ native: true }}
              >
                <option value="">Selecione...</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Cidade"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm({ ...editForm, city: e.target.value })
                }
                placeholder="Ex: São Paulo"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Estado"
                value={editForm.state}
                onChange={(e) =>
                  setEditForm({ ...editForm, state: e.target.value })
                }
                placeholder="Ex: SP"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Bairro"
                value={editForm.neighborhood}
                onChange={(e) =>
                  setEditForm({ ...editForm, neighborhood: e.target.value })
                }
                placeholder="Ex: Centro"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Universidade / Instituição"
                value={editForm.university}
                onChange={(e) =>
                  setEditForm({ ...editForm, university: e.target.value })
                }
                placeholder="Ex: USP, UNICAMP, etc."
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Curso"
                value={editForm.course}
                onChange={(e) =>
                  setEditForm({ ...editForm, course: e.target.value })
                }
                placeholder="Ex: Engenharia, Medicina"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Ocupação"
                value={editForm.occupation}
                onChange={(e) =>
                  setEditForm({ ...editForm, occupation: e.target.value })
                }
                placeholder="Ex: Estudante, Profissional"
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notas"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                placeholder="Adicione notas sobre este contato..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                {editForm.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => removeTag(tag)}
                    color="primary"
                    size="small"
                  />
                ))}
              </Box>
              <Box display="flex" gap={1}>
                <TextField
                  size="small"
                  placeholder="Nova tag..."
                  value={editForm.newTag}
                  onChange={(e) =>
                    setEditForm({ ...editForm, newTag: e.target.value })
                  }
                  onKeyPress={(e) => e.key === "Enter" && addTag()}
                />
                <Button variant="outlined" onClick={addTag} startIcon={<Add />}>
                  Adicionar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveContact}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Details Modal */}
      <ContactDetailsModal
        contactId={detailsContactId || ""}
        isOpen={!!detailsContactId}
        onClose={() => setDetailsContactId(null)}
      />
    </Box>
  );
};

export default ContactsView;
