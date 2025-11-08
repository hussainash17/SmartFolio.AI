import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { queryKeys } from './queryKeys';
import { OpenAPI } from '../src/client';
import { request as __request } from '../src/client/core/request';
import type { ApiRequestOptions } from '../src/client/core/ApiRequestOptions';
import type {
  ExecuteRebalancingRequest,
  ExecuteRebalancingResult,
  RebalancingHistory,
  RebalancingRun,
  RebalancingSettings,
  RebalancingSuggestion,
  RebalancingSuggestionsResponse,
  RebalancingSuggestionsSummary,
  RebalancingTradeSummary,
} from '../types/rebalancing';

type RawSettings = {
  id: string;
  user_id: string;
  portfolio_id: string;
  enabled: boolean;
  threshold_pct: string | number;
  frequency: string;
  min_trade_value: string | number;
  last_rebalance_at?: string | null;
  next_rebalance_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type RawSuggestion = {
  symbol: string;
  company_name: string;
  sector: string;
  action: 'BUY' | 'SELL';
  current_allocation: string | number;
  target_allocation: string | number;
  deviation: string | number;
  suggested_shares: number;
  suggested_value: string | number;
  current_value: string | number;
  priority: 'high' | 'medium' | 'low';
};

type RawSuggestionsResponse = {
  portfolio_id: string;
  threshold_pct: string | number;
  min_trade_value: string | number;
  suggestions: RawSuggestion[];
  totals: Record<string, string | number>;
};

type RawTrade = {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: string | number;
  value: string | number;
};

type RawRun = {
  id: string;
  portfolio_id: string;
  type: string;
  drift_before: string | number;
  drift_after: string | number;
  trades_count: number;
  buy_value: string | number;
  sell_value: string | number;
  transaction_cost: string | number;
  notes?: string | null;
  executed_at: string;
  trades?: RawTrade[];
};

type RawHistory = {
  portfolio_id: string;
  runs: RawRun[];
  total_runs: number;
};

type RawExecuteResponse = {
  run_id: string;
  executed_at: string;
  trades: RawTrade[];
  buy_value: string | number;
  sell_value: string | number;
  transaction_cost: string | number;
  drift_before: string | number;
  drift_after: string | number;
};

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const mapSuggestion = (suggestion: RawSuggestion): RebalancingSuggestion => ({
  symbol: suggestion.symbol,
  companyName: suggestion.company_name,
  sector: suggestion.sector,
  action: suggestion.action,
  currentAllocation: toNumber(suggestion.current_allocation),
  targetAllocation: toNumber(suggestion.target_allocation),
  deviation: toNumber(suggestion.deviation),
  suggestedShares: suggestion.suggested_shares ?? 0,
  suggestedValue: toNumber(suggestion.suggested_value),
  currentValue: toNumber(suggestion.current_value),
  priority: suggestion.priority,
});

const mapSuggestionsResponse = (raw: RawSuggestionsResponse): RebalancingSuggestionsResponse => {
  const { suggestions = [] } = raw;
  const totals: RebalancingSuggestionsSummary = {
    buyValue: toNumber(raw.totals?.buyValue ?? raw.totals?.buy_value),
    sellValue: toNumber(raw.totals?.sellValue ?? raw.totals?.sell_value),
    estimatedCost: toNumber(raw.totals?.estimatedCost ?? raw.totals?.estimated_cost),
  };

  return {
    portfolioId: raw.portfolio_id,
    thresholdPct: toNumber(raw.threshold_pct),
    minTradeValue: toNumber(raw.min_trade_value),
    suggestions: suggestions.map(mapSuggestion),
    totals,
  };
};

const mapSettings = (raw: RawSettings): RebalancingSettings => ({
  id: raw.id,
  userId: raw.user_id,
  portfolioId: raw.portfolio_id,
  enabled: Boolean(raw.enabled),
  thresholdPct: toNumber(raw.threshold_pct),
  frequency: raw.frequency,
  minTradeValue: toNumber(raw.min_trade_value),
  lastRebalanceAt: toDate(raw.last_rebalance_at),
  nextRebalanceAt: toDate(raw.next_rebalance_at),
  createdAt: toDate(raw.created_at),
  updatedAt: toDate(raw.updated_at),
});

const mapTrade = (raw: RawTrade): RebalancingTradeSummary => ({
  symbol: raw.symbol,
  action: raw.action,
  quantity: raw.quantity ?? 0,
  price: toNumber(raw.price),
  value: toNumber(raw.value),
});

const mapRun = (raw: RawRun): RebalancingRun => ({
  id: raw.id,
  portfolioId: raw.portfolio_id,
  type: raw.type,
  driftBefore: toNumber(raw.drift_before),
  driftAfter: toNumber(raw.drift_after),
  tradesCount: raw.trades_count ?? (raw.trades?.length ?? 0),
  buyValue: toNumber(raw.buy_value),
  sellValue: toNumber(raw.sell_value),
  transactionCost: toNumber(raw.transaction_cost),
  notes: raw.notes ?? null,
  executedAt: toDate(raw.executed_at) ?? new Date(),
  trades: (raw.trades ?? []).map(mapTrade),
});

const mapHistory = (raw: RawHistory): RebalancingHistory => ({
  portfolioId: raw.portfolio_id,
  runs: (raw.runs ?? []).map(mapRun),
  totalRuns: raw.total_runs ?? 0,
});

const mapExecuteResponse = (raw: RawExecuteResponse): ExecuteRebalancingResult => ({
  runId: raw.run_id,
  executedAt: toDate(raw.executed_at) ?? new Date(),
  trades: (raw.trades ?? []).map(mapTrade),
  buyValue: toNumber(raw.buy_value),
  sellValue: toNumber(raw.sell_value),
  transactionCost: toNumber(raw.transaction_cost),
  driftBefore: toNumber(raw.drift_before),
  driftAfter: toNumber(raw.drift_after),
});

const callApi = async <T>(options: ApiRequestOptions<T>): Promise<T> => {
  return __request(OpenAPI, options);
};

export interface UseRebalancingOptions {
  portfolioId?: string | null;
  thresholdPct: number;
  minTradeValue: number;
  strategy: string;
  historyLimit?: number;
  historyOffset?: number;
  suggestionsEnabled?: boolean;
}

export const useRebalancing = ({
  portfolioId,
  thresholdPct,
  minTradeValue,
  strategy,
  historyLimit = 20,
  historyOffset = 0,
  suggestionsEnabled = true,
}: UseRebalancingOptions) => {
  const queryClient = useQueryClient();
  const safePortfolioId = portfolioId ?? 'none';

  const settingsQuery = useQuery({
    queryKey: queryKeys.rebalancingSettings(safePortfolioId),
    enabled: Boolean(portfolioId),
    queryFn: async () => {
      if (!portfolioId) {
        throw new Error('No portfolio selected');
      }
      const raw = await callApi<RawSettings>({
        method: 'GET',
        url: '/api/v1/rebalancing/portfolio/{portfolio_id}/settings',
        path: { portfolio_id: portfolioId },
        errors: { 404: 'Settings not found' },
      });
      return mapSettings(raw);
    },
    staleTime: 60_000,
    retry: 1,
    onError: (error) => {
      console.error('Failed to load rebalancing settings', error);
      toast.error('Unable to load rebalancing settings');
    },
  });

  const suggestionsQuery = useQuery({
    queryKey: queryKeys.rebalancingSuggestions(safePortfolioId, {
      thresholdPct,
      minTradeValue,
      strategy,
    }),
    enabled: Boolean(portfolioId) && suggestionsEnabled,
    queryFn: async () => {
      if (!portfolioId) {
        throw new Error('No portfolio selected');
      }
      const raw = await callApi<RawSuggestionsResponse>({
        method: 'GET',
        url: '/api/v1/rebalancing/portfolio/{portfolio_id}/suggestions',
        path: { portfolio_id: portfolioId },
        query: {
          threshold_pct: thresholdPct,
          min_trade_value: minTradeValue,
          strategy,
        },
        errors: { 404: 'Portfolio not found', 422: 'Invalid query parameters' },
      });
      return mapSuggestionsResponse(raw);
    },
    keepPreviousData: true,
    retry: 1,
    onError: (error) => {
      console.error('Failed to load rebalancing suggestions', error);
      toast.error('Unable to load rebalancing suggestions');
    },
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.rebalancingHistory(safePortfolioId, historyLimit, historyOffset),
    enabled: Boolean(portfolioId),
    queryFn: async () => {
      if (!portfolioId) {
        throw new Error('No portfolio selected');
      }
      const raw = await callApi<RawHistory>({
        method: 'GET',
        url: '/api/v1/rebalancing/portfolio/{portfolio_id}/history',
        path: { portfolio_id: portfolioId },
        query: { limit: historyLimit, offset: historyOffset },
        errors: { 404: 'Portfolio not found' },
      });
      return mapHistory(raw);
    },
    retry: 1,
    onError: (error) => {
      console.error('Failed to load rebalancing history', error);
      toast.error('Unable to load rebalancing history');
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<RawSettings>) => {
      if (!portfolioId) {
        throw new Error('No portfolio selected');
      }
      const raw = await callApi<RawSettings>({
        method: 'PUT',
        url: '/api/v1/rebalancing/portfolio/{portfolio_id}/settings',
        path: { portfolio_id: portfolioId },
        body: {
          enabled: payload.enabled,
          threshold_pct: payload.threshold_pct,
          frequency: payload.frequency,
          min_trade_value: payload.min_trade_value,
        },
        mediaType: 'application/json',
        errors: { 404: 'Portfolio not found', 422: 'Invalid settings payload' },
      });
      return mapSettings(raw);
    },
    onSuccess: (data) => {
      toast.success('Rebalancing settings saved', { id: 'rebalancing-settings' });
      queryClient.setQueryData(queryKeys.rebalancingSettings(safePortfolioId), data);
    },
    onError: (error) => {
      console.error('Failed to save rebalancing settings', error);
      toast.error('Unable to save rebalancing settings', { id: 'rebalancing-settings-error' });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (request: ExecuteRebalancingRequest) => {
      if (!portfolioId) {
        throw new Error('No portfolio selected');
      }
      const raw = await callApi<RawExecuteResponse>({
        method: 'POST',
        url: '/api/v1/rebalancing/portfolio/{portfolio_id}/execute',
        path: { portfolio_id: portfolioId },
        body: request,
        mediaType: 'application/json',
        errors: {
          400: 'Invalid suggestions payload',
          404: 'Portfolio not found',
          422: 'Invalid suggestions payload',
        },
      });
      return mapExecuteResponse(raw);
    },
    onSuccess: async (result) => {
      toast.success('Rebalancing executed successfully', { id: 'rebalancing-execute' });
      if (portfolioId) {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: queryKeys.rebalancingHistory(portfolioId, historyLimit, historyOffset) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.rebalancingSuggestions(portfolioId, { thresholdPct, minTradeValue, strategy }) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.rebalancingSettings(portfolioId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(portfolioId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.ordersList }),
          queryClient.invalidateQueries({ queryKey: queryKeys.portfolios }),
          queryClient.invalidateQueries({ queryKey: queryKeys.recentTrades(20) }),
        ]);
      }
      return result;
    },
    onError: (error) => {
      console.error('Failed to execute rebalancing', error);
      toast.error('Unable to execute rebalancing trades', { id: 'rebalancing-execute-error' });
    },
  });

  const settings = settingsQuery.data ?? null;
  const suggestions = suggestionsQuery.data ?? null;
  const history = historyQuery.data ?? null;
  const saveSettingsMutate = saveSettingsMutation.mutateAsync;
  const isSavingSettings = saveSettingsMutation.isPending;
  const executeMutate = executeMutation.mutateAsync;
  const isExecuting = executeMutation.isPending;
  const executionResult = executeMutation.data ?? null;

  return useMemo(
    () => ({
      settings,
      isSettingsLoading: settingsQuery.isLoading,
      isSettingsFetching: settingsQuery.isFetching,
      saveSettings: saveSettingsMutate,
      isSavingSettings,

      suggestions,
      isSuggestionsLoading: suggestionsQuery.isLoading,
      isSuggestionsFetching: suggestionsQuery.isFetching,
      refetchSuggestions: suggestionsQuery.refetch,

      history,
      isHistoryLoading: historyQuery.isLoading,
      isHistoryFetching: historyQuery.isFetching,
      refetchHistory: historyQuery.refetch,

      executeRebalancing: executeMutate,
      isExecuting,
      executionResult,
    }),
    [
      executionResult,
      executeMutate,
      history,
      historyQuery.isFetching,
      historyQuery.isLoading,
      isExecuting,
      isSavingSettings,
      saveSettingsMutate,
      settings,
      settingsQuery.isFetching,
      settingsQuery.isLoading,
      suggestions,
      suggestionsQuery.isFetching,
      suggestionsQuery.isLoading,
    ],
  );
};

