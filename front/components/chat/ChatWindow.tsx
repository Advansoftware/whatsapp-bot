import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Box,
  CircularProgress,
  useTheme,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import { useChatMessages } from "../../hooks/useApi";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";

// Sub-components
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import InventoryModal from "./InventoryModal";
import ScrollToBottomButton from "./ScrollToBottomButton";

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [aiEnabled, setAiEnabled] = useState<boolean | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined
  );
  const [isTogglingAI, setIsTogglingAI] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const isLoadingMoreRef = useRef(false); // Track if we're loading older messages

  // Inventory Modal State
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const {
    data: messagesData,
    isLoading,
    isLoadingMore,
    hasMore,
    refetch,
    loadMore,
    addMessage,
    updateMessageStatus,
    replaceMessageId,
  } = useChatMessages(chatId, 50);
  const { socket } = useSocket();

  // Memoize messages to prevent unnecessary recalculations
  const messages = useMemo(
    () => messagesData?.data || [],
    [messagesData?.data]
  );
  const sortedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Memoize theme colors to prevent object recreation
  const colors = useMemo(
    () => ({
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
        : 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
    }),
    [isDark, theme.palette.divider]
  );

  // Memoize getMediaSrc to prevent recreation
  const getMediaSrc = useCallback((msg: any): string => {
    if (msg.mediaUrl && msg.mediaUrl.includes("whatsapp.net")) {
      return api.getMediaUrl(msg.id);
    }
    return msg.mediaUrl || msg.content;
  }, []);

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
  }, [inventoryOpen, products.length]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messagesContainerRef.current;

      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);

      if (scrollTop < 100 && hasMore && !isLoadingMore) {
        const previousScrollHeight = scrollHeight;
        isLoadingMoreRef.current = true; // Mark that we're loading older messages

        loadMore().then(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop =
              newScrollHeight - previousScrollHeight;
          }
          // Reset after a short delay to allow render
          setTimeout(() => {
            isLoadingMoreRef.current = false;
          }, 100);
        });
      }
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Scroll functions
  const scrollToBottomSmooth = useCallback((force = false) => {
    if ((force || isAtBottomRef.current) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToBottomForce = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      isAtBottomRef.current = true;
      setShowScrollButton(false);
    }
  }, []);

  // Auto-scroll on new messages (NOT on pagination)
  useEffect(() => {
    // Skip if we're loading older messages (pagination)
    if (isLoadingMoreRef.current) {
      prevMessagesLengthRef.current = sortedMessages.length;
      return;
    }

    if (sortedMessages.length > prevMessagesLengthRef.current) {
      const lastMsg = sortedMessages[sortedMessages.length - 1];
      const isOurMessage = lastMsg?.direction === "outgoing";
      scrollToBottomSmooth(isOurMessage);
    }
    prevMessagesLengthRef.current = sortedMessages.length;
  }, [sortedMessages.length, scrollToBottomSmooth]);

  // Force scroll on chat change
  useEffect(() => {
    prevMessagesLengthRef.current = 0;
    setShowScrollButton(false);
    setTimeout(scrollToBottomForce, 100);
  }, [chatId, scrollToBottomForce]);

  // Fetch conversation AI status on chat change
  useEffect(() => {
    const fetchConversationStatus = async () => {
      try {
        const result = await api.getConversationByJid(chatId);
        setAiEnabled(result.aiEnabled);
        setConversationId(result.id);
      } catch (err) {
        console.error("Failed to fetch conversation status:", err);
        // Default to undefined so we don't show the toggle
        setAiEnabled(undefined);
        setConversationId(undefined);
      }
    };
    fetchConversationStatus();
  }, [chatId]);

  // Toggle AI for this conversation
  const handleToggleAI = useCallback(async () => {
    if (!conversationId) return;

    setIsTogglingAI(true);
    try {
      const result = await api.toggleConversationAI(conversationId, !aiEnabled);
      setAiEnabled(result.aiEnabled);
      setSnackbar({
        open: true,
        message: result.aiEnabled
          ? "IA ativada para esta conversa"
          : "IA desativada - você está no controle",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to toggle AI:", err);
      setSnackbar({
        open: true,
        message: "Erro ao alterar status da IA",
        severity: "error",
      });
    } finally {
      setIsTogglingAI(false);
    }
  }, [conversationId, aiEnabled]);

  // Socket handlers for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      const msgRemoteJid = data.remoteJid || data.key?.remoteJid;
      if (msgRemoteJid === chatId) {
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
              data.direction || (data.fromMe ? "outgoing" : "incoming"),
            status: data.status || "sent",
            createdAt: data.createdAt || new Date().toISOString(),
            pushName: data.pushName,
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
          };
          addMessage(newMsg);
        } else {
          refetch();
        }
        setIsSyncing(false);
      }
    };

    const handleMessageUpdate = (data: any) => {
      if (data.messageId && data.status) {
        updateMessageStatus(data.messageId, data.status);
      }
    };

    const handleHistorySync = (data: any) => {
      if (data.instanceKey === instanceKey) {
        setIsSyncing(true);
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

  // Presence updates
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (data: any) => {
      if (
        data.remoteJid === chatId ||
        data.remoteJid?.includes(chatId.split("@")[0])
      ) {
        const presences = data.presences;
        if (presences) {
          const presenceKey = Object.keys(presences)[0];
          if (presenceKey && presences[presenceKey]?.lastKnownPresence) {
            const status = presences[presenceKey].lastKnownPresence;
            setPresenceStatus(status);

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

  // Send message handler - memoized
  const handleSendMessage = useCallback(
    async (content?: string) => {
      const textToSend = content || newMessage;
      if (!textToSend.trim()) return;

      setNewMessage("");

      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const optimisticMessage = {
        id: tempId,
        remoteJid: chatId,
        content: textToSend,
        direction: "outgoing",
        status: "pending",
        createdAt: new Date().toISOString(),
        pushName: null,
        mediaUrl: null,
        mediaType: null,
      };

      addMessage(optimisticMessage);

      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 50);

      try {
        const result = await api.sendMessage(instanceKey, chatId, textToSend);
        if (result?.messageId) {
          replaceMessageId(tempId, result.messageId, "sent");
        } else {
          updateMessageStatus(tempId, "sent");
        }
      } catch (err) {
        console.error("Error sending message:", err);
        updateMessageStatus(tempId, "error");
        setSnackbar({
          open: true,
          message: "Erro ao enviar mensagem",
          severity: "error",
        });
      }
    },
    [
      newMessage,
      chatId,
      instanceKey,
      addMessage,
      replaceMessageId,
      updateMessageStatus,
    ]
  );

  // File upload handler - memoized
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        }
      }
    },
    [instanceKey, chatId, refetch]
  );

  // Paste image handler - memoized
  const handlePasteImage = useCallback(
    async (file: File, caption?: string) => {
      setUploadingMedia(true);
      try {
        await api.sendMedia(instanceKey, chatId, file, caption);
        setSnackbar({
          open: true,
          message: "Imagem enviada com sucesso!",
          severity: "success",
        });
        refetch();
      } catch (err) {
        console.error("Error sending pasted image:", err);
        setSnackbar({
          open: true,
          message: "Erro ao enviar imagem",
          severity: "error",
        });
      } finally {
        setUploadingMedia(false);
      }
    },
    [instanceKey, chatId, refetch]
  );

  // Product selection handler - memoized
  const handleSendProduct = useCallback(
    (productName: string, price: string) => {
      const message = `*Produto:* ${productName}\n*Preço:* ${price}\n\nTenho interesse!`;
      handleSendMessage(message);
      setInventoryOpen(false);
    },
    [handleSendMessage]
  );

  // Presence text helper - memoized
  const presenceText = useMemo(() => {
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
  }, [presenceStatus]);

  // Memoize inventory handlers
  const openInventory = useCallback(() => setInventoryOpen(true), []);
  const closeInventory = useCallback(() => setInventoryOpen(false), []);
  const closeSnackbar = useCallback(
    () => setSnackbar((prev) => ({ ...prev, open: false })),
    []
  );

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
        position: "relative",
      }}
    >
      {/* Header */}
      <ChatHeader
        contactName={contactName}
        profilePicUrl={profilePicUrl}
        presenceText={presenceText}
        isSyncing={isSyncing}
        aiEnabled={aiEnabled}
        onToggleAI={conversationId ? handleToggleAI : undefined}
        isTogglingAI={isTogglingAI}
        colors={colors}
      />

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
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
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
          <>
            {/* Loading more indicator at top */}
            {isLoadingMore && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} sx={{ color: "#00a884" }} />
              </Box>
            )}

            {/* "Load more" hint */}
            {hasMore && !isLoadingMore && sortedMessages.length > 0 && (
              <Box display="flex" justifyContent="center" py={1}>
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                    fontSize: "11px",
                  }}
                >
                  ↑ Role para cima para ver mais mensagens
                </Typography>
              </Box>
            )}

            {/* Messages */}
            {sortedMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                colors={colors}
                getMediaSrc={getMediaSrc}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        visible={showScrollButton}
        onClick={scrollToBottomForce}
      />

      {/* Input Area */}
      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onFileChange={handleFileChange}
        onOpenInventory={openInventory}
        onPasteImage={handlePasteImage}
        colors={colors}
        isDark={isDark}
      />

      {/* Inventory Modal */}
      <InventoryModal
        open={inventoryOpen}
        onClose={closeInventory}
        products={products}
        loading={productsLoading}
        onSelectProduct={handleSendProduct}
        colors={colors}
        isDark={isDark}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
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

export default React.memo(ChatWindow);
