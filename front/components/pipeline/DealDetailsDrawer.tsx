"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Button,
  TextField,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Close,
  Phone,
  WhatsApp,
  Edit,
  Delete,
  Send,
  AttachMoney,
  CalendarMonth,
  AccessTime,
  Add,
  ChatBubbleOutline,
  NoteAlt,
  Timeline as TimelineIcon,
  AttachFile,
  Archive,
  Unarchive,
} from "@mui/icons-material";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../lib/api";

interface DealDetailsDrawerProps {
  open: boolean;
  deal: any | null;
  onClose: () => void;
  onEdit: (deal: any) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string, isArchived: boolean) => void;
  onRefresh: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`deal-tabpanel-${index}`}
      {...other}
      style={{ height: "100%", overflow: "auto" }}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const DealDetailsDrawer: React.FC<DealDetailsDrawerProps> = ({
  open,
  deal,
  onClose,
  onEdit,
  onDelete,
  onArchive,
  onRefresh,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Fetch chat messages when Chat tab is selected
  const fetchMessages = useCallback(async () => {
    if (!deal?.contact?.remoteJid) return;
    setLoadingMessages(true);
    try {
      const response = await api.getMessages({ remoteJid: deal.contact.remoteJid, page: 1, limit: 50 });
      setMessages(response.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, [deal?.contact?.remoteJid]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!deal?.id) return;
    setLoadingNotes(true);
    try {
      const response = await api.getDealNotes(deal.id);
      setNotes(response || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [deal?.id]);

  useEffect(() => {
    if (open && deal) {
      setTabValue(0);
      // Fetch notes initially
      fetchNotes();
    }
  }, [open, deal, fetchNotes]);

  useEffect(() => {
    if (tabValue === 1 && deal?.contact) {
      fetchMessages();
    }
  }, [tabValue, deal?.contact, fetchMessages]);

  const handleSaveNote = async () => {
    if (!newNote.trim() || !deal?.id) return;
    setSavingNote(true);
    try {
      await api.createDealNote(deal.id, { content: newNote });
      setNewNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!deal?.id) return;
    try {
      await api.deleteDealNote(deal.id, noteId);
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleGoToChat = () => {
    if (deal?.contact?.remoteJid) {
      window.open(`/livechat?jid=${deal.contact.remoteJid}`, "_blank");
    }
  };

  if (!deal) return null;

  const contact = deal.contact;
  const stage = deal.stage;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 480 },
          bgcolor: "background.paper",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.02)" : "grey.50",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {deal.title}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              {stage && (
                <Chip
                  label={stage.name}
                  size="small"
                  sx={{
                    bgcolor: stage.color || "primary.main",
                    color: "white",
                  }}
                />
              )}
              <Chip
                label={deal.priority || "normal"}
                size="small"
                variant="outlined"
                color={
                  deal.priority === "urgent"
                    ? "error"
                    : deal.priority === "high"
                    ? "warning"
                    : "default"
                }
              />
            </Box>
            <Typography variant="h5" color="success.main" fontWeight="bold">
              {formatCurrency(deal.value)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Contact Info */}
        {contact && (
          <Box display="flex" alignItems="center" gap={2} mt={2}>
            <Avatar src={contact.profilePicUrl} sx={{ width: 48, height: 48 }}>
              {(contact.pushName || contact.remoteJid)?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight="500">
                {contact.pushName || "Sem nome"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contact.remoteJid?.replace("@s.whatsapp.net", "")}
              </Typography>
            </Box>
            <Tooltip title="Abrir Chat">
              <IconButton color="success" onClick={handleGoToChat}>
                <WhatsApp />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Quick Info */}
        <Box display="flex" gap={3} mt={2}>
          {deal.expectedCloseDate && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <CalendarMonth fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Previsão: {format(new Date(deal.expectedCloseDate), "dd/MM/yyyy")}
              </Typography>
            </Box>
          )}
          <Box display="flex" alignItems="center" gap={0.5}>
            <AccessTime fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              Criado {formatDistanceToNow(new Date(deal.createdAt), { locale: ptBR, addSuffix: true })}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab icon={<NoteAlt />} label="Resumo" iconPosition="start" />
        <Tab icon={<ChatBubbleOutline />} label="Chat" iconPosition="start" />
        <Tab icon={<TimelineIcon />} label="Notas" iconPosition="start" />
      </Tabs>

      {/* Tab Panels */}
      <Box sx={{ flexGrow: 1, overflow: "auto" }}>
        {/* Resumo Tab */}
        <TabPanel value={tabValue} index={0}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Descrição
            </Typography>
            <Typography variant="body2">
              {deal.description || "Sem descrição"}
            </Typography>
          </Paper>

          {deal.lostReason && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: "error.main" }}>
              <Typography variant="subtitle2" color="error" gutterBottom>
                Motivo da Perda
              </Typography>
              <Typography variant="body2">{deal.lostReason}</Typography>
            </Paper>
          )}

          <Box display="flex" gap={1} mt={3}>
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => onEdit(deal)}
              fullWidth
            >
              Editar
            </Button>
            <Button
              variant="outlined"
              color={deal.status === 'archived' ? 'success' : 'warning'}
              startIcon={deal.status === 'archived' ? <Unarchive /> : <Archive />}
              onClick={() => {
                if (onArchive) {
                  onArchive(deal.id, deal.status === 'archived');
                  onClose();
                }
              }}
              fullWidth
            >
              {deal.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => {
                if (confirm("Excluir este negócio?")) {
                  onDelete(deal.id);
                  onClose();
                }
              }}
              fullWidth
            >
              Excluir
            </Button>
          </Box>
        </TabPanel>

        {/* Chat Tab */}
        <TabPanel value={tabValue} index={1}>
          {loadingMessages ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box textAlign="center" py={4}>
              <ChatBubbleOutline sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography color="text.secondary">
                Nenhuma mensagem encontrada
              </Typography>
            </Box>
          ) : (
            <List dense>
              {messages.map((msg, index) => (
                <ListItem
                  key={msg.id || index}
                  sx={{
                    flexDirection: "column",
                    alignItems: msg.direction === "outgoing" ? "flex-end" : "flex-start",
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      maxWidth: "85%",
                      bgcolor:
                        msg.direction === "outgoing"
                          ? "primary.main"
                          : (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(255,255,255,0.08)"
                                : "grey.100",
                      color: msg.direction === "outgoing" ? "white" : "text.primary",
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        mt: 0.5,
                        opacity: 0.7,
                        textAlign: "right",
                      }}
                    >
                      {format(new Date(msg.createdAt), "dd/MM HH:mm")}
                    </Typography>
                  </Paper>
                </ListItem>
              ))}
            </List>
          )}
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsApp />}
              fullWidth
              onClick={handleGoToChat}
            >
              Abrir Conversa Completa
            </Button>
          </Box>
        </TabPanel>

        {/* Notas Tab */}
        <TabPanel value={tabValue} index={2}>
          {/* Add Note Input */}
          <Box mb={2}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Adicionar anotação..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              variant="outlined"
              size="small"
            />
            <Box display="flex" justifyContent="flex-end" mt={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={savingNote ? <CircularProgress size={16} /> : <Add />}
                onClick={handleSaveNote}
                disabled={!newNote.trim() || savingNote}
              >
                Adicionar
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {loadingNotes ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : notes.length === 0 ? (
            <Box textAlign="center" py={4}>
              <NoteAlt sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography color="text.secondary">
                Nenhuma anotação ainda
              </Typography>
            </Box>
          ) : (
            <List>
              {notes.map((note) => (
                <Paper key={note.id} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", flex: 1 }}>
                      {note.content}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteNote(note.id)}
                      sx={{ ml: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    {formatDistanceToNow(new Date(note.createdAt), { locale: ptBR, addSuffix: true })}
                  </Typography>
                </Paper>
              ))}
            </List>
          )}
        </TabPanel>
      </Box>
    </Drawer>
  );
};

export default DealDetailsDrawer;
