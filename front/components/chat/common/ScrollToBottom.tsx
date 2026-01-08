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
          bgcolor: '#202c33',
          color: '#8696a0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          zIndex: 10,
          '&:hover': {
            bgcolor: '#2a3942',
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
