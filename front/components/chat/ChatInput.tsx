import React, { useRef, useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Send,
  AttachFile,
  Image as ImageIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (value: string) => void;
  onSendMessage: (content?: string) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenInventory: () => void;
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
  colors,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

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

  return (
    <Box
      p={1.5}
      bgcolor={colors.headerBg}
      display="flex"
      alignItems="center"
      gap={1}
    >
      <IconButton onClick={handleAttachClick} sx={{ color: colors.iconColor }}>
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
  );
};

export default ChatInput;
