import React, { memo } from 'react';
import { Box } from '@mui/material';
import { InsertDriveFile, Download } from '@mui/icons-material';

interface DocumentPreviewProps {
  src: string;
  fileName: string;
  fileSize?: string;
}

/**
 * Document preview component
 * Shows file icon, name and download button
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = memo(({
  src,
  fileName,
  fileSize,
}) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    link.click();
  };

  return (
    <Box
      onClick={handleDownload}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        minWidth: 200,
        maxWidth: 300,
        bgcolor: 'rgba(0,0,0,0.05)',
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.08)' },
      }}
    >
      <InsertDriveFile sx={{ fontSize: 40, color: '#00a884' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            fontSize: 14,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName}
        </Box>
        {fileSize && (
          <Box sx={{ fontSize: 12, color: '#8696a0' }}>
            {fileSize}
          </Box>
        )}
      </Box>
      <Download sx={{ color: '#8696a0' }} />
    </Box>
  );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;
