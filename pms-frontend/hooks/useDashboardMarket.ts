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

export interface IndexData {
  level?: number | null;
  change?: number | null;
  change_percent?: number | null;
  series?: Array<{ t: string | Date; v: number }>;
}

export interface MarketIndices {
  DSEX?: IndexData;
  DS30?: IndexData;
  DSES?: IndexData;
  CSE?: IndexData;
}

export interface SectorAnalysis {
  total_sectors?: number;
  sectors?: Array<{
    sector?: string;
    name?: string;
    stock_count?: number;
    performance?: number;
    market_cap?: number;
    turnover?: number;
    pe_ratio?: number;
    gainers?: number;
    losers?: number;
    unchanged?: number;
    momentum?: string;
    change_percent?: number; // Keep for backward compatibility
    change?: number;
    market_cap_weight?: number;
  }>;
  market_summary?: {
    best_performing_sector?: string;
    worst_performing_sector?: string;
    avg_sector_performance?: number;
  };
}

export interface MostActive {
  symbol: string;
  company_name: string;
  last: number;
  change: number;
  change_percent: number;
  volume: number;
  turnover: number;
}

export interface MostVolatile {
  symbol: string;
  true_range_pct: number;
  change_percent: number;
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
    queryFn: () => fetchMarketAPI<MostActive[]>('/api/v1/market/most-active?limit=10'),
  });
}

// Hook for most volatile stocks
export function useMarketMostVolatile() {
  return useQuery({
    queryKey: ['market', 'most-volatile'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<MostVolatile[]>('/api/v1/market/most-volatile?limit=5&min_trades=100&min_volume=10000'),
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

// Types for sector analysis charts
export interface SectorAdvancesDeclines {
  name: string;
  up: number;
  down: number;
  unchanged: number;
}

export interface SectorTurnover {
  name: string;
  value: number;
}

export interface SectorAnalysisCharts {
  advances_declines: SectorAdvancesDeclines[];
  turnover: SectorTurnover[];
}

// Hook for sector analysis charts (Advances/Declines and Turnover)
export function useSectorAnalysisCharts() {
  return useQuery({
    queryKey: ['market', 'sector-analysis-charts'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<SectorAnalysisCharts>('/api/v1/market/sector-analysis'),
  });
}

// Market Summary interface
export interface MarketSummary {
  id?: string;
  date?: string;
  total_trades?: number;
  total_volume?: number;
  total_turnover?: string;
  dse_index?: string;
  dse_index_change?: string;
  dse_index_change_percent?: string;
  cse_index?: string;
  cse_index_change?: string;
  cse_index_change_percent?: string;
  advancers?: number;
  decliners?: number;
  unchanged?: number;
  timestamp?: string;
  // Calculated breadth metrics
  ad_ratio?: number;
  net_breadth?: number;
  total_active?: number;
  sentiment?: string;
  // Volume breadth
  volume_breadth_up?: number;
  volume_breadth_down?: number;
  // Change percentages from previous day
  turnover_change_percent?: number;
  volume_change_percent?: number;
  trades_change_percent?: number;
}

// Hook for market summary
export function useMarketSummary() {
  return useQuery({
    queryKey: ['market', 'summary'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<MarketSummary>('/api/v1/market/summary'),
  });
}

// Types for benchmark last 5 days
export interface BenchmarkLast5Days {
  benchmark_id: string;
  data: Array<{
    date: string;
    value_in_crore: number;
  }>;
}

// Hook for last 5 days of benchmark data
export function useBenchmarkLast5Days(benchmarkId: string = 'DSEX') {
  return useQuery({
    queryKey: ['market', 'benchmark', benchmarkId, 'last-5-days'],
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000,
    queryFn: () => fetchMarketAPI<BenchmarkLast5Days>(`/api/v1/market/benchmark/${benchmarkId}/last-5-days`),
  });
}
