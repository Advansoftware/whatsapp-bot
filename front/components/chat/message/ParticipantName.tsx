"use client";

import React, { memo, useMemo } from 'react';
import { Typography } from '@mui/material';

interface ParticipantNameProps {
  name: string;
  phone?: string;
}

// Generate consistent color from name
const getColorFromName = (name: string): string => {
  if (!name) return '#00a884';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#00a884', '#25d366', '#128c7e', '#075e54',
    '#34b7f1', '#00bcd4', '#7c4dff', '#e91e63',
    '#ff5722', '#ff9800', '#8bc34a', '#9c27b0',
  ];
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Participant name component for group chats
 * Shows colored name to identify different senders
 */
const ParticipantName: React.FC<ParticipantNameProps> = memo(({
  name,
  phone,
}) => {
  const color = useMemo(() => getColorFromName(name || phone || ''), [name, phone]);
  const displayName = name || phone || 'Unknown';

  return (
    <Typography
      variant="caption"
      sx={{
        color,
        fontWeight: 600,
        fontSize: '13px',
        display: 'block',
        mb: 0.5,
      }}
    >
      {displayName}
    </Typography>
  );
});

ParticipantName.displayName = 'ParticipantName';

export default ParticipantName;
