import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, CircularProgress, Avatar, useTheme } from '@mui/material';
import { Send, AttachFile, MoreVert } from '@mui/icons-material';
import { useChatMessages } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';
import api from '../../lib/api';

interface ChatWindowProps {
  chatId: string;
  contactName: string;
  instanceKey: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, contactName, instanceKey }) => {
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const { data: messagesData, isLoading, refetch } = useChatMessages(chatId, 1, 50);
  const { socket } = useSocket();

  const messages = messagesData?.data || [];

  // Sort messages oldest first for chat view
  const sortedMessages = [...messages].reverse();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sortedMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      // If the message belongs to this chat, refresh
      if (data.remoteJid === chatId || (data.key && data.key.remoteJid === chatId)) {
         refetch();
         // Optimistic update could happen here, but for simplicity we refetch or we could append if DTO matches
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, chatId, refetch]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.sendMessage(instanceKey, chatId, newMessage);
      setNewMessage('');
      refetch(); // Refresh to show sent message (or wait for webhook)
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Header */}
      <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`} display="flex" alignItems="center" justifyContent="space-between" bgcolor="background.paper">
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>{contactName?.slice(0, 1)}</Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">{contactName}</Typography>
            <Typography variant="caption" color="text.secondary">{chatId}</Typography>
          </Box>
        </Box>
        <IconButton>
          <MoreVert />
        </IconButton>
      </Box>

      {/* Messages Area */}
      <Box flex={1} p={2} overflow="auto" bgcolor={theme.palette.action.hover} display="flex" flexDirection="column" gap={1}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          sortedMessages.map((msg) => {
            const isMe = msg.direction === 'SEND' || msg.status === 'sended' || msg.remoteJid.includes('fromMe'); // Check your DB/DTO for reliable "fromMe" indicator. Assuming direction or status for now.
            // Wait, Message DTO has 'fromMe' on key usually, but our Prisma model has 'direction'.
            // Prisma model: direction String (SEND/RECEIVE usually)
            const isSender = msg.direction === 'SEND';
            
            return (
              <Box 
                key={msg.id} 
                alignSelf={isSender ? 'flex-end' : 'flex-start'}
                maxWidth="70%"
              >
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 1.5, 
                    bgcolor: isSender ? 'primary.main' : 'background.paper',
                    color: isSender ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1">{msg.content}</Typography>
                  <Typography variant="caption" display="block" textAlign="right" sx={{ opacity: 0.7, mt: 0.5, fontSize: '0.7rem' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box p={2} borderTop={`1px solid ${theme.palette.divider}`} bgcolor="background.paper" display="flex" gap={1}>
        <IconButton>
          <AttachFile />
        </IconButton>
        <TextField
          fullWidth
          placeholder="Digite uma mensagem..."
          variant="outlined"
          size="small"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={sending}
        />
        <IconButton color="primary" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
          {sending ? <CircularProgress size={24} /> : <Send />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default ChatWindow;
