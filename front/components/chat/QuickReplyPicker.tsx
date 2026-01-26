"use client";

import React, { useState, useMemo } from "react";
import {
  Box,
  IconButton,
  Popover,
  TextField,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Bolt as QuickIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { quickRepliesApi, QuickReply } from "@/lib/api";

interface QuickReplyPickerProps {
  onSelect: (content: string, quickReplyId: string) => void;
  isDark: boolean;
  colors: {
    iconColor: string;
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  geral: "📝",
  vendas: "💰",
  suporte: "🛠️",
  pagamento: "💳",
  informacoes: "ℹ️",
  saudacao: "👋",
  despedida: "🙏",
};

export default function QuickReplyPicker({ onSelect, isDark, colors }: QuickReplyPickerProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: quickReplies = [], isLoading } = useQuery({
    queryKey: ["quick-replies", "active"],
    queryFn: quickRepliesApi.getActive,
  });

  const filteredReplies = useMemo(() => {
    if (!searchTerm.trim()) return quickReplies;

    const lower = searchTerm.toLowerCase();
    return quickReplies.filter(
      (qr) =>
        qr.title.toLowerCase().includes(lower) ||
        qr.content.toLowerCase().includes(lower) ||
        qr.shortcut?.toLowerCase().includes(lower) ||
        qr.category.toLowerCase().includes(lower)
    );
  }, [quickReplies, searchTerm]);

  // Agrupar por categoria
  const groupedReplies = useMemo(() => {
    const groups: Record<string, QuickReply[]> = {};
    filteredReplies.forEach((qr) => {
      if (!groups[qr.category]) {
        groups[qr.category] = [];
      }
      groups[qr.category].push(qr);
    });
    return groups;
  }, [filteredReplies]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSearchTerm("");
  };

  const handleSelect = async (quickReply: QuickReply) => {
    onSelect(quickReply.content, quickReply.id);
    // Incrementar uso em background
    quickRepliesApi.incrementUsage(quickReply.id).catch(() => {});
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{ color: colors.iconColor }}
        title="Respostas Rápidas"
      >
        <QuickIcon />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 450,
              bgcolor: isDark ? "#1f2c33" : "#ffffff",
              color: isDark ? "#e9edef" : "#111b21",
              borderRadius: 2,
            },
          },
        }}
      >
        <Box p={2}>
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>
            ⚡ Respostas Rápidas
          </Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Buscar resposta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: isDark ? "#8696a0" : "#54656f" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 1,
              "& .MuiOutlinedInput-root": {
                bgcolor: isDark ? "#2a3942" : "#f0f2f5",
                "& fieldset": { border: "none" },
              },
              "& input": { color: isDark ? "#e9edef" : "#111b21" },
            }}
          />
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 320, overflow: "auto" }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : Object.keys(groupedReplies).length === 0 ? (
            <Box p={3} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? "Nenhuma resposta encontrada" : "Nenhuma resposta rápida cadastrada"}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Acesse Configurações → Respostas Rápidas para adicionar
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedReplies).map(([category, replies]) => (
              <Box key={category}>
                <Box px={2} py={1} bgcolor={isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)"}>
                  <Typography variant="caption" fontWeight="bold" textTransform="uppercase">
                    {CATEGORY_ICONS[category] || "📝"} {category}
                  </Typography>
                </Box>
                <List dense disablePadding>
                  {replies.map((qr) => (
                    <ListItemButton
                      key={qr.id}
                      onClick={() => handleSelect(qr)}
                      sx={{
                        "&:hover": {
                          bgcolor: isDark ? "rgba(0,168,132,0.1)" : "rgba(0,168,132,0.05)",
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Typography fontSize={20}>{qr.icon || CATEGORY_ICONS[qr.category] || "📝"}</Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                              {qr.title}
                            </Typography>
                            {qr.shortcut && (
                              <Chip
                                label={qr.shortcut}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: 10,
                                  bgcolor: isDark ? "#00a884" : "#dcf8c6",
                                  color: isDark ? "#fff" : "#111b21",
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 240, display: "block" }}
                          >
                            {qr.content.substring(0, 60)}...
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
