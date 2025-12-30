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
