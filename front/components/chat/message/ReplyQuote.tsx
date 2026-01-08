import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';

interface ReplyQuoteProps {
  senderName: string;
  content: string;
  color?: string;
  onClick?: () => void;
}

/**
 * Reply quote component - shows the quoted message being replied to
 * Styled like WhatsApp with colored left border
 */
const ReplyQuote: React.FC<ReplyQuoteProps> = memo(({
  senderName,
  content,
  color = '#00a884',
  onClick,
}) => {
  // Truncate long content
  const truncatedContent = content.length > 100 
    ? content.substring(0, 100) + '...' 
    : content;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        borderRadius: 1,
        bgcolor: 'rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        mb: 0.5,
        '&:hover': onClick ? { bgcolor: 'rgba(0, 0, 0, 0.08)' } : undefined,
      }}
    >
      {/* Colored bar */}
      <Box
        sx={{
          width: 4,
          bgcolor: color,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <Box sx={{ p: '6px 12px', minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: color,
            fontWeight: 600,
            display: 'block',
            fontSize: 12,
          }}
        >
          {senderName}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: 13,
            color: 'rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {truncatedContent}
        </Typography>
      </Box>
    </Box>
  );
});

ReplyQuote.displayName = 'ReplyQuote';

export default ReplyQuote;
