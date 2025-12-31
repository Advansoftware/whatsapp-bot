import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, useTheme, InputBase, IconButton } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useRecentConversations } from '../../hooks/useApi';
import { useSocket } from '../../hooks/useSocket';

interface ChatLayoutProps {
  onSelectChat: (chatId: string, contact: string, instanceKey: string, profilePicUrl?: string | null) => void;
  selectedChatId: string | null;
  children: React.ReactNode;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ onSelectChat, selectedChatId, children }) => {
  const theme = useTheme();
  const { data: conversations, isLoading, refetch } = useRecentConversations();
  const { socket } = useSocket();

  // Listen for new messages to refresh conversation list
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = () => {
      refetch();
    };

    const handleContactsUpdate = () => {
      refetch();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('contacts_update', handleContactsUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('contacts_update', handleContactsUpdate);
    };
  }, [socket, refetch]);

  const getInitials = (contact: string) => {
    if (!contact) return '??';
    const parts = contact.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return contact.substring(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    // basic formatting
    if (now.getDate() === date.getDate()) {
       return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <Box display="flex" height="calc(100vh - 100px)" gap={2}>
      {/* Sidebar List */}
      <Paper 
        elevation={0} 
        sx={{ 
          width: 320, 
          display: 'flex', 
          flexDirection: 'column', 
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`}>
           <Typography variant="h6" fontWeight="bold" gutterBottom>Mensagens</Typography>
           <Paper
            elevation={0}
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              bgcolor: theme.palette.action.hover,
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            <IconButton sx={{ p: '10px' }} aria-label="search">
              <Search />
            </IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1 }}
              placeholder="Buscar conversa..."
            />
          </Paper>
        </Box>

        <List sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 0,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
          }
        }}>
          {conversations?.map((conv) => (
            <React.Fragment key={conv.id}>
              <ListItem 
                component="button"
                selected={selectedChatId === conv.remoteJid}
                onClick={() => onSelectChat(conv.remoteJid, conv.contact, conv.instanceKey || conv.instanceName, conv.profilePicUrl)}
                sx={{ 
                  cursor: 'pointer',
                  '&.Mui-selected': { 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 168, 132, 0.15)' : 'rgba(0, 168, 132, 0.1)', 
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 168, 132, 0.2)' : 'rgba(0, 168, 132, 0.15)',
                    }
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'background-color 0.2s ease'
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={conv.profilePicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.contact)}&background=00a884&color=fff`}
                    sx={{ width: 48, height: 48 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle2" noWrap fontWeight={600}>{conv.contact}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatTime(conv.timestamp)}</Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {conv.lastMessage}
                    </Typography>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* Main Chat Area */}
      <Paper 
        elevation={0} 
        sx={{ 
            flex: 1, 
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}
      >
        {children}
      </Paper>
    </Box>
  );
};

export default ChatLayout;
