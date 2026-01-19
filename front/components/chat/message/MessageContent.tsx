"use client";

import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';

interface MessageContentProps {
  content: string;
}

/**
 * Message content component with clickable links
 * Supports WhatsApp text formatting: *bold*, _italic_, ~strikethrough~
 */
const MessageContent: React.FC<MessageContentProps> = memo(({ content }) => {
  const formattedContent = useMemo(() => {
    if (!content) return null;

    // URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // Split by URLs
    const parts = content.split(urlRegex);

    return parts.map((part, index) => {
      // Check if this part is a URL
      if (urlRegex.test(part)) {
        return (
          <Box
            key={index}
            component="a"
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#53bdeb',
              textDecoration: 'underline',
              wordBreak: 'break-all',
              '&:hover': { color: '#7cc8eb' },
            }}
          >
            {part}
          </Box>
        );
      }

      // Apply WhatsApp text formatting
      let formattedPart: React.ReactNode = part;

      // Bold: *text*
      formattedPart = formatText(formattedPart as string, /\*([^*]+)\*/g, 'bold');
      
      // Italic: _text_
      formattedPart = formatText(formattedPart as string, /_([^_]+)_/g, 'italic');
      
      // Strikethrough: ~text~
      formattedPart = formatText(formattedPart as string, /~([^~]+)~/g, 'strikethrough');

      return <span key={index}>{formattedPart}</span>;
    });
  }, [content]);

  return (
    <Box
      sx={{
        fontSize: '14.2px',
        lineHeight: '19px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {formattedContent}
    </Box>
  );
});

// Helper to apply text formatting
const formatText = (text: string, regex: RegExp, style: 'bold' | 'italic' | 'strikethrough'): React.ReactNode => {
  if (typeof text !== 'string') return text;
  
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    // Every odd index is a match
    if (i % 2 === 1) {
      switch (style) {
        case 'bold':
          return <strong key={i}>{part}</strong>;
        case 'italic':
          return <em key={i}>{part}</em>;
        case 'strikethrough':
          return <del key={i}>{part}</del>;
      }
    }
    return part;
  });
};

MessageContent.displayName = 'MessageContent';

export default MessageContent;
