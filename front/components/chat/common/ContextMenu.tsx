import React, { memo, useState, useCallback } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import {
  Reply,
  ContentCopy,
  Delete,
  Star,
  Forward,
  Info,
  SentimentSatisfiedAlt,
} from '@mui/icons-material';

interface ContextMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onForward?: () => void;
  onInfo?: () => void;
  onSaveSticker?: () => void;
  isOwnMessage?: boolean;
  anchorReference?: 'anchorEl' | 'anchorPosition';
  anchorPosition?: { top: number; left: number };
}

/**
 * Context menu for message actions
 * Shows: Reply, Copy, Forward, Star, Delete (own messages only)
 */
const ContextMenu: React.FC<ContextMenuProps> = memo(({
  anchorEl,
  onClose,
  anchorReference = 'anchorEl',
  anchorPosition,
  onReply,
  onCopy,
  onDelete,
  onStar,
  onForward,
  onInfo,
  onSaveSticker,
  isOwnMessage = false,
}) => {
  const handleAction = useCallback((action?: () => void) => {
    if (action) action();
    onClose();
  }, [onClose]);

  return (
    <Menu
      anchorEl={anchorEl}
      anchorReference={anchorReference}
      anchorPosition={anchorPosition}
      open={Boolean(anchorEl) || Boolean(anchorPosition)}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      PaperProps={{
        sx: {
          bgcolor: '#233138',
          color: '#d1d7db',
          borderRadius: 2,
          minWidth: 180,
          '& .MuiMenuItem-root': {
            py: 1,
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.08)',
            },
          },
        },
      }}
    >
      {onReply && (
        <MenuItem onClick={() => handleAction(onReply)}>
          <ListItemIcon>
            <Reply sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Responder</ListItemText>
        </MenuItem>
      )}

      {onCopy && (
        <MenuItem onClick={() => handleAction(onCopy)}>
          <ListItemIcon>
            <ContentCopy sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Copiar</ListItemText>
        </MenuItem>
      )}

      {onForward && (
        <MenuItem onClick={() => handleAction(onForward)}>
          <ListItemIcon>
            <Forward sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Encaminhar</ListItemText>
        </MenuItem>
      )}

      {onStar && (
        <MenuItem onClick={() => handleAction(onStar)}>
          <ListItemIcon>
            <Star sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Favoritar</ListItemText>
        </MenuItem>
      )}

      {onInfo && (
        <MenuItem onClick={() => handleAction(onInfo)}>
          <ListItemIcon>
            <Info sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Info</ListItemText>
        </MenuItem>
      )}

  {onSaveSticker && (
        <MenuItem onClick={() => handleAction(onSaveSticker)}>
          <ListItemIcon>
            <SentimentSatisfiedAlt sx={{ color: '#8696a0' }} />
          </ListItemIcon>
          <ListItemText>Salvar Figurinha</ListItemText>
        </MenuItem>
      )}

      {isOwnMessage && onDelete && (
        <>
          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          <MenuItem onClick={() => handleAction(onDelete)}>
            <ListItemIcon>
              <Delete sx={{ color: '#ea4335' }} />
            </ListItemIcon>
            <ListItemText sx={{ color: '#ea4335' }}>Apagar</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
});

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
