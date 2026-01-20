"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Paper,
  Avatar,
  CircularProgress,
  Fade,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  SmartToy as AssistantIcon,
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import api from "../lib/api";
import { useSocket } from "../hooks/useSocket";

interface Message {
  id: string;
  content: string;
  direction: "incoming" | "outgoing";
  createdAt: string;
  mediaUrl?: string;
  mediaType?: string;
  status?: string;
}

interface AssistantInfo {
  available: boolean;
  reason?: string;
  ownerPhone?: string;
  ownerJid?: string;
  instanceKey?: string;
  assistantName?: string;
  testMode?: boolean;
}

export default function AssistantChat() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [assistantInfo, setAssistantInfo] = useState<AssistantInfo | null>(
    null,
  );
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [recording, setRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { socket } = useSocket();

  // Load assistant info
  const loadInfo = useCallback(async () => {
    try {
      const res = await api.get("/api/ai-secretary/assistant/info");
      setAssistantInfo(res.data);
    } catch (err) {
      console.error("Error loading assistant info:", err);
    }
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!assistantInfo?.available) return;

    setLoading(true);
    try {
      const res = await api.get("/api/ai-secretary/assistant/messages");
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }, [assistantInfo?.available]);

  // Load info on mount
  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  // Load messages when opened
  useEffect(() => {
    if (open && assistantInfo?.available) {
      loadMessages();
      setHasNewMessage(false);
    }
  }, [open, assistantInfo?.available, loadMessages]);

  // Scroll to bottom
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Listen to socket for new messages
  useEffect(() => {
    if (!socket || !assistantInfo?.ownerJid) return;

    const handleNewMessage = (data: any) => {
      if (data.remoteJid === assistantInfo.ownerJid) {
        const newMsg: Message = {
          id: data.id || `temp-${Date.now()}`,
          content: data.content,
          direction: data.direction,
          createdAt: data.createdAt || new Date().toISOString(),
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
        };

        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // If chat is closed, show notification
        if (!open && data.direction === "incoming") {
          setHasNewMessage(true);
        }
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, assistantInfo?.ownerJid, open]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const content = inputValue.trim();
    setInputValue("");
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content,
      direction: "outgoing",
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await api.post("/api/ai-secretary/assistant/send", { content });
      // Message will be updated via socket
    } catch (err) {
      console.error("Error sending message:", err);
      // Update to failed status
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle file select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement file upload
    console.log("File selected:", file);
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Not available message
  if (assistantInfo && !assistantInfo.available) {
    return (
      <Tooltip title={assistantInfo.reason || "Assistente não disponível"}>
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <IconButton
            sx={{ bgcolor: "action.hover", opacity: 0.5 }}
            size="small"
            disabled
          >
            <AssistantIcon fontSize="small" />
          </IconButton>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ display: { xs: "none", sm: "block" }, position: "relative" }}>
      {/* Trigger Button */}
      <Tooltip title="Assistente Pessoal">
        <IconButton
          onClick={() => setOpen(!open)}
          sx={{
            bgcolor: open ? "primary.main" : "action.hover",
            color: open ? "primary.contrastText" : "inherit",
            "&:hover": {
              bgcolor: open ? "primary.dark" : "action.selected",
            },
          }}
          size="small"
        >
          <Badge color="error" variant="dot" invisible={!hasNewMessage || open}>
            <AssistantIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Chat Panel */}
      <Fade in={open}>
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 80,
            right: 24,
            width: 380,
            height: 520,
            display: open ? "flex" : "none",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
            zIndex: 1300,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.2),
                width: 40,
                height: 40,
              }}
            >
              <AssistantIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {assistantInfo?.assistantName || "Assistente Pessoal"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Sempre disponível para ajudar
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: "inherit" }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
              bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
              backgroundImage:
                theme.palette.mode === "dark"
                  ? "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
                  : undefined,
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress size={32} />
              </Box>
            ) : messages.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  color: "text.secondary",
                }}
              >
                <AssistantIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body2">
                  Comece uma conversa com sua assistente pessoal!
                </Typography>
                <Typography variant="caption" sx={{ mt: 1 }}>
                  Ela pode ajudar com tarefas, lembretes e muito mais.
                </Typography>
              </Box>
            ) : (
              messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    justifyContent:
                      msg.direction === "outgoing" ? "flex-end" : "flex-start",
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "80%",
                      p: 1.5,
                      px: 2,
                      borderRadius: 2,
                      bgcolor:
                        msg.direction === "outgoing"
                          ? "primary.main"
                          : theme.palette.mode === "dark"
                            ? "grey.800"
                            : "background.paper",
                      color:
                        msg.direction === "outgoing"
                          ? "primary.contrastText"
                          : "text.primary",
                      boxShadow: 1,
                      position: "relative",
                    }}
                  >
                    {msg.mediaUrl && msg.mediaType === "image" && (
                      <Box
                        component="img"
                        src={msg.mediaUrl}
                        sx={{
                          maxWidth: "100%",
                          borderRadius: 1,
                          mb: msg.content ? 1 : 0,
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        textAlign: "right",
                        mt: 0.5,
                        opacity: 0.7,
                        fontSize: "0.65rem",
                      }}
                    >
                      {formatTime(msg.createdAt)}
                      {msg.status === "sending" && " ⏳"}
                      {msg.status === "failed" && " ❌"}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: "background.paper",
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              gap: 1,
              alignItems: "flex-end",
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept="image/*,audio/*"
              onChange={handleFileSelect}
            />
            <IconButton
              size="small"
              onClick={() => fileInputRef.current?.click()}
              sx={{ color: "text.secondary" }}
            >
              <AttachIcon fontSize="small" />
            </IconButton>

            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={3}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                },
              }}
            />

            <IconButton
              size="small"
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
                "&:disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              {sending ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SendIcon fontSize="small" />
              )}
            </IconButton>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}
