import React, { useState } from 'react';
import ChatLayout from './ChatLayout';
import ChatWindow from './ChatWindow';
import { Box, Typography } from '@mui/material';
import { SupportAgent } from '@mui/icons-material';

const LiveChatView: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<{ id: string; contact: string; instanceKey: string } | null>(null);

  const handleSelectChat = (id: string, contact: string, instanceKey: string) => {
    setSelectedChat({ id, contact, instanceKey });
  };

  return (
    <ChatLayout onSelectChat={handleSelectChat} selectedChatId={selectedChat?.id || null}>
      {selectedChat ? (
        <ChatWindow 
          chatId={selectedChat.id} 
          contactName={selectedChat.contact} 
          instanceKey={selectedChat.instanceKey} 
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
           <Typography variant="h6">Selecione uma conversa para iniciar o atendimento</Typography>
        </Box>
      )}
    </ChatLayout>
  );
};

export default LiveChatView;
