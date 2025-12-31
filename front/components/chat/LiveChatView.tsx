import React, { useState, useEffect } from "react";
import ChatLayout from "./ChatLayout";
import ChatWindow from "./ChatWindow";
import { Box, Typography } from "@mui/material";
import { SupportAgent } from "@mui/icons-material";

interface LiveChatViewProps {
  initialChat?: {
    remoteJid: string;
    contact: string;
    instanceKey: string;
    profilePicUrl?: string | null;
  } | null;
}

const LiveChatView: React.FC<LiveChatViewProps> = ({ initialChat }) => {
  const [selectedChat, setSelectedChat] = useState<{
    id: string;
    contact: string;
    instanceKey: string;
    profilePicUrl?: string | null;
  } | null>(null);

  // Handle initial chat from dashboard navigation
  useEffect(() => {
    if (initialChat) {
      setSelectedChat({
        id: initialChat.remoteJid,
        contact: initialChat.contact,
        instanceKey: initialChat.instanceKey,
        profilePicUrl: initialChat.profilePicUrl,
      });
    }
  }, [initialChat]);

  const handleSelectChat = (
    id: string,
    contact: string,
    instanceKey: string,
    profilePicUrl?: string | null
  ) => {
    setSelectedChat({ id, contact, instanceKey, profilePicUrl });
  };

  return (
    <ChatLayout
      onSelectChat={handleSelectChat}
      selectedChatId={selectedChat?.id || null}
    >
      {selectedChat ? (
        <ChatWindow
          chatId={selectedChat.id}
          contactName={selectedChat.contact}
          instanceKey={selectedChat.instanceKey}
          profilePicUrl={selectedChat.profilePicUrl}
        />
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
          color="text.secondary"
          gap={2}
        >
          <SupportAgent sx={{ fontSize: 64, opacity: 0.5 }} />
          <Typography variant="h6">
            Selecione uma conversa para iniciar o atendimento
          </Typography>
        </Box>
      )}
    </ChatLayout>
  );
};

export default LiveChatView;
