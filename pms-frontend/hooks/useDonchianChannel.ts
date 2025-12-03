import { useQuery, useQueries } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';
import { DonchianChannelData } from '../types/technical';

// API call helper
async function fetchDonchianChannel(symbol: string, periods: string = "5,10,20"): Promise<DonchianChannelData> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/v1/analytics/donchian-channel/${symbol}?periods=${periods}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Symbol '${symbol}' not found`);
    }
    if (response.status === 400) {
      throw new Error(`Insufficient data for symbol '${symbol}'`);
    }
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hook to fetch Donchian Channel data for a single symbol
 * @param symbol Stock trading code/symbol
 * @param periods Comma-separated periods (default: "5,10,20")
 */
export function useDonchianChannel(symbol: string | undefined, periods: string = "5,10,20") {
  return useQuery({
    queryKey: queryKeys.donchianChannel(symbol || '', periods),
    queryFn: () => fetchDonchianChannel(symbol!, periods),
    enabled: !!symbol && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes (backend caches daily)
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to fetch Donchian Channel data for multiple symbols in parallel
 * Returns a map keyed by symbol for O(1) lookup
 * @param symbols Array of stock symbols
 * @param periods Comma-separated periods (default: "5,10,20")
 */
export function useDonchianChannelsBatch(symbols: string[], periods: string = "5,10,20") {
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: queryKeys.donchianChannel(symbol, periods),
      queryFn: () => fetchDonchianChannel(symbol, periods),
      enabled: !!symbol && !!(OpenAPI as any).TOKEN && symbols.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    })),
  });

  // Create a map of symbol -> data for easy lookup
  const dataMap = new Map<string, DonchianChannelData>();
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  queries.forEach((query, index) => {
    if (query.data && symbols[index]) {
      dataMap.set(symbols[index], query.data);
    }
  });

  return {
    dataMap,
    isLoading,
    isError,
    queries, // Expose individual queries for more detailed error handling
  };
}

