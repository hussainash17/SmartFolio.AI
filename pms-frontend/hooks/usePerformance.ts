import { useQuery } from '@tanstack/react-query';
import { OpenAPI, AnalyticsService } from '../src/client';
import { queryKeys } from './queryKeys';

// ============================================================================
// NEW SPLIT API TYPES (Optimized)
// ============================================================================

export interface CurrentValueResponse {
  portfolio_id: string;
  portfolio_name: string;
  current_value: number;
  as_of_date: string;
}

export interface ReturnsResponse {
  portfolio_id: string;
  period: string;
  time_weighted_return: number;
  money_weighted_return: number;
  annualized_return: number;
  days: number;
}

export interface RiskMetricsResponse {
  portfolio_id: string;
  period: string;
  volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
}

export interface BestWorstResponse {
  portfolio_id: string;
  period: string;
  best_month: { period: string; return: number };
  worst_month: { period: string; return: number };
}

export interface CashFlowsResponse {
  portfolio_id: string;
  period: string;
  net_contributions: number;
  net_withdrawals: number;
  net_flow: number;
}

// ============================================================================
// LEGACY TYPES (Kept for backward compatibility)
// ============================================================================

export interface PerformanceSummary {
  portfolio_id: string;
  portfolio_name: string;
  period: string;
  summary: {
    total_value: number;
    total_cost: number;
    cumulative_return: number;
    cumulative_return_percent: number;
    time_weighted_return: number;
    money_weighted_return: number;
    annualized_return: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    max_drawdown: number;
    volatility: number;
    best_month: { period: string; return: number };
    worst_month: { period: string; return: number };
    best_quarter: { period: string; return: number } | null;
    worst_quarter: { period: string; return: number } | null;
    net_contributions: number;
    net_withdrawals: number;
    inception_date: string;
    days_since_inception: number;
  };
}

export interface ValueHistoryPoint {
  date: string;
  portfolio_value: number;
  portfolio_return: number;
  portfolio_cumulative_return: number;
  benchmark_value?: number;
  benchmark_return?: number;
  benchmark_cumulative_return?: number;
  relative_return?: number;
  alpha?: number;
}

export interface ValueHistoryResponse {
  portfolio_id: string;
  benchmark_id?: string;
  benchmark_name?: string;
  frequency: string;
  data: ValueHistoryPoint[];
}

export interface BenchmarkComparisonPeriod {
  period: string;
  portfolio_return: number;
  benchmark_return: number;
  relative_return: number;
  alpha: number;
  beta?: number;
  tracking_error?: number;
  information_ratio?: number;
}

export interface BenchmarkComparisonResponse {
  portfolio_id: string;
  benchmark_id: string;
  benchmark_name: string;
  comparison: BenchmarkComparisonPeriod[];
}

export interface Benchmark {
  id: string;
  name: string;
  ticker: string;
  description?: string;
  asset_class?: string;
  region?: string;
  data_source?: string;
  is_active: boolean;
  created_at: string;
}

export interface BenchmarkListResponse {
  benchmarks: Benchmark[];
}

export interface MonthlyReturn {
  month: string;
  month_number: number;
  return_value: number;
  portfolio_value_start: number;
  portfolio_value_end: number;
  benchmark_return?: number;
}

export interface MonthlyReturnsResponse {
  portfolio_id: string;
  year: number;
  monthly_returns: MonthlyReturn[];
  ytd_return: number;
  best_month: { month: string; return: number };
  worst_month: { month: string; return: number };
  positive_months: number;
  negative_months: number;
}

export interface SecurityContribution {
  symbol: string;
  name: string;
  contribution: number;
  return: number;
  weight: number;
}

export interface SecurityAttributionResponse {
  portfolio_id: string;
  period: string;
  top_contributors: SecurityContribution[];
  top_detractors: SecurityContribution[];
}

export interface SectorAttribution {
  sector: string;
  weight: number;
  benchmark_weight: number;
  return: number;
  benchmark_return: number;
  contribution: number;
  allocation_effect: number;
  selection_effect: number;
}

export interface AttributionResponse {
  portfolio_id: string;
  period: string;
  attribution: SectorAttribution[];
}

export interface RiskMetrics {
  volatility: {
    annualized: number;
    daily: number;
  };
  downside_deviation: number;
  max_drawdown: {
    max_drawdown_percent: number;
    max_drawdown_amount?: number;
    peak_date?: string;
    trough_date?: string;
    recovery_date?: string;
    duration_days?: number;
  };
  value_at_risk: {
    var_95: number;
    var_99: number;
    cvar_95: number;
    cvar_99: number;
  };
  beta: number;
  correlation: number;
  r_squared: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  information_ratio: number;
  treynor_ratio: number;
}

export interface RiskMetricsResponse {
  portfolio_id: string;
  period: string;
  risk_metrics: RiskMetrics;
}

// API call helper
async function fetchPerformanceAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return await response.json();
}

// Hook for performance summary
export function usePerformanceSummary(portfolioId: string | null, period: string = 'YTD') {
  return useQuery({
    queryKey: queryKeys.performanceSummary(portfolioId || '', period),
    queryFn: () => fetchPerformanceAPI<PerformanceSummary>(
      `/api/v1/portfolios/${portfolioId}/performance/summary?period=${period}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for value history
export function useValueHistory(
  portfolioId: string | null,
  period: string = 'YTD',
  benchmarkId?: string,
  frequency: string = 'daily'
) {
  return useQuery({
    queryKey: queryKeys.valueHistory(portfolioId || '', period, benchmarkId, frequency),
    queryFn: () => {
      const params = new URLSearchParams({ period, frequency });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchPerformanceAPI<ValueHistoryResponse>(
        `/api/v1/portfolios/${portfolioId}/performance/value-history?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for benchmark comparison
export function useBenchmarkComparison(portfolioId: string | null, benchmarkId: string = 'DSEX') {
  return useQuery({
    queryKey: queryKeys.benchmarkComparison(portfolioId || '', benchmarkId),
    queryFn: () => fetchPerformanceAPI<BenchmarkComparisonResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/benchmark-comparison?benchmark_id=${benchmarkId}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for available benchmarks
export function useAvailableBenchmarks() {
  return useQuery({
    queryKey: queryKeys.benchmarks,
    queryFn: () => fetchPerformanceAPI<BenchmarkListResponse>('/api/v1/benchmarks'),
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for monthly returns
export function useMonthlyReturns(portfolioId: string | null, year?: number) {
  return useQuery({
    queryKey: queryKeys.monthlyReturns(portfolioId || '', year),
    queryFn: () => {
      const params = year ? `?year=${year}` : '';
      return fetchPerformanceAPI<MonthlyReturnsResponse>(
        `/api/v1/portfolios/${portfolioId}/performance/monthly-returns${params}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for security attribution (top contributors/detractors)
export function useSecurityAttribution(portfolioId: string | null, period: string = 'YTD', limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.securityAttribution(portfolioId || '', period, limit),
    queryFn: () => fetchPerformanceAPI<SecurityAttributionResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/attribution/securities?period=${period}&limit=${limit}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for sector attribution
export function useSectorAttribution(portfolioId: string | null, period: string = 'YTD', benchmarkId?: string) {
  return useQuery({
    queryKey: queryKeys.sectorAttribution(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchPerformanceAPI<AttributionResponse>(
        `/api/v1/portfolios/${portfolioId}/performance/attribution/sector?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for risk metrics (DEPRECATED - use usePerformanceRiskMetrics instead)
export function useRiskMetrics(portfolioId: string | null, period: string = 'YTD', benchmarkId?: string) {
  return useQuery({
    queryKey: queryKeys.riskMetrics(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchPerformanceAPI<RiskMetricsResponse>(
        `/api/v1/portfolios/${portfolioId}/performance/risk-metrics?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// NEW OPTIMIZED SPLIT API HOOKS
// ============================================================================

// Hook for current portfolio value (ULTRA FAST: 5-15ms)
export function useCurrentValue(portfolioId: string | null) {
  return useQuery({
    queryKey: queryKeys.currentValue(portfolioId || ''),
    queryFn: () => fetchPerformanceAPI<CurrentValueResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/current-value`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 60 * 1000, // 1 minute - refresh frequently for current value
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

// Hook for return metrics (FAST: 20-50ms)
export function usePerformanceReturns(portfolioId: string | null, period: string = 'YTD') {
  return useQuery({
    queryKey: queryKeys.performanceReturns(portfolioId || '', period),
    queryFn: () => fetchPerformanceAPI<ReturnsResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/returns?period=${period}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for risk metrics (FAST: 30-60ms)
export function usePerformanceRiskMetrics(portfolioId: string | null, period: string = 'YTD') {
  return useQuery({
    queryKey: queryKeys.performanceRisk(portfolioId || '', period),
    queryFn: () => fetchPerformanceAPI<RiskMetricsResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/risk-metrics?period=${period}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for best/worst periods (FAST: 25-40ms)
export function useBestWorstPeriods(portfolioId: string | null, period: string = 'YTD') {
  return useQuery({
    queryKey: queryKeys.bestWorst(portfolioId || '', period),
    queryFn: () => fetchPerformanceAPI<BestWorstResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/best-worst?period=${period}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for cash flows (FAST: 15-30ms)
export function useCashFlows(portfolioId: string | null, period: string = 'YTD') {
  return useQuery({
    queryKey: queryKeys.cashFlows(portfolioId || '', period),
    queryFn: () => fetchPerformanceAPI<CashFlowsResponse>(
      `/api/v1/portfolios/${portfolioId}/performance/cash-flows?period=${period}`
    ),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// ANALYTICS API HOOKS (Legacy but still useful)
// ============================================================================

// Hook for comprehensive portfolio performance (from analytics API)
export function useAnalyticsPortfolioPerformance(portfolioId: string | null, period: string = '1Y') {
  return useQuery({
    queryKey: ['analytics', 'performance', portfolioId || '', period],
    queryFn: () => AnalyticsService.getPortfolioPerformance({ 
      portfolioId: portfolioId!, 
      period 
    }),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (portfolio not found)
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook for analytics benchmark comparison
export function useAnalyticsBenchmarkComparison(
  portfolioId: string | null, 
  benchmark: string = 'DSEX', 
  period: string = '1Y'
) {
  return useQuery({
    queryKey: ['analytics', 'benchmark-comparison', portfolioId || '', benchmark, period],
    queryFn: () => AnalyticsService.getBenchmarkComparison({ 
      portfolioId: portfolioId!, 
      benchmark,
      period 
    }),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook for dividend analysis
export function useDividendAnalysis(portfolioId: string | null) {
  return useQuery({
    queryKey: ['analytics', 'dividend-analysis', portfolioId || ''],
    queryFn: () => AnalyticsService.getDividendAnalysis({ 
      portfolioId: portfolioId! 
    }),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 10 * 60 * 1000, // 10 minutes - dividend data doesn't change frequently
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

// Hook for cost basis analysis
export function useCostBasisAnalysis(portfolioId: string | null) {
  return useQuery({
    queryKey: ['analytics', 'cost-basis', portfolioId || ''],
    queryFn: () => AnalyticsService.getCostBasisAnalysis({ 
      portfolioId: portfolioId! 
    }),
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}
