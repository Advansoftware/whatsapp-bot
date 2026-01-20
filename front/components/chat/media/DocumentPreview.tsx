"use client";

import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { InsertDriveFile, OpenInNew } from '@mui/icons-material';

interface DocumentPreviewProps {
  src: string;
  fileName: string;
  fileSize?: string;
}

/**
 * Document preview component
 * Shows file icon, name and opens document in new tab
 */
const DocumentPreview: React.FC<DocumentPreviewProps> = memo(({
  src,
  fileName,
  fileSize,
}) => {
  // Determine file extension from src data URL or fileName
  const displayFileName = useMemo(() => {
    let name = fileName || 'Documento';
    
    // Check if src is a data URL and try to get the type
    if (src?.startsWith('data:')) {
      const mimeMatch = src.match(/^data:([^;]+)/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1];
        const extensionMap: Record<string, string> = {
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'application/vnd.ms-excel': '.xls',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
          'text/plain': '.txt',
        };
        const extension = extensionMap[mimeType];
        
        // If name doesn't have proper extension, add it
        if (extension && !name.toLowerCase().endsWith(extension)) {
          // Remove cryptic names and use a generic name
          if (name.match(/^[a-f0-9]{32,}$/i) || name === '[Documento]' || name === 'Documento') {
            name = `Documento${extension}`;
          } else if (!name.includes('.')) {
            name = `${name}${extension}`;
          }
        }
      }
    }
    
    return name;
  }, [fileName, src]);

  const handleOpenDocument = () => {
    // Open document in new tab for viewing
    window.open(src, '_blank');
  };

  return (
    <Box
      onClick={handleOpenDocument}
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
          {displayFileName}
        </Box>
        {fileSize && (
          <Box sx={{ fontSize: 12, color: '#8696a0' }}>
            {fileSize}
          </Box>
        )}
      </Box>
      <OpenInNew sx={{ color: '#8696a0' }} />
    </Box>
  );
});

DocumentPreview.displayName = 'DocumentPreview';

export default DocumentPreview;
