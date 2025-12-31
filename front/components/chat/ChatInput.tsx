import React, { useRef, useState, useCallback } from "react";
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
} from "@mui/material";
import {
  Send,
  AttachFile,
  Image as ImageIcon,
  Inventory as InventoryIcon,
  Close,
} from "@mui/icons-material";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (value: string) => void;
  onSendMessage: (content?: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenInventory: () => void;
  onPasteImage?: (file: File, caption?: string) => void;
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
  colors,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  // Estado para preview de imagem colada
  const [pastedImage, setPastedImage] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [imageCaption, setImageCaption] = useState("");

  const handleAttachClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
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
    <>
      <Box
        p={1.5}
        bgcolor={colors.headerBg}
        display="flex"
        alignItems="center"
        gap={1}
      >
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

        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/*,video/*"
          onChange={onFileChange}
        />

        <TextField
          fullWidth
          placeholder="Digite uma mensagem"
          variant="outlined"
          size="small"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          sx={{
            bgcolor: colors.inputBg,
            borderRadius: 2,
            "& fieldset": { border: "none" },
            "& input": { color: colors.inputText, padding: "10px 12px" },
            "& .MuiInputBase-root": { height: "auto" },
          }}
        />
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
    </>
  );
};

export default ChatInput;
