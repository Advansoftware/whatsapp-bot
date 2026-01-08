import React, { memo, useMemo } from 'react';
import { Typography } from '@mui/material';

interface MessageTimestampProps {
  timestamp: string | Date;
  color?: string;
}

/**
 * Formatted timestamp component for messages
 * Shows time in HH:mm format
 */
const MessageTimestamp: React.FC<MessageTimestampProps> = memo(({ timestamp, color = '#8696a0' }) => {
  const formattedTime = useMemo(() => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  }, [timestamp]);

  return (
    <Typography
      component="span"
      sx={{
        fontSize: '11px',
        color,
        marginLeft: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {formattedTime}
    </Typography>
  );
});

MessageTimestamp.displayName = 'MessageTimestamp';

export default MessageTimestamp;
