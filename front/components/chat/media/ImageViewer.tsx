import React, { memo, useState, useCallback } from 'react';
import { Box, Modal, IconButton } from '@mui/material';
import { Close, ZoomIn, ZoomOut, Download } from '@mui/icons-material';

interface ImageViewerProps {
  src: string;
  alt?: string;
  caption?: string;
  thumbnail?: boolean;
}

/**
 * Image viewer with lightbox functionality
 * Click to open fullscreen modal with zoom controls
 */
const ImageViewer: React.FC<ImageViewerProps> = memo(({
  src,
  alt = 'Image',
  caption,
  thumbnail = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setZoom(1);
  }, []);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.5, 3)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.5, 0.5)), []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'image';
    link.click();
  }, [src]);

  return (
    <>
      {/* Thumbnail */}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onClick={handleOpen}
        sx={{
          maxWidth: '100%',
          maxHeight: thumbnail ? 300 : undefined,
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'opacity 0.2s',
          '&:hover': { opacity: 0.9 },
        }}
      />

      {/* Lightbox Modal */}
      <Modal
        open={isOpen}
        onClose={handleClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            outline: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
          }}
        >
          {/* Controls */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: 0,
              display: 'flex',
              gap: 1,
            }}
          >
            <IconButton onClick={handleZoomOut} sx={{ color: 'white' }}>
              <ZoomOut />
            </IconButton>
            <IconButton onClick={handleZoomIn} sx={{ color: 'white' }}>
              <ZoomIn />
            </IconButton>
            <IconButton onClick={handleDownload} sx={{ color: 'white' }}>
              <Download />
            </IconButton>
            <IconButton onClick={handleClose} sx={{ color: 'white' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Image */}
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s',
              borderRadius: 1,
            }}
          />
        </Box>
      </Modal>
    </>
  );
});

ImageViewer.displayName = 'ImageViewer';

export default ImageViewer;
