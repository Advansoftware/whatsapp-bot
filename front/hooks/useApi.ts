import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

interface UseApiOptions<T> {
  initialData?: T;
  autoFetch?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, autoFetch = true } = options;

  const [data, setData] = useState<T | null>(initialData as T | null);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (autoFetch) {
      refetch();
    }
  }, [autoFetch]);

  return { data, isLoading, error, refetch };
}

// Specific hooks for each API endpoint
export function useDashboardStats() {
  return useApi(() => api.getDashboardStats());
}

export function useDashboardActivity() {
  return useApi(() => api.getDashboardActivity());
}

export function useConnections() {
  return useApi(() => api.getConnections());
}

export function useRecentConversations() {
  return useApi(() => api.getRecentConversations());
}

export function useMessages(page = 1, limit = 20, instanceId?: string) {
  return useApi(() => api.getMessages(page, limit, instanceId));
}

export function useChatMessages(remoteJid: string | null, page = 1, limit = 50) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!remoteJid) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getMessages(page, limit, undefined, remoteJid);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [remoteJid, page, limit]);

  // Add a single message to the list without refetching
  const addMessage = useCallback((newMessage: any) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;

      // Check if message already exists
      const exists = prevData.data?.some((m: any) => m.id === newMessage.id);
      if (exists) return prevData;

      return {
        ...prevData,
        data: [newMessage, ...prevData.data], // Add to beginning (newest first)
        pagination: {
          ...prevData.pagination,
          total: prevData.pagination.total + 1,
        },
      };
    });
  }, []);

  // Update a message status
  const updateMessageStatus = useCallback((messageId: string, status: string) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;
      return {
        ...prevData,
        data: prevData.data.map((m: any) =>
          m.id === messageId ? { ...m, status } : m
        ),
      };
    });
  }, []);

  // Refetch when remoteJid changes - use empty deps for initial + remoteJid for changes
  useEffect(() => {
    if (remoteJid) {
      setIsLoading(true);
      api.getMessages(page, limit, undefined, remoteJid)
        .then(result => setData(result))
        .catch(err => setError(err instanceof Error ? err : new Error('An error occurred')))
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
    }
  }, [remoteJid, page, limit]);

  return { data, isLoading, error, refetch, addMessage, updateMessageStatus };
}
