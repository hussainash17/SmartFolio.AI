import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

// Types based on backend API responses
export interface MarketSummaryData {
  trading_code: string;
  company_name: string;
  sector?: string;
  category?: string;
  ltp?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  eps?: number;
  nav?: number;
  dividend_yield?: number;
  face_value?: number;
  week_52_high?: number;
  week_52_low?: number;
  paid_up_capital?: number;
  authorized_capital?: number;
  total_shares?: number;
  last_agm_date?: string;
  year_end?: string;
}

export interface EarningsData {
  trading_code: string;
  quarterly_eps?: Array<{
    quarter: string;
    year: number;
    eps: number;
    growth_percent?: number;
  }>;
  annual_profit?: Array<{
    year: number;
    profit: number;
    eps: number;
    growth_percent?: number;
  }>;
}

export interface FinancialHealthData {
  trading_code: string;
  short_term_loan?: number;
  long_term_loan?: number;
  total_debt?: number;
  reserve_and_surplus?: number;
  debt_status?: string;
  remarks?: string;
}

export interface DividendData {
  year: number;
  cash_dividend?: number;
  stock_dividend?: number;
  dividend_yield?: number;
}

interface UseSymbolFundamentalsOptions {
  symbol: string;
  enabled?: boolean;
}

async function fetchFundamentalsAPI<T>(endpoint: string): Promise<T> {
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
    // Return null instead of throwing for 404s (data might not exist)
    if (response.status === 404) {
      return null as T;
    }
    throw new Error(`Fundamentals API call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hook for fetching market summary/valuation metrics for a symbol
 */
export function useSymbolMarketSummary(options: UseSymbolFundamentalsOptions) {
  const { symbol, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.fundamentalMarketSummary(symbol),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<MarketSummaryData | null> => {
      return fetchFundamentalsAPI<MarketSummaryData>(
        `/api/v1/fundamentals/market-summary/${symbol}`
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching earnings/profit data for a symbol
 */
export function useSymbolEarnings(options: UseSymbolFundamentalsOptions) {
  const { symbol, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.fundamentalEarnings(symbol),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<EarningsData | null> => {
      return fetchFundamentalsAPI<EarningsData>(
        `/api/v1/fundamentals/earnings/${symbol}`
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching financial health data for a symbol
 */
export function useSymbolFinancialHealth(options: UseSymbolFundamentalsOptions) {
  const { symbol, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.fundamentalFinancialHealth(symbol),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<FinancialHealthData | null> => {
      return fetchFundamentalsAPI<FinancialHealthData>(
        `/api/v1/fundamentals/financial-health/${symbol}`
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching dividend history for a symbol
 */
export function useSymbolDividends(options: UseSymbolFundamentalsOptions & { limit?: number }) {
  const { symbol, limit = 5, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.fundamentalDividends(symbol, limit),
    enabled: enabled && !!symbol,
    queryFn: async (): Promise<DividendData[]> => {
      const data = await fetchFundamentalsAPI<DividendData[]>(
        `/api/v1/fundamentals/dividends/${symbol}?limit=${limit}`
      );
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
