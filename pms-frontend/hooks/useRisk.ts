import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';
import { RiskManagementService } from '../src/client';

// API call helper for risk endpoints
async function fetchRiskAPI<T>(endpoint: string): Promise<T> {
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

// Types for risk API responses
export interface RiskOverview {
  riskScore: number;
  activeAlerts: number;
  var95: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  trackingError: number;
}

export interface RiskMetrics {
  volatilityPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  var95Amt: number;
  cvar95Amt: number;
  beta: number;
  trackingErrorPct: number;
  trackingDifferencePct: number;
}

export interface RiskMetricsTimeseries {
  dates: string[];
  volatilityPct: number[];
  sharpe: number[];
  drawdownPct: number[];
  var95Amt: number[];
  beta: number[];
  trackingErrorPct: number[];
}

export interface SectorConcentrationItem {
  sector: string;
  weightPct: number;
  benchmarkWeightPct: number;
  deviationPct: number;
  trendPct: number;
  risk: 'low' | 'medium' | 'high';
}

export interface SectorConcentration {
  items: SectorConcentrationItem[];
  topNConcentrationPct: number;
}

export interface CorrelationPair {
  asset1: string;
  asset2: string;
  correlation: number;
  risk: 'low' | 'medium' | 'high';
}

export interface CorrelationAnalysis {
  avgCorrelation: number;
  pairs: CorrelationPair[];
  matrix?: number[][];
}

export interface StressTestScenario {
  key: string;
  label: string;
  portfolioImpactPct: number;
  details: {
    description?: string;
    startDate?: string;
    endDate?: string;
    method: string;
  };
}

export interface StressTests {
  scenarios: StressTestScenario[];
}

export interface RebalancingSuggestion {
  asset: string;
  currentWeight: number;
  targetWeight: number;
  differencePct: number;
  action: 'buy' | 'sell';
  amount: number;
}

export interface RebalancingRecommendations {
  suggestions: RebalancingSuggestion[];
}

// Hook for risk overview
export function useRiskOverview(
  portfolioId: string | null,
  period: string = '1Y',
  benchmarkId?: string
) {
  return useQuery({
    queryKey: queryKeys.riskOverview(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchRiskAPI<RiskOverview>(
        `/api/v1/risk/portfolios/${portfolioId}/overview?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for detailed risk metrics
export function useRiskMetrics(
  portfolioId: string | null,
  period: string = '1Y',
  benchmarkId?: string
) {
  return useQuery({
    queryKey: queryKeys.riskMetricsDetailed(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchRiskAPI<RiskMetrics>(
        `/api/v1/risk/portfolios/${portfolioId}/metrics?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for risk metrics timeseries
export function useRiskMetricsTimeseries(
  portfolioId: string | null,
  period: string = '1Y',
  benchmarkId?: string
) {
  return useQuery({
    queryKey: queryKeys.riskMetricsTimeseries(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchRiskAPI<RiskMetricsTimeseries>(
        `/api/v1/risk/portfolios/${portfolioId}/metrics/timeseries?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for sector concentration
export function useSectorConcentration(
  portfolioId: string | null,
  period: string = '1Y',
  benchmarkId?: string
) {
  return useQuery({
    queryKey: queryKeys.sectorConcentration(portfolioId || '', period, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams({ period });
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchRiskAPI<SectorConcentration>(
        `/api/v1/risk/portfolios/${portfolioId}/concentration/sector?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for correlation analysis
export function useCorrelationAnalysis(
  portfolioId: string | null,
  period: string = '1Y',
  top: number = 10
) {
  return useQuery({
    queryKey: queryKeys.correlationAnalysis(portfolioId || '', period, top),
    queryFn: () => {
      const params = new URLSearchParams({ period, top: top.toString() });
      return fetchRiskAPI<CorrelationAnalysis>(
        `/api/v1/risk/portfolios/${portfolioId}/correlation?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for stress tests
export function useStressTests(
  portfolioId: string | null,
  scenarios?: string[],
  benchmarkId?: string
) {
  return useQuery({
    queryKey: queryKeys.stressTests(portfolioId || '', scenarios, benchmarkId),
    queryFn: () => {
      const params = new URLSearchParams();
      if (scenarios && scenarios.length > 0) {
        params.append('scenarios', scenarios.join(','));
      }
      if (benchmarkId) params.append('benchmark_id', benchmarkId);
      return fetchRiskAPI<StressTests>(
        `/api/v1/risk/portfolios/${portfolioId}/stress-tests?${params.toString()}`
      );
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 10 * 60 * 1000, // 10 minutes - stress tests don't change often
  });
}

// Hook for risk alerts
export function useRiskAlerts(portfolioId?: string | null, isActive?: boolean) {
  return useQuery({
    queryKey: queryKeys.riskAlerts(portfolioId || undefined),
    queryFn: () => {
      const params = new URLSearchParams();
      if (portfolioId) params.append('portfolio_id', portfolioId);
      if (isActive !== undefined) params.append('is_active', isActive.toString());
      return RiskManagementService.getRiskAlerts({
        portfolioId: portfolioId || undefined,
        isActive,
      });
    },
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Hook for creating risk alert
export function useCreateRiskAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      portfolio_id?: string;
      alert_type: string;
      severity: string;
      message: string;
      metric_value?: number;
      threshold_value?: number;
    }) => {
      const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/risk/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : {}),
        },
        credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create alert: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riskAlerts() });
    },
  });
}

// Hook for updating/resolving risk alert
export function useUpdateRiskAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      alertId: string;
      is_active?: boolean;
      resolved_at?: string | null;
    }) => {
      const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/v1/risk/alerts/${data.alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : {}),
        },
        credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        body: JSON.stringify({
          is_active: data.is_active,
          resolved_at: data.resolved_at,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update alert: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riskAlerts() });
    },
  });
}

// Hook for rebalancing recommendations
export function useRebalancingRecommendations(
  portfolioId: string | null,
  targets?: Record<string, number>
) {
  return useQuery({
    queryKey: queryKeys.rebalancingRecommendations(portfolioId || '', targets),
    queryFn: () => {
      const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
      return fetch(`${baseUrl}/api/v1/risk/portfolios/${portfolioId}/rebalancing/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : {}),
        },
        credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        body: JSON.stringify(targets ? { targets } : {}),
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Failed to get recommendations: ${res.statusText}`);
        }
        return res.json();
      });
    },
    enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for user risk profile
export function useUserRiskProfile() {
  return useQuery({
    queryKey: queryKeys.userRiskProfile,
    queryFn: () => RiskManagementService.getUserRiskProfile(),
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

