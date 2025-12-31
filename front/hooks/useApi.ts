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

export function useRecentConversations(initialLimit = 30) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const result = await api.getRecentConversations(1, initialLimit);
      setData(result.data || result);
      setHasMore(result.pagination ? result.pagination.page < result.pagination.totalPages : false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  // Load more conversations (older)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const result = await api.getRecentConversations(nextPage, initialLimit);
      const newData = result.data || result;

      setData((prevData) => {
        const existingIds = new Set(prevData.map((c: any) => c.id));
        const uniqueNew = newData.filter((c: any) => !existingIds.has(c.id));
        return [...prevData, ...uniqueNew];
      });

      setCurrentPage(nextPage);
      setHasMore(result.pagination ? result.pagination.page < result.pagination.totalPages : false);
    } catch (err) {
      console.error('Error loading more conversations:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, isLoadingMore, hasMore, initialLimit]);

  // Update a conversation's last message (for real-time updates)
  const updateConversation = useCallback((remoteJid: string, lastMessage: string, timestamp: string) => {
    setData((prevData) => {
      const index = prevData.findIndex((c: any) => c.remoteJid === remoteJid);
      if (index === -1) {
        // New conversation - refetch to get proper data
        return prevData;
      }

      // Update existing conversation and move to top
      const updated = {
        ...prevData[index],
        lastMessage,
        timestamp,
      };

      const filtered = prevData.filter((_, i) => i !== index);
      return [updated, ...filtered];
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, []);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
    updateConversation
  };
}

export function useMessages(page = 1, limit = 20, instanceId?: string) {
  return useApi(() => api.getMessages(page, limit, instanceId));
}

export function useChatMessages(remoteJid: string | null, initialLimit = 50) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const refetch = useCallback(async () => {
    if (!remoteJid) {
      setData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    try {
      const result = await api.getMessages(1, initialLimit, undefined, remoteJid);
      setData(result);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [remoteJid, initialLimit]);

  // Load more (older) messages - for infinite scroll
  const loadMore = useCallback(async () => {
    if (!remoteJid || isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const result = await api.getMessages(nextPage, initialLimit, undefined, remoteJid);

      setData((prevData: any) => {
        if (!prevData) return result;

        // Filter out duplicates
        const existingIds = new Set(prevData.data.map((m: any) => m.id));
        const newMessages = result.data.filter((m: any) => !existingIds.has(m.id));

        return {
          ...prevData,
          // Append older messages to the end (they're older, so they come after in DESC order)
          data: [...prevData.data, ...newMessages],
          pagination: result.pagination,
        };
      });

      setCurrentPage(nextPage);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [remoteJid, currentPage, isLoadingMore, hasMore, initialLimit]);

  // Add a single message to the list without refetching
  const addMessage = useCallback((newMessage: any) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;

      // Check if message already exists
      const exists = prevData.data?.some((m: any) => m.id === newMessage.id);
      if (exists) return prevData;

      return {
        ...prevData,
        // Data comes from API sorted DESC (newest first), so we add to beginning
        // The component then reverses to show oldest first at top
        data: [newMessage, ...prevData.data],
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

  // Replace temp message ID with real message ID
  const replaceMessageId = useCallback((tempId: string, realId: string, status: string) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;
      return {
        ...prevData,
        data: prevData.data.map((m: any) =>
          m.id === tempId ? { ...m, id: realId, status } : m
        ),
      };
    });
  }, []);

  // Refetch when remoteJid changes
  useEffect(() => {
    if (remoteJid) {
      setIsLoading(true);
      setCurrentPage(1);
      setHasMore(true);
      api.getMessages(1, initialLimit, undefined, remoteJid)
        .then(result => {
          setData(result);
          setHasMore(result.pagination.page < result.pagination.totalPages);
        })
        .catch(err => setError(err instanceof Error ? err : new Error('An error occurred')))
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
      setCurrentPage(1);
      setHasMore(true);
    }
  }, [remoteJid, initialLimit]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
    addMessage,
    updateMessageStatus,
    replaceMessageId
  };
}
