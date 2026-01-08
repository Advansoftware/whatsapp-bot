import React, { memo } from 'react';
import { Box } from '@mui/material';

interface StickerViewProps {
  src: string;
  alt?: string;
  size?: number;
}

/**
 * Sticker display component
 * Shows stickers (WebP/animated) without message bubble background
 */
const StickerView: React.FC<StickerViewProps> = memo(({ 
  src, 
  alt = 'Sticker',
  size = 200 
}) => {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      sx={{
        width: size,
        height: size,
        maxWidth: '100%',
        objectFit: 'contain',
        // No background - stickers appear without bubble
      }}
    />
  );
});

StickerView.displayName = 'StickerView';

export default StickerView;
