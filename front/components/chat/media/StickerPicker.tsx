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
    const loadStickers = () => {
      setLoading(true);
      try {
        const storedFavorites = localStorage.getItem('favorite_stickers');
        const favorites = storedFavorites ? JSON.parse(storedFavorites) : [];

        setStickerPacks([
          {
            id: 'favorites',
            name: '⭐ Favoritos',
            stickers: favorites.map((url: string, index: number) => ({
                id: `fav-${index}`,
                url,
            })),
          },
          {
            id: 'recent',
            name: '⏱️ Recentes',
            stickers: [], // TODO: Implement recents
          },
          {
            id: 'emojis',
            name: '😀 Padrão',
            stickers: [
                { id: '1', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtbWh4bW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0HlCqV35hdEg2PGM/giphy.gif' },
                { id: '2', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7TKr3nzbh5WgCFxe/giphy.gif' },
                { id: '3', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNXZ4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/l0HlOHDng56Mbwle8/giphy.gif' },
                { id: '4', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3Z4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MW54Z3V4MSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3oKIPnAiaMCws8nOsE/giphy.gif' },
            ],
          }
        ]);
      } catch (err) {
        console.error('Failed to fetch stickers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (anchorEl) {
      loadStickers();
      window.addEventListener('sticker-favorites-updated', loadStickers);
    }
    
    return () => {
        window.removeEventListener('sticker-favorites-updated', loadStickers);
    };
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
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: 3,
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
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Figurinhas
        </Typography>
        <IconButton onClick={onClose} size="small">
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
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'action.hover',
              borderRadius: 2,
              '& fieldset': { border: 'none' },
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
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 40,
              minWidth: 40,
              '&.Mui-selected': { color: 'primary.main' },
            },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
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
            <CircularProgress size={32} />
          </Box>
        ) : filteredStickers.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
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
                    bgcolor: 'action.hover',
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
