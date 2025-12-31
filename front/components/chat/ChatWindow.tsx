import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Avatar,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Send,
  AttachFile,
  MoreVert,
  Image as ImageIcon,
  Inventory as InventoryIcon,
  Close,
  Search,
  Done,
  DoneAll,
} from "@mui/icons-material";
import { useChatMessages } from "../../hooks/useApi";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";

interface ChatWindowProps {
  chatId: string;
  contactName: string;
  instanceKey: string;
  profilePicUrl?: string | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  contactName,
  instanceKey,
  profilePicUrl,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  // Attachment Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  // Inventory Modal State
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const {
    data: messagesData,
    isLoading,
    refetch,
    addMessage,
    updateMessageStatus,
  } = useChatMessages(chatId, 1, 50);
  const { socket } = useSocket();

  const messages = messagesData?.data || [];
  // Sort messages oldest first for chat view
  const sortedMessages = [...messages].reverse();

  // Fetch products when inventory modal opens
  useEffect(() => {
    if (inventoryOpen && products.length === 0) {
      setProductsLoading(true);
      api
        .getProducts()
        .then((data) => setProducts(data))
        .catch((err) => console.error("Failed to fetch products:", err))
        .finally(() => setProductsLoading(false));
    }
  }, [inventoryOpen]);

  // Track if user is at the bottom of the messages
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  }, []);

  // Smooth scroll to bottom only when new messages arrive and user is at bottom
  const scrollToBottomSmooth = useCallback(() => {
    if (isAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Force scroll to bottom (on chat change)
  const scrollToBottomForce = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      isAtBottomRef.current = true;
    }
  }, []);

  // Scroll to bottom only when new messages arrive (not on initial load jumping)
  useEffect(() => {
    if (sortedMessages.length > prevMessagesLengthRef.current) {
      scrollToBottomSmooth();
    }
    prevMessagesLengthRef.current = sortedMessages.length;
  }, [sortedMessages.length, scrollToBottomSmooth]);

  // Force scroll on chat change
  useEffect(() => {
    prevMessagesLengthRef.current = 0;
    setTimeout(scrollToBottomForce, 100);
  }, [chatId, scrollToBottomForce]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      // Check if this message belongs to the current chat
      const msgRemoteJid = data.remoteJid || data.key?.remoteJid;
      if (msgRemoteJid === chatId) {
        // Try to add the message directly without refetching
        if (data.id || data.key?.id) {
          const newMsg = {
            id: data.id || data.key?.id,
            remoteJid: msgRemoteJid,
            content:
              data.content ||
              data.message?.conversation ||
              data.message?.extendedTextMessage?.text ||
              "[Mídia]",
            direction:
              data.direction || (data.key?.fromMe ? "outgoing" : "incoming"),
            status: data.status || "sent",
            createdAt: data.createdAt || new Date().toISOString(),
            pushName: data.pushName,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
          };
          addMessage(newMsg);
        } else {
          // Fallback to refetch if we can't parse the message
          refetch();
        }
        setIsSyncing(false);
      }
    };

    const handleMessageUpdate = (data: any) => {
      // Handle message status updates (delivered, read, etc)
      if (data.messageId && data.status) {
        updateMessageStatus(data.messageId, data.status);
      }
    };

    const handleHistorySync = (data: any) => {
      if (data.instanceKey === instanceKey) {
        setIsSyncing(true);
        // Auto-turn off after 10 seconds if no more events, just in case
        setTimeout(() => setIsSyncing(false), 10000);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_update", handleMessageUpdate);
    socket.on("history_sync", handleHistorySync);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_update", handleMessageUpdate);
      socket.off("history_sync", handleHistorySync);
    };
  }, [socket, chatId, refetch, addMessage, updateMessageStatus, instanceKey]);

  // Listen for presence updates
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data: any) => {
      // Check if this presence update is for the current chat
      if (
        data.remoteJid === chatId ||
        data.remoteJid?.includes(chatId.split("@")[0])
      ) {
        const presences = data.presences;
        if (presences) {
          // Get the first presence value (usually the contact's status)
          const presenceKey = Object.keys(presences)[0];
          if (presenceKey && presences[presenceKey]?.lastKnownPresence) {
            const status = presences[presenceKey].lastKnownPresence;
            setPresenceStatus(status);

            // Clear "composing" or "recording" after 30 seconds if no update
            if (status === "composing" || status === "recording") {
              setTimeout(() => setPresenceStatus(null), 30000);
            }
          }
        }
      }
    };

    socket.on("presence_update", handlePresenceUpdate);

    return () => {
      socket.off("presence_update", handlePresenceUpdate);
    };
  }, [socket, chatId]);

  // Clear presence when changing chats
  useEffect(() => {
    setPresenceStatus(null);
  }, [chatId]);

  const handleSendMessage = async (content?: string) => {
    const textToSend = content || newMessage;
    if (!textToSend.trim()) return;

    setSending(true);
    try {
      await api.sendMessage(instanceKey, chatId, textToSend);
      setNewMessage("");
      refetch();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

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

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadingMedia(true);
      try {
        await api.sendMedia(instanceKey, chatId, file);
        setSnackbar({
          open: true,
          message: "Mídia enviada com sucesso!",
          severity: "success",
        });
        refetch();
      } catch (err) {
        console.error("Error sending media:", err);
        setSnackbar({
          open: true,
          message: "Erro ao enviar mídia",
          severity: "error",
        });
      } finally {
        setUploadingMedia(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleProductSelect = () => {
    handleMenuClose();
    setInventoryOpen(true);
  };

  const handleSendProduct = (productName: string, price: string) => {
    const message = `*Produto:* ${productName}\n*Preço:* ${price}\n\nTenho interesse!`;
    handleSendMessage(message);
    setInventoryOpen(false);
  };

  // Get presence display text
  const getPresenceText = () => {
    switch (presenceStatus) {
      case "available":
        return "online";
      case "composing":
        return "digitando...";
      case "recording":
        return "gravando áudio...";
      case "paused":
        return "online";
      case "unavailable":
        return null;
      default:
        return null;
    }
  };

  const presenceText = getPresenceText();

  // Theme Colors
  const colors = {
    bg: isDark ? "#0b141a" : "#efeae2",
    headerBg: isDark ? "#202c33" : "#f0f2f5",
    inputBg: isDark ? "#2a3942" : "#ffffff",
    inputText: isDark ? "#d1d7db" : "#54656f",
    incomingBubble: isDark ? "#202c33" : "#ffffff",
    outgoingBubble: isDark ? "#005c4b" : "#d9fdd3",
    incomingText: isDark ? "#e9edef" : "#111b21",
    outgoingText: isDark ? "#e9edef" : "#111b21",
    timeText: isDark ? "#8696a0" : "#667781",
    iconColor: isDark ? "#aebac1" : "#54656f",
    divider: isDark ? theme.palette.divider : "#d1d7db",
    bgImage: isDark
      ? "none"
      : 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', // Use same doodle but different opacity if needed
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{
        bgcolor: colors.bg,
        backgroundImage: colors.bgImage,
        backgroundRepeat: "repeat",
        backgroundSize: "400px",
      }}
    >
      {/* Header */}
      <Box
        p={1.5}
        bgcolor={colors.headerBg}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        borderLeft={`1px solid ${colors.divider}`}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            src={
              profilePicUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                contactName
              )}&background=00a884&color=fff`
            }
            sx={{ width: 40, height: 40 }}
          />
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ color: colors.incomingText, lineHeight: 1.2 }}
            >
              {contactName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  presenceText === "online"
                    ? "#25D366"
                    : presenceText
                    ? "#25D366"
                    : colors.timeText,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontStyle:
                  presenceText === "digitando..." ||
                  presenceText === "gravando áudio..."
                    ? "italic"
                    : "normal",
              }}
            >
              {presenceText ? (
                <>
                  {presenceText === "online" && (
                    <Box
                      component="span"
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "#25D366",
                        display: "inline-block",
                      }}
                    />
                  )}
                  {presenceText}
                </>
              ) : isSyncing ? (
                <>
                  <CircularProgress
                    size={10}
                    thickness={5}
                    sx={{ color: colors.timeText }}
                  />
                  Sincronizando...
                </>
              ) : null}
            </Typography>
          </Box>
        </Box>
        <IconButton sx={{ color: colors.iconColor }}>
          <MoreVert />
        </IconButton>
      </Box>

      {/* Messages Area */}
      <Box
        ref={messagesContainerRef}
        onScroll={handleScroll}
        flex={1}
        p={3}
        overflow="auto"
        display="flex"
        flexDirection="column"
        gap={0.5}
        sx={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.16)"
              : "rgba(11,20,26,0.16)",
            borderRadius: "8px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.26)"
              : "rgba(11,20,26,0.26)",
          },
        }}
      >
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress sx={{ color: "#00a884" }} />
          </Box>
        ) : (
          sortedMessages.map((msg) => {
            const isSender =
              msg.direction === "outgoing" ||
              msg.direction === "SEND" ||
              msg.status === "sended";

            return (
              <Box
                key={msg.id}
                alignSelf={isSender ? "flex-end" : "flex-start"}
                maxWidth="65%"
                sx={{
                  position: "relative",
                  mb: 1,
                  minWidth: 0, // Prevents flex items from overflowing
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: "6px 7px 8px 9px",
                    bgcolor: isSender
                      ? colors.outgoingBubble
                      : colors.incomingBubble,
                    color: isSender ? colors.outgoingText : colors.incomingText,
                    borderRadius: "7.5px",
                    borderTopLeftRadius: isSender ? "7.5px" : 0,
                    borderTopRightRadius: isSender ? 0 : "7.5px",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
                    overflow: "hidden",
                    wordBreak: "break-word",
                  }}
                >
                  {/* Check if message has mediaUrl or is an image link */}
                  {msg.mediaUrl ||
                  msg.content.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                    <Box
                      component="img"
                      src={msg.mediaUrl || msg.content}
                      alt="Image"
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 300,
                        borderRadius: 1,
                        display: "block",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        window.open(msg.mediaUrl || msg.content, "_blank")
                      }
                      onError={(e: any) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <Typography
                      variant="body1"
                      sx={{
                        fontSize: "14.2px",
                        lineHeight: "19px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                    >
                      {msg.content}
                    </Typography>
                  )}
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    gap={0.5}
                    mt="2px"
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: colors.timeText,
                        fontSize: "11px",
                      }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                    {/* Message status icons for outgoing messages */}
                    {isSender && (
                      <>
                        {msg.status === "read" || msg.status === "READ" ? (
                          <DoneAll sx={{ fontSize: 16, color: "#53bdeb" }} />
                        ) : msg.status === "delivered" ||
                          msg.status === "DELIVERY_ACK" ||
                          msg.status === "received" ? (
                          <DoneAll
                            sx={{ fontSize: 16, color: colors.timeText }}
                          />
                        ) : msg.status === "sent" ||
                          msg.status === "SERVER_ACK" ||
                          msg.status === "sended" ? (
                          <Done sx={{ fontSize: 16, color: colors.timeText }} />
                        ) : msg.status === "pending" ||
                          msg.status === "PENDING" ? (
                          <CircularProgress
                            size={12}
                            sx={{ color: colors.timeText }}
                          />
                        ) : (
                          <Done sx={{ fontSize: 16, color: colors.timeText }} />
                        )}
                      </>
                    )}
                  </Box>
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
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

        {/* Attachment Menu */}
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
          onChange={handleFileChange}
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
              handleSendMessage();
            }
          }}
          disabled={sending}
          sx={{
            bgcolor: colors.inputBg,
            borderRadius: 2,
            "& fieldset": { border: "none" },
            "& input": { color: colors.inputText, padding: "10px 12px" },
            "& .MuiInputBase-root": { height: "auto" },
          }}
        />
        <IconButton
          onClick={() => handleSendMessage()}
          disabled={sending || !newMessage.trim()}
          sx={{ color: colors.iconColor }}
        >
          {sending ? <CircularProgress size={24} color="inherit" /> : <Send />}
        </IconButton>
      </Box>

      {/* Inventory Modal */}
      <Dialog
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { bgcolor: colors.headerBg, color: colors.incomingText },
        }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.divider}` }}>
          Selecionar Produto
          <IconButton
            onClick={() => setInventoryOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: colors.iconColor,
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {productsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Nenhum produto cadastrado. Adicione produtos no módulo Inventário.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid item xs={6} sm={4} key={product.id}>
                  <Card
                    sx={{
                      bgcolor: isDark ? "#111b21" : "#ffffff",
                      color: colors.incomingText,
                    }}
                  >
                    <CardActionArea
                      onClick={() =>
                        handleSendProduct(product.name, product.price)
                      }
                    >
                      <Box
                        height={100}
                        bgcolor={isDark ? "#2a3942" : "#f0f2f5"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {product.imageUrl ? (
                          <CardMedia
                            component="img"
                            height="100"
                            image={product.imageUrl}
                            alt={product.name}
                          />
                        ) : (
                          <InventoryIcon
                            sx={{
                              fontSize: 40,
                              opacity: 0.5,
                              color: colors.iconColor,
                            }}
                          />
                        )}
                      </Box>
                      <CardContent>
                        <Typography variant="body2" noWrap>
                          {product.name}
                        </Typography>
                        {product.variant && (
                          <Typography variant="caption" color="text.secondary">
                            {product.variant}
                          </Typography>
                        )}
                        <Typography
                          variant="caption"
                          display="block"
                          color="#00a884"
                        >
                          {product.price}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Upload overlay */}
      {uploadingMedia && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <Box textAlign="center">
            <CircularProgress sx={{ color: "#00a884" }} />
            <Typography color="white" mt={2}>
              Enviando mídia...
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ChatWindow;
