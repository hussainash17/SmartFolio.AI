import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

// API call helper
async function fetchMarketAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`Market API call failed: ${response.statusText}`);
  }

  return await response.json();
}

// Types
export interface BenchmarkData {
  close_value?: number;
  daily_return?: number;
  change?: number;
  trades?: number;
  total_value?: number;
  volume?: number;
}

export interface TopMovers {
  gainers?: Array<{ symbol: string; change_percent: number }>;
  losers?: Array<{ symbol: string; change_percent: number }>;
}

export interface MarketIndices {
  DSEX?: { change_percent: number };
}

export interface SectorAnalysis {
  sectors?: Array<{
    sector?: string;
    name?: string;
    performance?: Record<string, number>;
    change_percent?: number;
    change?: number;
    market_cap_weight?: number;
  }>;
}

export interface MostActive {
  symbol: string;
  volume: number;
}

// Hook for market indices
export function useMarketIndices() {
  return useQuery({
    queryKey: queryKeys.indices,
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<MarketIndices>('/api/v1/market/indices'),
  });
}

// Hook for benchmark data (DSEX)
export function useBenchmarkData() {
  return useQuery({
    queryKey: ['market', 'benchmark', 'DSEX'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<BenchmarkData>('/api/v1/market/benchmark/DSEX'),
  });
}

// Hook for top movers
export function useMarketTopMovers() {
  return useQuery({
    queryKey: ['market', 'top-movers'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<TopMovers>('/api/v1/market/top-movers?limit=5'),
  });
}

// Hook for most active stocks
export function useMarketMostActive() {
  return useQuery({
    queryKey: queryKeys.mostActive,
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<MostActive[]>('/api/v1/market/most-active?limit=5'),
  });
}

// Hook for sector analysis
export function useSectorAnalysis() {
  return useQuery({
    queryKey: queryKeys.sectorAnalysis,
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchMarketAPI<SectorAnalysis>('/api/v1/research/market/sectors'),
  });
}

// Hook for market summary
export function useMarketSummary() {
  return useQuery({
    queryKey: ['market', 'summary'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<any>('/api/v1/market/summary'),
  });
}
