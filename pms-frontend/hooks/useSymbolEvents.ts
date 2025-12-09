import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

export interface SymbolEvent {
  id: string;
  code: string;
  post_date: string;
  timestamp: number;
  date: string;
  time: string;
  type: string;
  created_at: string;
  updated_at: string;
}

interface UseSymbolEventsOptions {
  symbol: string;
  limit?: number;
  enabled?: boolean;
}

async function fetchEventsAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const headers: Record<string, string> = {};
  
  if (OpenAPI.TOKEN) {
    headers['Authorization'] = `Bearer ${OpenAPI.TOKEN as unknown as string}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`Events API call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hook for fetching upcoming events for a specific symbol
 */
export function useSymbolEvents(options: UseSymbolEventsOptions) {
  const { symbol, limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.symbolEvents(symbol, limit),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<SymbolEvent[]> => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));

      const data = await fetchEventsAPI<SymbolEvent[]>(
        `/api/v1/upcoming-events/code/${symbol}?${params.toString()}`
      );
      
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
