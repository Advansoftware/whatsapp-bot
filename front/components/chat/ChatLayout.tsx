import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  useTheme,
  InputBase,
  IconButton,
  CircularProgress,
  Fab,
  Zoom,
} from "@mui/material";
import { Search, Edit, Close } from "@mui/icons-material";
import { useRecentConversations } from "../../hooks/useApi";
import { useSocket } from "../../hooks/useSocket";
import api from "../../lib/api";
import NewChatModal from "./NewChatModal";

interface ChatLayoutProps {
  onSelectChat: (
    chatId: string,
    contact: string,
    instanceKey: string,
    profilePicUrl?: string | null
  ) => void;
  selectedChatId: string | null;
  children: React.ReactNode;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  onSelectChat,
  selectedChatId,
  children,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const {
    data: conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    updateConversation,
    refetch,
  } = useRecentConversations();
  const { socket } = useSocket();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [defaultInstanceKey, setDefaultInstanceKey] = useState("");

  const listRef = useRef<HTMLUListElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get default instance key from first conversation
  useEffect(() => {
    if (conversations.length > 0 && !defaultInstanceKey) {
      setDefaultInstanceKey(
        conversations[0].instanceKey || conversations[0].instanceName
      );
    }
  }, [conversations, defaultInstanceKey]);

  // Listen for new messages to update conversation list in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      const remoteJid = data.remoteJid || data.key?.remoteJid;
      const content =
        data.content ||
        data.message?.conversation ||
        data.message?.extendedTextMessage?.text ||
        "[Mídia]";
      const timestamp = data.createdAt || new Date().toISOString();

      if (remoteJid) {
        const exists = conversations.some(
          (c: any) => c.remoteJid === remoteJid
        );
        if (exists) {
          updateConversation(remoteJid, content, timestamp);
        } else {
          refetch();
        }
      }
    };

    const handleContactsUpdate = () => {
      refetch();
    };

    socket.on("new_message", handleNewMessage);
    socket.on("contacts_update", handleContactsUpdate);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("contacts_update", handleContactsUpdate);
    };
  }, [socket, conversations, updateConversation, refetch]);

  // Global search with debounce
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const result = await api.searchConversations(searchQuery);
        setSearchResults(result.data || []);
      } catch (err) {
        console.error("Error searching:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore || !hasMore || searchResults) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;

    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore();
    }
  }, [isLoadingMore, hasMore, loadMore, searchResults]);

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    if (now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString();
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Handle new chat selection
  const handleNewChatSelect = (
    remoteJid: string,
    contact: string,
    instanceKey: string,
    profilePicUrl?: string | null
  ) => {
    onSelectChat(remoteJid, contact, instanceKey, profilePicUrl);
    setNewChatModalOpen(false);
  };

  // Display list - search results or conversations
  const displayList = searchResults || conversations;

  return (
    <Box display="flex" height="calc(100vh - 100px)" gap={2}>
      {/* Sidebar List */}
      <Paper
        elevation={0}
        sx={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Mensagens
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: "2px 4px",
              display: "flex",
              alignItems: "center",
              bgcolor: theme.palette.action.hover,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <IconButton sx={{ p: "10px" }} aria-label="search">
              <Search />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Buscar em todas conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <IconButton size="small" onClick={handleClearSearch}>
                <Close fontSize="small" />
              </IconButton>
            )}
          </Paper>
          {searchResults && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              {searchResults.length} resultado(s) encontrado(s)
            </Typography>
          )}
        </Box>

        {isLoading || isSearching ? (
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
              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(0,0,0,0.3)",
              },
            }}
          >
            {displayList.length === 0 && (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">
                  {searchQuery
                    ? "Nenhuma conversa encontrada"
                    : "Nenhuma conversa ainda"}
                </Typography>
              </Box>
            )}

            {displayList.map((conv: any) => (
              <React.Fragment key={conv.id}>
                <ListItemButton
                  selected={selectedChatId === conv.remoteJid}
                  onClick={() =>
                    onSelectChat(
                      conv.remoteJid,
                      conv.contact,
                      conv.instanceKey || conv.instanceName,
                      conv.profilePicUrl
                    )
                  }
                  sx={{
                    py: 1.5,
                    "&.Mui-selected": {
                      bgcolor: isDark
                        ? "rgba(0, 168, 132, 0.25)"
                        : "rgba(0, 168, 132, 0.15)",
                      borderLeft: `4px solid #00a884`,
                      "&:hover": {
                        bgcolor: isDark
                          ? "rgba(0, 168, 132, 0.35)"
                          : "rgba(0, 168, 132, 0.2)",
                      },
                    },
                    "&:hover": {
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.04)",
                    },
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={
                        conv.profilePicUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          conv.contact
                        )}&background=00a884&color=fff`
                      }
                      sx={{ width: 48, height: 48 }}
                      imgProps={{
                        onError: (e: any) => {
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            conv.contact
                          )}&background=00a884&color=fff`;
                        },
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="subtitle2" noWrap fontWeight={600}>
                          {conv.contact}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(conv.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      conv.lastMessage && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {conv.lastMessage}
                        </Typography>
                      )
                    }
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))}

            {/* Loading more indicator */}
            {isLoadingMore && !searchResults && (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={24} sx={{ color: "#00a884" }} />
              </Box>
            )}

            {/* End of list indicator */}
            {!hasMore && conversations.length > 0 && !searchResults && (
              <Box display="flex" justifyContent="center" py={2}>
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                    fontSize: "11px",
                  }}
                >
                  Fim das conversas
                </Typography>
              </Box>
            )}
          </List>
        )}

        {/* Floating Action Button - New Chat */}
        <Zoom in={!newChatModalOpen}>
          <Fab
            color="primary"
            size="medium"
            onClick={() => setNewChatModalOpen(true)}
            sx={{
              position: "absolute",
              bottom: 16,
              right: 16,
              bgcolor: "#00a884",
              "&:hover": { bgcolor: "#008f72" },
            }}
          >
            <Edit />
          </Fab>
        </Zoom>
      </Paper>

      {/* Main Chat Area */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          border: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </Paper>

      {/* New Chat Modal */}
      <NewChatModal
        open={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onSelectContact={handleNewChatSelect}
        defaultInstanceKey={defaultInstanceKey}
      />
    </Box>
  );
};

export default ChatLayout;
