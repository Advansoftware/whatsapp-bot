import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import api, { Notification as AppNotification } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const useNotifications = () => {
  const { socket, connected } = useSocket();
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Buscar notificações da API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const result = await api.getNotifications({ limit: 20 });
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Buscar apenas contagem
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const result = await api.getNotificationCount();
      setUnreadCount(result.count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, [isAuthenticated]);

  // Marcar como lida
  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Deletar notificação
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await api.deleteNotification(id);
      const notif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [notifications]);

  // Conectar ao WebSocket e ouvir notificações em tempo real
  useEffect(() => {
    if (!socket || !connected || !isAuthenticated || !user?.company?.id) return;

    // Entrar na sala da empresa
    socket.emit('join_company', user.company.id);

    // Ouvir novas notificações
    const handleNotification = (notification: AppNotification & { isNew?: boolean }) => {
      console.log('New notification received:', notification);

      if (notification.isNew) {
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        // Tocar som de notificação (opcional)
        playNotificationSound();

        // Mostrar notificação do navegador
        showBrowserNotification(notification);
      }
    };

    // Ouvir atualização de contagem
    const handleCount = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    socket.on('notification', handleNotification);
    socket.on('notification_count', handleCount);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('notification_count', handleCount);
    };
  }, [socket, connected, isAuthenticated, user?.company?.id]);

  // Buscar notificações iniciais
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Deletar todas as notificações
  const deleteAllNotifications = useCallback(async () => {
    try {
      await api.deleteAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to delete all notifications:', error);
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  };
};

// Helpers
function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => { });
  } catch (e) {
    // Ignore errors
  }
}

function showBrowserNotification(notification: { title: string; message: string }) {
  if (!('Notification' in window)) return;

  const BrowserNotification = window.Notification;

  if (BrowserNotification.permission === 'granted') {
    new BrowserNotification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
    });
  } else if (BrowserNotification.permission !== 'denied') {
    BrowserNotification.requestPermission();
  }
}
