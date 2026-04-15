import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

// Types based on backend API responses
export interface MarketSummaryData {
  trading_code: string;
  company_name: string;
  sector?: string;
  category?: string;
  ltp?: string;
  ltp_change?: string;
  ycp?: string;
  current_pe?: string;
  audited_pe?: string;
  dividend_yield?: string;
  nav?: string | null;
  face_value?: string;
  market_cap?: string;
  paid_up_capital?: string;
  authorized_capital?: string;
  reserve_and_surplus?: string;
  year_end?: string;
  last_agm?: string | null;
  week_52_range?: {
    low: string | null;
    high: string | null;
  };
  volume?: number;
  total_shares?: number;
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

export interface ComprehensiveStockDetails {
  trading_code: string;
  company_name: string;
  sector: string;
  category: string;
  current_price?: number;
  price_change?: number;
  price_change_percent?: number;
  valuation_label: string;
  pe?: number;
  industry_pe?: number;
  pb?: number;
  dividend_yield?: number;
  roe?: number;
  debt_to_equity?: number;
  interest_coverage?: number;
  cash_position?: number;
  operating_cash_flow?: number;
  health_score: number;
  quarterly_eps: Array<{ quarter: string; eps: number; isPositive: boolean }>;
  nav_trend: Array<{ year: string; nav: number }>;
  dividend_history: Array<{ year: string; amount: number }>;
  payout_ratio?: number;
  industry_yield?: number;
  foreign_participation?: number;
  promoter_pledge?: number;
  shareholding: Array<{ name: string; value: number; color: string }>;
  risks: Array<{ label: string; status: 'good' | 'warning' | 'bad'; description: string }>;
  peers: Array<{ symbol: string; price?: number; pe?: number; pb?: number; div_yield?: number; roe?: number }>;
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
      try {
        const apiResponse = await fetchFundamentalsAPI<{
          quarters?: Array<{
            quarter: string;
            prev_year_eps?: string | number | null;
            current_year_eps?: string | number | null;
            growth_percent?: string | number | null;
            period: string;
          }>;
          annual?: {
            prev_year_eps?: string | number | null;
            current_year_eps?: string | number | null;
            profit_million?: string | number | null;
            growth_percent?: string | number | null;
          };
        }>(`/api/v1/fundamentals/earnings/${symbol}`);

        if (!apiResponse) return null;

        console.log('Raw API Response:', apiResponse);

        // Transform quarters data
        const quarterly_eps = apiResponse.quarters?.map((q) => {
          // Extract year from period (e.g., "Jan 2024" -> 2024)
          const yearMatch = q.period.match(/\d{4}/);
          const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

          return {
            quarter: q.quarter,
            year,
            eps: q.current_year_eps ? Number(q.current_year_eps) : 0,
            growth_percent: q.growth_percent ? Number(q.growth_percent) : undefined,
          };
        }) || [];

        console.log('Transformed quarterly_eps:', quarterly_eps);

        // Transform annual data
        // The API returns annual as a single object with current and previous year EPS
        // We need to transform it into an array format
        const annual_profit: Array<{
          year: number;
          profit: number;
          eps: number;
          growth_percent?: number;
        }> = [];

        if (apiResponse.annual) {
          // Extract years from quarterly data if available, otherwise use current year
          const yearsFromQuarters = new Set<number>();
          apiResponse.quarters?.forEach(q => {
            const yearMatch = q.period.match(/\d{4}/);
            if (yearMatch) {
              yearsFromQuarters.add(parseInt(yearMatch[0]));
            }
          });

          const years = yearsFromQuarters.size > 0
            ? Array.from(yearsFromQuarters).sort((a, b) => b - a) // Sort descending
            : [new Date().getFullYear(), new Date().getFullYear() - 1];

          // Add current year data
          if (apiResponse.annual.current_year_eps !== null && apiResponse.annual.current_year_eps !== undefined) {
            annual_profit.push({
              year: years[0] || new Date().getFullYear(),
              profit: apiResponse.annual.profit_million ? Number(apiResponse.annual.profit_million) : 0,
              eps: Number(apiResponse.annual.current_year_eps),
              growth_percent: apiResponse.annual.growth_percent ? Number(apiResponse.annual.growth_percent) : undefined,
            });
          }

          // Add previous year data if available
          if (apiResponse.annual.prev_year_eps !== null && apiResponse.annual.prev_year_eps !== undefined) {
            annual_profit.push({
              year: years[1] || (years[0] ? years[0] - 1 : new Date().getFullYear() - 1),
              profit: 0, // Previous year profit not available in API response
              eps: Number(apiResponse.annual.prev_year_eps),
              growth_percent: undefined,
            });
          }
        }

        console.log('Transformed annual_profit:', annual_profit);

        const result = {
          trading_code: symbol,
          quarterly_eps,
          annual_profit,
        };

        console.log('Final transformed result:', result);

        return result;
      } catch (error) {
        console.error('Error transforming earnings data:', error);
        return null;
      }
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

/**
 * Hook for fetching comprehensive stock details for the StockDetails component
 */
export function useComprehensiveStockDetails(options: UseSymbolFundamentalsOptions) {
  const { symbol, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.fundamentalComprehensive(symbol),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<ComprehensiveStockDetails | null> => {
      try {
        const data = await fetchFundamentalsAPI<ComprehensiveStockDetails>(
          `/api/v1/fundamentals/comprehensive/${symbol}`
        );
        return data;
      } catch (error) {
        console.error('Error fetching comprehensive details:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
