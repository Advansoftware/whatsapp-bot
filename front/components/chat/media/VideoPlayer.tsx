"use client";

import React, { memo, useRef, useState, useCallback } from 'react';
import { Box, IconButton, Typography, Slider } from '@mui/material';
import { PlayArrow, Pause, Fullscreen, VolumeUp, VolumeOff } from '@mui/icons-material';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  caption?: string;
}

/**
 * Video player styled like WhatsApp Web
 * Features: thumbnail, custom controls, fullscreen
 */
const VideoPlayer: React.FC<VideoPlayerProps> = memo(({
  src,
  poster,
  caption,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      setHasStarted(true);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback((_: Event, value: number | number[]) => {
    if (videoRef.current) {
      const newTime = typeof value === 'number' ? value : value[0];
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      sx={{
        position: 'relative',
        maxWidth: 330,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: '#000',
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={handlePlayPause}
        style={{
          width: '100%',
          maxHeight: 400,
          display: 'block',
          cursor: 'pointer',
        }}
        preload="metadata"
      />

      {/* Play overlay (before first play) */}
      {!hasStarted && (
        <Box
          onClick={handlePlayPause}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translate(-50%, -50%) scale(1.1)' },
          }}
        >
          <PlayArrow sx={{ fontSize: 40, color: 'white' }} />
        </Box>
      )}

      {/* Controls overlay */}
      {(showControls || !isPlaying) && hasStarted && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '20px 8px 8px',
          }}
        >
          {/* Progress bar */}
          <Slider
            value={currentTime}
            max={duration || 100}
            onChange={handleSeek}
            size="small"
            sx={{
              padding: '4px 0',
              '& .MuiSlider-thumb': { width: 12, height: 12 },
              '& .MuiSlider-track': { bgcolor: '#00a884' },
              '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          />

          {/* Control buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton onClick={handlePlayPause} size="small" sx={{ color: 'white' }}>
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
              <IconButton onClick={toggleMute} size="small" sx={{ color: 'white' }}>
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
              <Typography variant="caption" sx={{ color: 'white', ml: 1 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
            </Box>
            <IconButton onClick={toggleFullscreen} size="small" sx={{ color: 'white' }}>
              <Fullscreen />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Caption */}
      {caption && (
        <Typography
          variant="body2"
          sx={{
            p: 1,
            color: 'white',
            bgcolor: 'rgba(0,0,0,0.5)',
            fontSize: 14,
          }}
        >
          {caption}
        </Typography>
      )}
    </Box>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
