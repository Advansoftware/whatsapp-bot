"use client";

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
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: 2,
          minWidth: 180,
          '& .MuiMenuItem-root': {
            py: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          },
        },
      }}
    >
      {onReply && (
        <MenuItem onClick={() => handleAction(onReply)}>
          <ListItemIcon>
            <Reply color="inherit" fontSize="small" />
          </ListItemIcon>
          <ListItemText>Responder</ListItemText>
        </MenuItem>
      )}

      {onCopy && (
        <MenuItem onClick={() => handleAction(onCopy)}>
          <ListItemIcon>
            <ContentCopy color="inherit" fontSize="small"  />
          </ListItemIcon>
          <ListItemText>Copiar</ListItemText>
        </MenuItem>
      )}

      {onForward && (
        <MenuItem onClick={() => handleAction(onForward)}>
          <ListItemIcon>
            <Forward color="inherit" fontSize="small" />
          </ListItemIcon>
          <ListItemText>Encaminhar</ListItemText>
        </MenuItem>
      )}

      {onStar && (
        <MenuItem onClick={() => handleAction(onStar)}>
          <ListItemIcon>
            <Star color="inherit" fontSize="small" />
          </ListItemIcon>
          <ListItemText>Favoritar</ListItemText>
        </MenuItem>
      )}

      {onInfo && (
        <MenuItem onClick={() => handleAction(onInfo)}>
          <ListItemIcon>
            <Info color="inherit" fontSize="small" />
          </ListItemIcon>
          <ListItemText>Info</ListItemText>
        </MenuItem>
      )}

  {onSaveSticker && (
        <MenuItem onClick={() => handleAction(onSaveSticker)}>
          <ListItemIcon>
            <SentimentSatisfiedAlt color="inherit" fontSize="small" />
          </ListItemIcon>
          <ListItemText>Salvar Figurinha</ListItemText>
        </MenuItem>
      )}

      {isOwnMessage && onDelete && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => handleAction(onDelete)}>
            <ListItemIcon>
              <Delete color="error" fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Apagar</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
});

ContextMenu.displayName = 'ContextMenu';

export default ContextMenu;
