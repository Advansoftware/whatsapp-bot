import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../lib/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a token (optional security)
    // For now, simpler connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
};
