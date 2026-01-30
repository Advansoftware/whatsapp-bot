"use client";

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
import { useRouter } from "next/navigation";
import { useChatMessages } from "../../hooks/useApi";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";

// Sub-components
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import MessageBubble from "./message/MessageBubble";
import InventoryModal from "./InventoryModal";
import ScrollToBottomButton from "./common/ScrollToBottom";
import ContactDetailsPanel from "./ContactDetailsPanel";
import ContextMenu from "./common/ContextMenu";

interface ChatWindowProps {
  chatId: string;
  contactName: string;
  instanceKey: string;
  profilePicUrl?: string | null;
  onBack?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  contactName,
  instanceKey,
  profilePicUrl,
  onBack,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const router = useRouter();

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
    severity: "success" | "error" | "warning" | "info";
  }>({ open: false, message: "", severity: "success" });
  const [transcribingMessageId, setTranscribingMessageId] = useState<
    string | null
  >(null);

  // Team assignment state
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assignedAgent, setAssignedAgent] = useState<any>(null);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const isLoadingMoreRef = useRef(false); // Track if we're loading older messages

  // Inventory Modal State
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // New features state
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    senderName: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    message: any;
  } | null>(null);

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

  // Fetch team members for assignment
  useEffect(() => {
    api
      .get("/api/team/members")
      .then((response) => setTeamMembers(response.data))
      .catch((err) => console.error("Failed to fetch team members:", err));
  }, []);

  // Handle agent assignment
  const handleAssignAgent = async (agentId: string | null) => {
    let targetId = conversationId;
    if (!targetId) {
       try {
          const result = await api.getConversationByJid(chatId);
          if (result && result.id) {
            setConversationId(result.id);
            targetId = result.id;
          }
       } catch (err) {
         console.error("Failed to fetch conversation for assignment:", err);
       }
    }

    if (!targetId) {
       setSnackbar({
          open: true,
          message: "Erro: Conversa não sincronizada. Tente recarregar.",
          severity: "warning"
       });
       return;
    }
    try {
      await api.post(`/api/team/conversations/${conversationId}/assign`, {
        agentId,
      });
      if (agentId) {
        const agent = teamMembers.find((m) => m.id === agentId);
        setAssignedAgent(agent);
        setAiEnabled(false);
        setSnackbar({
          open: true,
          message: `Conversa atribuída a ${agent?.name}`,
          severity: "success",
        });
      } else {
        setAssignedAgent(null);
        setAiEnabled(true);
        setSnackbar({
          open: true,
          message: "Conversa devolvida para IA",
          severity: "success",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Erro ao atribuir conversa",
        severity: "error",
      });
    }
  };

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
    let targetId = conversationId;
    if (!targetId) {
        try {
            const result = await api.getConversationByJid(chatId);
            if (result && result.id) {
                setConversationId(result.id);
                targetId = result.id;
            }
        } catch (err) {
            console.error("Failed to fetch conversation for AI toggle:", err);
        }
    }

    if (!targetId) {
        setSnackbar({
            open: true,
            message: "Erro: Conversa não sincronizada. Tente recarregar page.",
            severity: "warning"
        });
        return;
    }

    setIsTogglingAI(true);
    try {
      const result = await api.toggleConversationAI(targetId, !aiEnabled);
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
            senderType: data.senderType || "manual",
            quotedMessage: data.quotedMessage,
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
        senderType: "manual",
        quotedMessage: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName
        } : null
      };

      addMessage(optimisticMessage);
      
      // Clear reply state immediately
      const currentAddressReply = replyingTo;
      setReplyingTo(null);

      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 50);

      try {
        const result = await api.sendMessage({
          instanceKey, 
          remoteJid: chatId, 
          content: textToSend, 
          options: {
            quotedMessageId: currentAddressReply?.id
          }
        });
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

  // Handle audio transcription
  const handleTranscribeAudio = useCallback(
    async (messageId: string) => {
      setTranscribingMessageId(messageId);
      try {
        const result = await api.transcribeMessage(messageId);
        if (result.success) {
          // Update the message in local state
          refetch();
          setSnackbar({
            open: true,
            message: "Áudio transcrito com sucesso!",
            severity: "success",
          });
        }
      } catch (err) {
        console.error("Error transcribing audio:", err);
        setSnackbar({
          open: true,
          message: "Erro ao transcrever áudio",
          severity: "error",
        });
      } finally {
        setTranscribingMessageId(null);
      }
    },
    [refetch]
  );

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, message: any) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      message,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle reply
  const handleReply = useCallback(() => {
    if (contextMenu?.message) {
      setReplyingTo({
        id: contextMenu.message.id,
        content: contextMenu.message.content || '[Mídia]',
        senderName: contextMenu.message.pushName || (contextMenu.message.direction === 'outgoing' ? 'Você' : contactName),
      });
      handleCloseContextMenu();
    }
  }, [contextMenu, contactName]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Handle send sticker
  const handleSendSticker = useCallback(async (stickerUrl: string) => {
    // Stickers are sent as media with type 'sticker'
    // For now, we simulate sending by treating it as an image URL
    // In a real implementation, you would upload the sticker or send its ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      remoteJid: chatId,
      content: '[Sticker]',
      direction: 'outgoing',
      status: 'pending',
      createdAt: new Date().toISOString(),
      mediaUrl: stickerUrl,
      mediaType: 'sticker',
      pushName: 'Você',
    };
    
    // ... existing logic ...
    addMessage(optimisticMessage);
    
     try {
        const result = await api.sendMessage({
            instanceKey,
            remoteJid: chatId,
            content: '',
            options: {
                mediaUrl: stickerUrl,
                mediaType: 'sticker'
            }
        });
        if (result?.messageId) {
          replaceMessageId(tempId, result.messageId, "sent");
        } else {
          updateMessageStatus(tempId, "failed");
        }
      } catch (error) {
        console.error("Error sending sticker:", error);
        updateMessageStatus(tempId, "failed");
      }
  }, [chatId, instanceKey, addMessage, replaceMessageId, updateMessageStatus]);

  // Handle save sticker (favorite)
  const handleSaveSticker = useCallback(() => {
    if (contextMenu?.message && contextMenu.message.mediaType === 'sticker' && contextMenu.message.mediaUrl) {
      const stickerUrl = getMediaSrc(contextMenu.message);
      if (stickerUrl) {
        try {
          const stored = localStorage.getItem('favorite_stickers');
          const favorites = stored ? JSON.parse(stored) : [];
          if (!favorites.includes(stickerUrl)) {
             favorites.unshift(stickerUrl); // Add to top
             localStorage.setItem('favorite_stickers', JSON.stringify(favorites));
             // Dispatch event for StickerPicker to update immediately
             window.dispatchEvent(new Event('sticker-favorites-updated'));
             
             setSnackbar({
               open: true,
               message: "Figurinha salva nos favoritos!",
               severity: "success"
             });
          } else {
             setSnackbar({
               open: true,
               message: "Figurinha já está nos favoritos",
               severity: "info"
             });
          }
        } catch (e) {
          console.error("Error saving sticker:", e);
        }
      }
      handleCloseContextMenu();
    }
  }, [contextMenu, getMediaSrc]);



  // Handle scroll to message (for reply click)
  const handleScrollToMessage = useCallback((messageId: string) => {
    // Simple implementation - in a virtualized list this is complex
    // Here we just try to find the element
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash effect
      element.style.backgroundColor = 'rgba(0, 168, 132, 0.1)';
      setTimeout(() => {
        element.style.backgroundColor = 'transparent';
      }, 1000);
    } else {
      setSnackbar({
        open: true,
        message: 'Mensagem antiga não carregada',
        severity: 'success', // Info/warning actually
      });
    }
  }, []);

  return (
    <Box display="flex" width="100%" height="100%">
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        height="100%"
        sx={{
          bgcolor: colors.bg,
          backgroundImage: colors.bgImage,
          backgroundRepeat: "repeat",
          backgroundSize: "400px",
          position: "relative",
          borderRight: showContactDetails ? `1px solid ${colors.divider}` : 'none',
        }}
      >
      {/* Header */}
      <ChatHeader
        contactName={contactName}
        profilePicUrl={profilePicUrl}
        presenceText={presenceText}
        isSyncing={isSyncing}
        aiEnabled={aiEnabled}
        onToggleAI={handleToggleAI}
        isTogglingAI={isTogglingAI}
        isGroup={chatId?.endsWith("@g.us")}
        assignedAgent={assignedAgent}
        teamMembers={teamMembers}
        onAssignAgent={handleAssignAgent}
        colors={colors}
        onClick={() => setShowContactDetails(!showContactDetails)}
        remoteJid={chatId}
        onBack={onBack}
        onCreateAutomation={() => {
          // Navegar para a página de automação com o contato pré-selecionado
          const encodedJid = encodeURIComponent(chatId);
          const encodedName = encodeURIComponent(contactName);
          router.push(`/contact-automation?remoteJid=${encodedJid}&name=${encodedName}`);
        }}
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
            {sortedMessages.map((msg, index) => (
          <Box 
            key={msg.id || index} 
            id={`message-${msg.id}`}
            onContextMenu={(e) => handleContextMenu(e, msg)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <MessageBubble
              message={msg}
              colors={colors}
              getMediaSrc={getMediaSrc}
              onTranscribe={handleTranscribeAudio}
              isTranscribing={transcribingMessageId === msg.id}
              isGroupChat={chatId?.endsWith("@g.us")}
              onReply={() => {
                setReplyingTo({
                  id: msg.id,
                  content: msg.content || '[Mídia]',
                  senderName: msg.pushName || (msg.direction === 'outgoing' ? 'Você' : contactName),
                });
              }}
              onScrollToMessage={handleScrollToMessage}
            />
          </Box>
        ))}
        {uploadingMedia && (
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
          </>
        )}
      </Box>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton
        visible={showScrollButton}
        onClick={() => scrollToBottomSmooth(true)}
      />

      {/* Input Area */}
      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={(content) => {
          // Add quotes support here if api supports it
          handleSendMessage(content);
          setReplyingTo(null);
        }}
        onFileChange={handleFileChange}
        onOpenInventory={openInventory}
        onPasteImage={handlePasteImage}
        onSendSticker={handleSendSticker}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
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

      {/* Context Menu */}
      <ContextMenu
        anchorEl={null}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        onClose={handleCloseContextMenu}
        onReply={handleReply}
        onCopy={() => {
          navigator.clipboard.writeText(contextMenu?.message?.content || '');
          handleCloseContextMenu();
        }}
        onDelete={contextMenu?.message?.direction === 'outgoing' ? () => {
          // Implement delete if API supports it
          handleCloseContextMenu();
        } : undefined}
        onSaveSticker={contextMenu?.message?.mediaType === 'sticker' ? handleSaveSticker : undefined}
        isOwnMessage={contextMenu?.message?.direction === 'outgoing'}
      />

      {/* Contact Details Panel Sidebar */}
      {showContactDetails && (
        <ContactDetailsPanel
          remoteJid={chatId}
          contactName={contactName}
          profilePicUrl={profilePicUrl}
          onClose={() => setShowContactDetails(false)}
        />
      )}
    </Box>
  );
};

export default React.memo(ChatWindow);
