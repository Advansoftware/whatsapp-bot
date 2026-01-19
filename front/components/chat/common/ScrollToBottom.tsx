"use client";

import React, { memo } from 'react';
import { Fab, Zoom } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

/**
 * Floating button to scroll to bottom of chat
 */
const ScrollToBottom: React.FC<ScrollToBottomProps> = memo(({
  visible,
  onClick,
}) => {
  return (
    <Zoom in={visible}>
      <Fab
        size="small"
        onClick={onClick}
        sx={{
          position: 'absolute',
          bottom: 90,
          right: 20,
          bgcolor: 'background.paper',
          color: 'text.secondary',
          boxShadow: 3,
          zIndex: 10,
          '&:hover': {
            bgcolor: 'background.paper',
            filter: 'brightness(0.9)',
          },
        }}
      >
        <KeyboardArrowDown />
      </Fab>
    </Zoom>
  );
});

ScrollToBottom.displayName = 'ScrollToBottom';

export default ScrollToBottom;
