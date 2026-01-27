"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Popper,
  ClickAwayListener,
  Chip,
} from "@mui/material";
import {
  Send,
  AttachFile,
  Image as ImageIcon,
  Inventory as InventoryIcon,
  Close,
  EmojiEmotions,
} from "@mui/icons-material";
import { StickerPicker } from "./media";
import { ReplyQuote } from "./message";
import { useQuery } from "@tanstack/react-query";
import { quickRepliesApi, QuickReply } from "@/lib/api";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (value: string) => void;
  onSendMessage: (content?: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenInventory: () => void;
  onPasteImage?: (file: File, caption?: string) => void;
  onSendSticker?: (url: string) => void;
  replyingTo?: {
    id: string;
    content: string;
    senderName: string;
  } | null;
  onCancelReply?: () => void;
  colors: {
    headerBg: string;
    inputBg: string;
    inputText: string;
    iconColor: string;
  };
  isDark: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onFileChange,
  onOpenInventory,
  onPasteImage,
  onSendSticker,
  replyingTo,
  onCancelReply,
  colors,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [stickerAnchorEl, setStickerAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  // Estado para preview de imagem colada
  const [pastedImage, setPastedImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [imageCaption, setImageCaption] = useState("");

  // Estados para menu de comandos (/)
  const [showCommands, setShowCommands] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandAnchor, setCommandAnchor] = useState<HTMLElement | null>(null);

  // Buscar quick replies
  const { data: quickReplies = [] } = useQuery<QuickReply[]>({
    queryKey: ["quick-replies-active"],
    queryFn: () => quickRepliesApi.getActive(),
  });

  // Filtrar comandos baseado na busca
  const filteredCommands = quickReplies.filter((qr) => {
    if (!commandSearch) return true;
    const search = commandSearch.toLowerCase();
    return (
      qr.title.toLowerCase().includes(search) ||
      qr.shortcut?.toLowerCase().includes(search) ||
      qr.content.toLowerCase().includes(search)
    );
  });

  // Reset selected index quando a lista muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Detectar quando digita "/"
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Verificar se começa com "/" ou se tem "/" no início de uma palavra
    const lastSlashIndex = value.lastIndexOf("/");
    
    if (lastSlashIndex === 0 || (lastSlashIndex > 0 && value[lastSlashIndex - 1] === " ")) {
      // Texto após a barra
      const searchText = value.slice(lastSlashIndex + 1);
      
      // Só mostra se não houver espaço após a busca (ainda está digitando o comando)
      if (!searchText.includes(" ")) {
        setCommandSearch(searchText);
        setShowCommands(true);
        setCommandAnchor(inputRef.current);
      } else {
        setShowCommands(false);
      }
    } else if (!value.includes("/")) {
      setShowCommands(false);
    }
  };

  // Selecionar um comando
  const selectCommand = (quickReply: QuickReply) => {
    // Remove o "/" e o texto de busca, substitui pelo conteúdo
    const lastSlashIndex = newMessage.lastIndexOf("/");
    const beforeSlash = lastSlashIndex > 0 ? newMessage.slice(0, lastSlashIndex) : "";
    
    setNewMessage(beforeSlash + quickReply.content);
    setShowCommands(false);
    setCommandSearch("");
    
    // Incrementar contador de uso
    quickRepliesApi.incrementUsage(quickReply.id);
    
    // Focar no input
    inputRef.current?.focus();
  };

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectCommand(filteredCommands[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowCommands(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleStickerClick = (event: React.MouseEvent<HTMLElement>) => {
    setStickerAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStickerClose = () => {
    setStickerAnchorEl(null);
  };

  const handlePhotoSelect = () => {
    handleMenuClose();
    fileInputRef.current?.click();
  };

  const handleProductSelect = () => {
    handleMenuClose();
    onOpenInventory();
  };

  // Handler para colar imagem (Ctrl+V)
  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const preview = URL.createObjectURL(file);
          setPastedImage({ file, preview });
          setImageCaption("");
        }
        break;
      }
    }
  }, []);

  // Enviar imagem colada
  const handleSendPastedImage = () => {
    if (pastedImage && onPasteImage) {
      onPasteImage(pastedImage.file, imageCaption.trim() || undefined);
    }
    handleClosePastePreview();
  };

  // Fechar preview
  const handleClosePastePreview = () => {
    if (pastedImage) {
      URL.revokeObjectURL(pastedImage.preview);
    }
    setPastedImage(null);
    setImageCaption("");
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      bgcolor={colors.headerBg}
    >
      {/* Area de Reply */}
      {replyingTo && (
        <Box
          sx={{
            p: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "rgba(0,0,0,0.05)",
            borderLeft: "4px solid #00a884",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: "#00a884", fontWeight: 600 }}>
              Respondendo a {replyingTo.senderName}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: "text.secondary" }}>
              {replyingTo.content}
            </Typography>
          </Box>
          <IconButton onClick={onCancelReply} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box
        p={1.5}
        display="flex"
        alignItems="center"
        gap={1}
      >
        <IconButton
          onClick={handleStickerClick}
          sx={{ color: colors.iconColor }}
        >
          <EmojiEmotions />
        </IconButton>

        <IconButton
          onClick={handleAttachClick}
          sx={{ color: colors.iconColor }}
        >
          <AttachFile sx={{ transform: "rotate(45deg)" }} />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          sx={{
            "& .MuiPaper-root": {
              bgcolor: isDark ? "#233138" : "#ffffff",
              color: isDark ? "#d1d7db" : "#54656f",
            },
          }}
          transformOrigin={{ horizontal: "left", vertical: "bottom" }}
          anchorOrigin={{ horizontal: "left", vertical: "top" }}
        >
          <MenuItem onClick={handlePhotoSelect}>
            <ListItemIcon>
              <ImageIcon sx={{ color: "#ac44cf" }} />
            </ListItemIcon>
            <ListItemText>Fotos e Vídeos</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleProductSelect}>
            <ListItemIcon>
              <InventoryIcon sx={{ color: "#00a884" }} />
            </ListItemIcon>
            <ListItemText>Produtos (Inventário)</ListItemText>
          </MenuItem>
        </Menu>

        <StickerPicker
          anchorEl={stickerAnchorEl}
          onClose={handleStickerClose}
          onSelectSticker={(url) => {
            onSendSticker?.(url);
            handleStickerClose();
          }}
        />

        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/*,video/*"
          onChange={onFileChange}
        />

        <Box sx={{ position: "relative", flex: 1 }}>
          <TextField
            fullWidth
            inputRef={inputRef}
            placeholder="Digite uma mensagem ou / para comandos"
            variant="outlined"
            size="small"
            value={newMessage}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            sx={{
              "& .MuiInputBase-root": { height: "auto" },
            }}
          />

          {/* Menu de comandos estilo WhatsApp */}
          <Popper
            open={showCommands && filteredCommands.length > 0}
            anchorEl={commandAnchor}
            placement="top-start"
            style={{ zIndex: 1400, width: commandAnchor?.offsetWidth || 300 }}
          >
            <ClickAwayListener onClickAway={() => setShowCommands(false)}>
              <Paper
                elevation={8}
                sx={{
                  bgcolor: isDark ? "#233138" : "#ffffff",
                  borderRadius: 2,
                  overflow: "hidden",
                  maxHeight: 300,
                  overflowY: "auto",
                  mb: 1,
                  border: `1px solid ${isDark ? "#3b4a54" : "#e9edef"}`,
                }}
              >
                {/* Header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: `1px solid ${isDark ? "#3b4a54" : "#e9edef"}`,
                    bgcolor: isDark ? "#1f2c33" : "#f0f2f5",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? "#8696a0" : "#667781",
                      fontWeight: 500,
                    }}
                  >
                    RESPOSTAS RÁPIDAS
                  </Typography>
                </Box>

                {/* Lista de comandos */}
                {filteredCommands.map((qr, index) => (
                  <Box
                    key={qr.id}
                    onClick={() => selectCommand(qr)}
                    sx={{
                      px: 2,
                      py: 1.5,
                      cursor: "pointer",
                      bgcolor: index === selectedIndex 
                        ? (isDark ? "#2a3942" : "#f5f6f6") 
                        : "transparent",
                      "&:hover": {
                        bgcolor: isDark ? "#2a3942" : "#f5f6f6",
                      },
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                      borderBottom: `1px solid ${isDark ? "#3b4a54" : "#f0f2f5"}`,
                    }}
                  >
                    {/* Ícone/Emoji */}
                    <Box
                      sx={{
                        fontSize: "1.3rem",
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {qr.icon || "💬"}
                    </Box>

                    {/* Conteúdo */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: isDark ? "#e9edef" : "#111b21",
                          }}
                        >
                          {qr.title}
                        </Typography>
                        {qr.shortcut && (
                          <Chip
                            label={`/${qr.shortcut}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              bgcolor: isDark ? "#3b4a54" : "#e9edef",
                              color: isDark ? "#8696a0" : "#667781",
                              "& .MuiChip-label": { px: 0.8 },
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? "#8696a0" : "#667781",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.3,
                          mt: 0.3,
                        }}
                      >
                        {qr.content}
                      </Typography>
                    </Box>

                    {/* Indicador de navegação */}
                    {index === selectedIndex && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? "#8696a0" : "#667781",
                          fontSize: "0.65rem",
                          alignSelf: "center",
                        }}
                      >
                        Enter ↵
                      </Typography>
                    )}
                  </Box>
                ))}

                {/* Dica de navegação */}
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderTop: `1px solid ${isDark ? "#3b4a54" : "#e9edef"}`,
                    bgcolor: isDark ? "#1f2c33" : "#f0f2f5",
                    display: "flex",
                    gap: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: isDark ? "#8696a0" : "#667781" }}
                  >
                    ↑↓ navegar
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isDark ? "#8696a0" : "#667781" }}
                  >
                    Enter selecionar
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: isDark ? "#8696a0" : "#667781" }}
                  >
                    Esc fechar
                  </Typography>
                </Box>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </Box>
        <IconButton
          onClick={() => onSendMessage()}
          disabled={!newMessage.trim()}
          sx={{ color: colors.iconColor }}
        >
          <Send />
        </IconButton>
      </Box>

      {/* Dialog para preview de imagem colada */}
      <Dialog
        open={!!pastedImage}
        onClose={handleClosePastePreview}
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: isDark ? "#1f2c33" : "#ffffff",
            color: isDark ? "#e9edef" : "#111b21",
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          p={2}
          bgcolor={isDark ? "#202c33" : "#f0f2f5"}
        >
          <Typography variant="h6" fontWeight={500}>
            Enviar imagem
          </Typography>
          <IconButton onClick={handleClosePastePreview} size="small">
            <Close sx={{ color: isDark ? "#aebac1" : "#54656f" }} />
          </IconButton>
        </Box>

        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            bgcolor: isDark ? "#111b21" : "#e9edef",
          }}
        >
          {pastedImage && (
            <Box
              component="img"
              src={pastedImage.preview}
              alt="Preview"
              sx={{
                maxWidth: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
              }}
            />
          )}
        </DialogContent>

        <DialogActions
          sx={{ p: 2, bgcolor: isDark ? "#202c33" : "#f0f2f5", gap: 1 }}
        >
          <TextField
            fullWidth
            placeholder="Adicionar legenda..."
            variant="outlined"
            size="small"
            value={imageCaption}
            onChange={(e) => setImageCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendPastedImage();
              }
            }}
            sx={{
              bgcolor: isDark ? "#2a3942" : "#ffffff",
              borderRadius: 2,
              "& fieldset": { border: "none" },
              "& input": { color: isDark ? "#e9edef" : "#111b21" },
            }}
          />
          <IconButton
            onClick={handleSendPastedImage}
            sx={{
              bgcolor: "#00a884",
              color: "#ffffff",
              "&:hover": { bgcolor: "#008f6f" },
              width: 48,
              height: 48,
            }}
          >
            <Send />
          </IconButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatInput;
