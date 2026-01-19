"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  TextField,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  InputAdornment,
  Divider,
  Button,
  useTheme,
} from "@mui/material";
import { Close, Search, PersonAdd, Phone } from "@mui/icons-material";
import api from "../../lib/api";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectContact: (
    remoteJid: string,
    contact: string,
    instanceKey: string,
    profilePicUrl?: string | null
  ) => void;
  defaultInstanceKey: string;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  open,
  onClose,
  onSelectContact,
  defaultInstanceKey,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showNewNumber, setShowNewNumber] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");

  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load contacts
  const loadContacts = useCallback(async (page = 1, query = "") => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await api.getContacts(page, 30, query || undefined);
      const newContacts = result.data || [];

      if (page === 1) {
        setContacts(newContacts);
      } else {
        setContacts((prev) => [...prev, ...newContacts]);
      }

      setCurrentPage(page);
      setHasMore(
        result.pagination
          ? result.pagination.page < result.pagination.totalPages
          : false
      );
    } catch (err) {
      console.error("Error loading contacts:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setContacts([]);
      setCurrentPage(1);
      setHasMore(true);
      setShowNewNumber(false);
      setNewPhoneNumber("");
      loadContacts(1, "");
    }
  }, [open, loadContacts]);

  // Debounced search
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadContacts(1, searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, open, loadContacts]);

  // Scroll handler for infinite loading
  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;

    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadContacts(currentPage + 1, searchQuery);
    }
  }, [isLoadingMore, hasMore, currentPage, searchQuery, loadContacts]);

  // Handle selecting a contact
  const handleSelectContact = (contact: any) => {
    onSelectContact(
      contact.remoteJid,
      contact.displayName || contact.pushName,
      contact.instanceId || defaultInstanceKey,
      contact.profilePicUrl
    );
    onClose();
  };

  // Handle starting chat with new number
  const handleStartChatWithNumber = () => {
    // Clean phone number - remove spaces, dashes, etc
    let cleanNumber = newPhoneNumber.replace(/[\s\-\(\)\.]/g, "");

    // Remove leading + if present
    if (cleanNumber.startsWith("+")) {
      cleanNumber = cleanNumber.substring(1);
    }

    // Add @s.whatsapp.net suffix
    const remoteJid = `${cleanNumber}@s.whatsapp.net`;

    onSelectContact(remoteJid, `+${cleanNumber}`, defaultInstanceKey, null);
    onClose();
  };

  // Check if input looks like a phone number
  const isPhoneNumber = (text: string) => {
    const cleaned = text.replace(/[\s\-\(\)\.+]/g, "");
    return /^\d{10,15}$/.test(cleaned);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? "#111b21" : "#ffffff",
          color: isDark ? "#e9edef" : "#111b21",
          height: "70vh",
          maxHeight: 600,
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PersonAdd sx={{ color: "#00a884" }} />
          <Typography variant="h6">Nova Conversa</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: isDark ? "#aebac1" : "#54656f" }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>
        {/* Search Input */}
        <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar contato ou digitar número..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: isDark ? "#8696a0" : "#54656f" }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: isDark ? "#202c33" : "#f0f2f5",
                borderRadius: 2,
                "& fieldset": { border: "none" },
              },
            }}
          />
        </Box>

        {/* New Number Option */}
        {searchQuery && isPhoneNumber(searchQuery) && (
          <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Phone />}
              onClick={() => {
                setNewPhoneNumber(searchQuery);
                handleStartChatWithNumber();
              }}
              sx={{
                borderColor: "#00a884",
                color: "#00a884",
                "&:hover": {
                  borderColor: "#00a884",
                  bgcolor: "rgba(0, 168, 132, 0.1)",
                },
              }}
            >
              Iniciar conversa com {searchQuery}
            </Button>
          </Box>
        )}

        {/* Start with new number button */}
        {!searchQuery && !showNewNumber && (
          <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
            <Button
              fullWidth
              variant="text"
              startIcon={<Phone />}
              onClick={() => setShowNewNumber(true)}
              sx={{
                color: "#00a884",
                justifyContent: "flex-start",
                textTransform: "none",
              }}
            >
              Iniciar conversa com novo número
            </Button>
          </Box>
        )}

        {/* New number input */}
        {showNewNumber && (
          <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Digite o número com código do país (ex: 5511999999999)
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <TextField
                size="small"
                placeholder="5511999999999"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: isDark ? "#202c33" : "#f0f2f5",
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={handleStartChatWithNumber}
                disabled={!newPhoneNumber || newPhoneNumber.length < 10}
                sx={{
                  bgcolor: "#00a884",
                  "&:hover": { bgcolor: "#008f72" },
                  "&:disabled": { bgcolor: isDark ? "#202c33" : "#e0e0e0" },
                }}
              >
                Iniciar
              </Button>
            </Box>
          </Box>
        )}

        {/* Contacts List */}
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: "#00a884" }} />
          </Box>
        ) : (
          <List
            ref={listRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              overflow: "auto",
              p: 0,
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.2)",
                borderRadius: "3px",
              },
            }}
          >
            {contacts.length === 0 && !isLoading && (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">
                  {searchQuery
                    ? "Nenhum contato encontrado"
                    : "Nenhum contato salvo"}
                </Typography>
              </Box>
            )}

            {contacts.map((contact) => (
              <React.Fragment key={contact.id}>
                <ListItemButton
                  onClick={() => handleSelectContact(contact)}
                  sx={{
                    py: 1.5,
                    "&:hover": {
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={
                        contact.profilePicUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          contact.displayName
                        )}&background=00a884&color=fff`
                      }
                      sx={{ width: 48, height: 48 }}
                      imgProps={{
                        onError: (e: any) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            contact.displayName
                          )}&background=00a884&color=fff`;
                        },
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" fontWeight={600}>
                        {contact.displayName}
                      </Typography>
                    }
                    secondary={
                      contact.pushName !== contact.displayName && (
                        <Typography variant="caption" color="text.secondary">
                          {contact.remoteJid.replace("@s.whatsapp.net", "")}
                        </Typography>
                      )
                    }
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))}

            {isLoadingMore && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} sx={{ color: "#00a884" }} />
              </Box>
            )}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewChatModal;
