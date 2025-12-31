import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, useTheme, InputBase, IconButton } from '@mui/material';
import { Search } from '@mui/icons-material';
import { useRecentConversations } from '../../hooks/useApi';

interface ChatLayoutProps {
  onSelectChat: (chatId: string, contact: string, instanceKey: string) => void;
  selectedChatId: string | null;
  children: React.ReactNode;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ onSelectChat, selectedChatId, children }) => {
  const theme = useTheme();
  const { data: conversations, isLoading } = useRecentConversations();

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

        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {conversations?.map((conv) => (
            <React.Fragment key={conv.id}>
              <ListItem 
                button 
                selected={selectedChatId === conv.remoteJid}
                onClick={() => onSelectChat(conv.remoteJid, conv.contact, conv.instanceName)} // Using instanceName as key based on assumption, verify DTO
                sx={{ 
                  '&.Mui-selected': { bgcolor: 'action.selected', borderLeft: `4px solid ${theme.palette.primary.main}` },
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemAvatar>
                  <Avatar src={`https://ui-avatars.com/api/?name=${conv.contact}&background=00a884&color=fff`} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="subtitle2" noWrap>{conv.contact}</Typography>
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
