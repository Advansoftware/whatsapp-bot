"use client";

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  dashboardApi,
  connectionsApi,
  messagesApi,
  contactsApi,
  aiSecretaryApi,
  campaignsApi,
  chatbotApi,
  productsApi,
  authApi
} from '@/lib/api';
import { useState, useCallback, useEffect } from 'react';

// Query Keys
export const queryKeys = {
  dashboardStats: ['dashboard', 'stats'] as const,
  dashboardActivity: ['dashboard', 'activity'] as const,
  connections: ['connections'] as const,
  conversations: ['conversations'] as const,
  messages: (remoteJid: string) => ['messages', remoteJid] as const,
  contacts: (params?: object) => ['contacts', params] as const,
  contactDetails: (id: string) => ['contacts', id] as const,
  campaigns: ['campaigns'] as const,
  aiConfig: ['ai-secretary', 'config'] as const,
  aiStats: ['ai-secretary', 'stats'] as const,
  chatbotFlows: ['chatbot', 'flows'] as const,
  products: ['products'] as const,
};

// Dashboard Hooks
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: () => dashboardApi.getStats(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: queryKeys.dashboardActivity,
    queryFn: () => dashboardApi.getActivity(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// Connections Hooks
export function useConnections() {
  return useQuery({
    queryKey: queryKeys.connections,
    queryFn: () => connectionsApi.getAll(),
  });
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => connectionsApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
    },
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => connectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections });
    },
  });
}

// Messages/Conversations Hooks
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
      const result = await messagesApi.getRecentConversations(1, initialLimit);
      setData(result.data || result);
      setHasMore(result.pagination ? result.pagination.page < result.pagination.totalPages : false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const result = await messagesApi.getRecentConversations(nextPage, initialLimit);
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

  const updateConversation = useCallback((remoteJid: string, lastMessage: string, timestamp: string) => {
    setData((prevData) => {
      const index = prevData.findIndex((c: any) => c.remoteJid === remoteJid);
      if (index === -1) return prevData;

      const updated = {
        ...prevData[index],
        lastMessage,
        timestamp,
      };

      const filtered = prevData.filter((_, i) => i !== index);
      return [updated, ...filtered];
    });
  }, []);

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
      const result = await messagesApi.getMessages({ page: 1, limit: initialLimit, remoteJid });
      setData(result);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [remoteJid, initialLimit]);

  const loadMore = useCallback(async () => {
    if (!remoteJid || isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const result = await messagesApi.getMessages({ page: nextPage, limit: initialLimit, remoteJid });

      setData((prevData: any) => {
        if (!prevData) return result;

        const existingIds = new Set(prevData.data.map((m: any) => m.id));
        const newMessages = result.data.filter((m: any) => !existingIds.has(m.id));

        return {
          ...prevData,
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

  const addMessage = useCallback((newMessage: any) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;

      const exists = prevData.data?.some((m: any) => m.id === newMessage.id);
      if (exists) return prevData;

      return {
        ...prevData,
        data: [newMessage, ...prevData.data],
        pagination: {
          ...prevData.pagination,
          total: prevData.pagination.total + 1,
        },
      };
    });
  }, []);

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

  const replaceMessageId = useCallback((tempId: string, realId: string, status: string) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;

      const realIdExists = prevData.data.some((m: any) => m.id === realId);

      if (realIdExists) {
        return {
          ...prevData,
          data: prevData.data.filter((m: any) => m.id !== tempId),
        };
      }

      return {
        ...prevData,
        data: prevData.data.map((m: any) =>
          m.id === tempId ? { ...m, id: realId, status } : m
        ),
      };
    });
  }, []);

  useEffect(() => {
    if (remoteJid) {
      setIsLoading(true);
      setCurrentPage(1);
      setHasMore(true);
      messagesApi.getMessages({ page: 1, limit: initialLimit, remoteJid })
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

// CRM Contacts Hooks
export function useCRMContacts(params?: { page?: number; limit?: number; q?: string; tag?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.contacts(params),
    queryFn: () => contactsApi.getAll(params || {}),
  });
}

export function useContactDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.contactDetails(id),
    queryFn: () => contactsApi.getById(id),
    enabled: !!id,
  });
}

// AI Secretary Hooks
export function useAISecretaryConfig() {
  return useQuery({
    queryKey: queryKeys.aiConfig,
    queryFn: () => aiSecretaryApi.getConfig(),
  });
}

export function useAIStats() {
  return useQuery({
    queryKey: queryKeys.aiStats,
    queryFn: () => aiSecretaryApi.getStats(),
  });
}

// Campaigns Hooks
export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.campaigns,
    queryFn: () => campaignsApi.getAll(),
  });
}

// Chatbot Hooks
export function useChatbotFlows() {
  return useQuery({
    queryKey: queryKeys.chatbotFlows,
    queryFn: () => chatbotApi.getFlows(),
  });
}

// Products Hooks
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: () => productsApi.getAll(),
  });
}

// Legacy hook for backwards compatibility
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

// Legacy hooks for backwards compatibility
export function useMessages(page = 1, limit = 20, instanceId?: string) {
  return useApi(() => messagesApi.getMessages({ page, limit, instanceId }));
}
