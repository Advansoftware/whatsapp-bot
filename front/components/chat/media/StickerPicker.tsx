import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  Box,
  IconButton,
  Popover,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Search, SentimentSatisfiedAlt, Close } from '@mui/icons-material';

interface StickerPackData {
  id: string;
  name: string;
  stickers: {
    id: string;
    url: string;
  }[];
}

interface StickerPickerProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSelectSticker: (stickerUrl: string) => void;
}

/**
 * Sticker picker component styled like WhatsApp Web
 * Shows sticker packs with search functionality
 */
const StickerPicker: React.FC<StickerPickerProps> = memo(({
  anchorEl,
  onClose,
  onSelectSticker,
}) => {
  const [stickerPacks, setStickerPacks] = useState<StickerPackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  // Fetch sticker packs
  useEffect(() => {
    const fetchStickers = async () => {
      setLoading(true);
      try {
        // TODO: Implement API call to fetch user's sticker packs
        // For now, show placeholder
        setStickerPacks([
          {
            id: 'recent',
            name: '⏱️ Recentes',
            stickers: [],
          },
        ]);
      } catch (err) {
        console.error('Failed to fetch stickers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (anchorEl) {
      fetchStickers();
    }
  }, [anchorEl]);

  const handleStickerClick = useCallback((stickerUrl: string) => {
    onSelectSticker(stickerUrl);
    onClose();
  }, [onSelectSticker, onClose]);

  const currentPack = stickerPacks[selectedPackIndex];

  // Filter stickers by search
  const filteredStickers = currentPack?.stickers.filter(
    s => !searchQuery || s.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      PaperProps={{
        sx: {
          width: 340,
          height: 400,
          bgcolor: '#233138',
          borderRadius: 2,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderBottom: '1px solid #2a3942',
        }}
      >
        <Typography variant="subtitle1" sx={{ color: '#e9edef', fontWeight: 500 }}>
          Figurinhas
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: '#8696a0' }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Search */}
      <Box sx={{ p: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar figurinhas"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#8696a0', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#2a3942',
              borderRadius: 2,
              '& fieldset': { border: 'none' },
            },
            '& .MuiInputBase-input': {
              color: '#d1d7db',
              '&::placeholder': { color: '#8696a0' },
            },
          }}
        />
      </Box>

      {/* Sticker packs tabs */}
      {stickerPacks.length > 0 && (
        <Tabs
          value={selectedPackIndex}
          onChange={(_, idx) => setSelectedPackIndex(idx)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            borderBottom: '1px solid #2a3942',
            '& .MuiTab-root': {
              minHeight: 40,
              minWidth: 40,
              color: '#8696a0',
              '&.Mui-selected': { color: '#00a884' },
            },
            '& .MuiTabs-indicator': { bgcolor: '#00a884' },
          }}
        >
          {stickerPacks.map((pack, idx) => (
            <Tab key={pack.id} label={pack.name} />
          ))}
        </Tabs>
      )}

      {/* Sticker grid */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1,
          height: 220,
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <CircularProgress size={32} sx={{ color: '#00a884' }} />
          </Box>
        ) : filteredStickers.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8696a0',
            }}
          >
            <SentimentSatisfiedAlt sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              {searchQuery ? 'Nenhuma figurinha encontrada' : 'Nenhuma figurinha ainda'}
            </Typography>
            <Typography variant="caption" sx={{ mt: 0.5 }}>
              Receba figurinhas de contatos para vê-las aqui
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
            }}
          >
            {filteredStickers.map((sticker) => (
              <Box
                key={sticker.id}
                onClick={() => handleStickerClick(sticker.url)}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 1,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'transform 0.1s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                  },
                }}
              >
                <Box
                  component="img"
                  src={sticker.url}
                  alt="Sticker"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Popover>
  );
});

StickerPicker.displayName = 'StickerPicker';

export default StickerPicker;
