"use client";

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { Done, DoneAll, Schedule, ErrorOutline } from '@mui/icons-material';

type MessageStatusType = 'pending' | 'sent' | 'delivered' | 'read' | 'error' | string;

interface MessageStatusProps {
  status: MessageStatusType;
  color?: string;
}

/**
 * Message status indicator component
 * Shows: pending (clock), sent (✓), delivered (✓✓), read (✓✓ blue)
 */
const MessageStatus: React.FC<MessageStatusProps> = memo(({ status, color = '#8696a0' }) => {
  const normalizedStatus = status?.toLowerCase() || 'sent';

  // Read status - blue double check
  if (normalizedStatus === 'read' || normalizedStatus === 'played') {
    return <DoneAll sx={{ fontSize: 16, color: '#53bdeb' }} />;
  }

  // Delivered - gray double check
  if (normalizedStatus === 'delivered') {
    return <DoneAll sx={{ fontSize: 16, color }} />;
  }

  // Pending - clock icon
  if (normalizedStatus === 'pending') {
    return <Schedule sx={{ fontSize: 14, color }} />;
  }

  // Error - red icon
  if (normalizedStatus === 'error') {
    return <ErrorOutline sx={{ fontSize: 14, color: '#f44336' }} />;
  }

  // Default: sent - single check
  return <Done sx={{ fontSize: 16, color }} />;
});

MessageStatus.displayName = 'MessageStatus';

export default MessageStatus;
