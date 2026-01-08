import React, { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Box, IconButton, Typography, Slider } from '@mui/material';
import { PlayArrow, Pause, Speed } from '@mui/icons-material';

interface AudioPlayerProps {
  src: string;
  onTranscribe?: () => void;
  isTranscribing?: boolean;
  transcription?: string;
}

/**
 * Audio player styled like WhatsApp Web
 * Features: play/pause, progress bar, duration, speed control
 */
const AudioPlayer: React.FC<AudioPlayerProps> = memo(({
  src,
  onTranscribe,
  isTranscribing,
  transcription,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((_: Event, value: number | number[]) => {
    if (audioRef.current) {
      const newTime = typeof value === 'number' ? value : value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  // Waveform bars (static visual representation)
  const waveformBars = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    height: Math.random() * 16 + 4,
    key: i,
  })), []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Box sx={{ width: 280, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Player controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Play/Pause button */}
        <IconButton
          onClick={handlePlayPause}
          size="small"
          sx={{
            bgcolor: '#00a884',
            color: 'white',
            width: 36,
            height: 36,
            '&:hover': { bgcolor: '#008f73' },
          }}
        >
          {isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
        </IconButton>

        {/* Waveform visualization */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            height: 24,
            cursor: 'pointer',
          }}
        >
          {waveformBars.map((bar, i) => (
            <Box
              key={bar.key}
              sx={{
                width: 3,
                height: bar.height,
                borderRadius: 1,
                bgcolor: (i / waveformBars.length) * 100 < progress ? '#00a884' : 'rgba(134, 150, 160, 0.5)',
                transition: 'background-color 0.1s',
              }}
            />
          ))}
        </Box>

        {/* Speed button */}
        <IconButton
          onClick={cyclePlaybackRate}
          size="small"
          sx={{ width: 28, height: 28 }}
        >
          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>
            {playbackRate}x
          </Typography>
        </IconButton>
      </Box>

      {/* Progress slider (hidden, for seeking) */}
      <Slider
        value={currentTime}
        max={duration || 100}
        onChange={handleSeek}
        size="small"
        sx={{
          height: 2,
          padding: '2px 0',
          '& .MuiSlider-thumb': { display: 'none' },
          '& .MuiSlider-track': { bgcolor: '#00a884' },
          '& .MuiSlider-rail': { bgcolor: 'rgba(134, 150, 160, 0.3)' },
        }}
      />

      {/* Duration */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: '#8696a0' }}>
          {formatTime(currentTime)}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: '#8696a0' }}>
          {formatTime(duration)}
        </Typography>
      </Box>

      {/* Transcription */}
      {transcription && (
        <Typography
          variant="caption"
          sx={{
            fontSize: 12,
            fontStyle: 'italic',
            opacity: 0.9,
            mt: 0.5,
          }}
        >
          {transcription}
        </Typography>
      )}
    </Box>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
