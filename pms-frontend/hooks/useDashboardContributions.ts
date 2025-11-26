import { useQueries, useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { useMemo } from 'react';

// API call helper
async function fetchAttributionAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    return null as T;
  }

  return await response.json();
}

// Types
export interface ContributionData {
  symbol: string;
  pl: number;
}

export interface DecompositionData {
  start_value?: number;
  end_value?: number;
  realized?: number;
  realized_pnl?: number;
  realized_profit?: number;
  realized_gain?: number;
  realized_gains?: number;
  capital_gains_realized?: number;
  capital_gain_realized?: number;
  capital_realized?: number;
  components?: Array<{ type?: string; name?: string; value?: number; amount?: number }>;
  decomposition?: Array<{ type?: string; name?: string; value?: number; amount?: number }>;
}

// Hook for weekly attribution data
export function useWeeklyAttributionQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'security-attribution', '1W', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<any>(
          `/api/v1/portfolios/${portfolioId}/performance/attribution/securities?period=1W&limit=15`
        ),
    })),
  });
}

// Hook for monthly attribution data
export function useMonthlyAttributionQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'security-attribution', '1M', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<any>(
          `/api/v1/portfolios/${portfolioId}/performance/attribution/securities?period=1M&limit=20`
        ),
    })),
  });
}

// Hook for weekly valuation data
export function useWeeklyValuationQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'period-valuation', '1W', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<DecompositionData>(
          `/api/v1/portfolios/${portfolioId}/performance/valuation/period?period=1W`
        ),
    })),
  });
}

// Hook for monthly valuation data
export function useMonthlyValuationQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'period-valuation', '1M', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<DecompositionData>(
          `/api/v1/portfolios/${portfolioId}/performance/valuation/period?period=1M`
        ),
    })),
  });
}

// Hook for YTD decomposition
export function useYTDDecompositionQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'return-decomposition', 'YTD', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<DecompositionData>(
          `/api/v1/portfolios/${portfolioId}/performance/decomposition?period=YTD`
        ),
    })),
  });
}

// Hook for daily decomposition
export function useDailyDecompositionQueries(portfolioIds: string[]) {
  return useQueries({
    queries: portfolioIds.map((portfolioId) => ({
      queryKey: ['dashboard', 'return-decomposition', '1D', portfolioId],
      enabled: !!(OpenAPI as any).TOKEN,
      staleTime: 5 * 60 * 1000,
      queryFn: () =>
        fetchAttributionAPI<DecompositionData>(
          `/api/v1/portfolios/${portfolioId}/performance/decomposition?period=1D`
        ),
    })),
  });
}

// Helper to extract realized gains from decomposition data
function extractRealizedGains(data: DecompositionData | null): number {
  if (!data) return 0;

  const candidates = [
    data.realized,
    data.realized_pnl,
    data.realized_profit,
    data.realized_gain,
    data.realized_gains,
    data.capital_gains_realized,
    data.capital_gain_realized,
    data.capital_realized,
  ];

  let val = candidates.find((v: any) => typeof v === 'number');
  if (typeof val !== 'number') {
    const comp = Array.isArray(data.components) ? data.components : Array.isArray(data.decomposition) ? data.decomposition : [];
    if (comp.length) {
      let s = 0;
      comp.forEach((c: any) => {
        const key = String((c as any).type || (c as any).name || '').toLowerCase();
        if (key.includes('realized') || (key.includes('capital') && key.includes('gain') && key.includes('realized'))) {
          s += Number((c as any).value || (c as any).amount || 0);
        }
      });
      val = s;
    } else {
      val = 0;
    }
  }
  return Number(val || 0);
}

// Hook for calculated realized gains YTD
export function useCalculatedRealizedYTD(decompositionQueries: any[]) {
  return useMemo(() => {
    let total = 0;
    decompositionQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      total += extractRealizedGains(data);
    });
    return total;
  }, [decompositionQueries]);
}

// Hook for calculated realized gains today
export function useCalculatedRealizedToday(decompositionQueries: any[]) {
  return useMemo(() => {
    let total = 0;
    decompositionQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      total += extractRealizedGains(data);
    });
    return total;
  }, [decompositionQueries]);
}

// Hook for weekly P/L totals
export function useWeeklyPLTotal(valuationQueries: any[]) {
  return useMemo(() => {
    let startSum = 0;
    let endSum = 0;
    valuationQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      if (!data) return;
      startSum += Number(data.start_value || 0);
      endSum += Number(data.end_value || 0);
    });
    return endSum - startSum;
  }, [valuationQueries]);
}

// Hook for monthly P/L totals
export function useMonthlyPLTotal(valuationQueries: any[]) {
  return useMemo(() => {
    let startSum = 0;
    let endSum = 0;
    valuationQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      if (!data) return;
      startSum += Number(data.start_value || 0);
      endSum += Number(data.end_value || 0);
    });
    return endSum - startSum;
  }, [valuationQueries]);
}

// Hook for weekly P/L percentage
export function useWeeklyPLPercent(weeklyPLTotal: number, valuationQueries: any[]) {
  return useMemo(() => {
    let startSum = 0;
    valuationQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      if (!data) return;
      startSum += Number(data.start_value || 0);
    });
    const base = Math.max(1, startSum);
    return (Number(weeklyPLTotal || 0) / base) * 100;
  }, [weeklyPLTotal, valuationQueries]);
}

// Hook for monthly P/L percentage
export function useMonthlyPLPercent(monthlyPLTotal: number, valuationQueries: any[]) {
  return useMemo(() => {
    let startSum = 0;
    valuationQueries.forEach((q) => {
      const data = q.data as DecompositionData;
      if (!data) return;
      startSum += Number(data.start_value || 0);
    });
    const base = Math.max(1, startSum);
    return (Number(monthlyPLTotal || 0) / base) * 100;
  }, [monthlyPLTotal, valuationQueries]);
}
