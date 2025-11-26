import { useQuery } from '@tanstack/react-query';
import { OpenAPI, KycService } from '../src/client';
import { queryKeys } from './queryKeys';

// API call helper
async function fetchDashboardAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`Dashboard API call failed: ${response.statusText}`);
  }

  return await response.json();
}

// Types
export interface DashboardSummary {
  portfolio_count: number;
  total_portfolio_value: number;
  total_investment: number;
  cash_balance: number;
  stock_value: number;
  day_change: number;
  day_change_percent: number;
  ytd_return_percent: number;
  risk_score: number;
  risk_level: string;
  active_goals: number;
  buying_power: number;
  total_realized_gains: number;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  progress: number;
  timeframe: string;
  priority: 'High' | 'Medium' | 'Low';
  status: string;
}

// Hook for dashboard summary
export function useDashboardSummary() {
  const defaultSummary: DashboardSummary = {
    portfolio_count: 0,
    total_portfolio_value: 0,
    total_investment: 0,
    cash_balance: 0,
    stock_value: 0,
    day_change: 0,
    day_change_percent: 0,
    ytd_return_percent: 0,
    risk_score: 0,
    risk_level: 'LOW',
    active_goals: 0,
    buying_power: 0,
    total_realized_gains: 0,
  };

  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => {
      try {
        const data = await fetchDashboardAPI<any>('/api/v1/dashboard/summary');
        return {
          portfolio_count: Number(data.portfolio_count || 0),
          total_portfolio_value: Number(data.total_portfolio_value || 0),
          total_investment: Number(data.total_investment || 0),
          cash_balance: Number(data.cash_balance || 0),
          stock_value: Number(data.stock_value || 0),
          day_change: Number(data.day_change || 0),
          day_change_percent: Number(data.day_change_percent || 0),
          ytd_return_percent: Number(data.ytd_return_percent || 0),
          risk_score: Number(data.risk_score || 0),
          risk_level: String(data.risk_level || 'LOW'),
          active_goals: Number(data.active_goals || 0),
          buying_power: Number(data.buying_power || 0),
          total_realized_gains: Number(data.total_realized_gains || 0),
        };
      } catch (error) {
        console.error('[useDashboardSummary] API call failed:', error);
        return defaultSummary;
      }
    },
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 60 * 1000,
  });
}

// Hook for investment goals
export function useInvestmentGoals() {
  return useQuery({
    queryKey: queryKeys.investmentGoals,
    queryFn: async () => {
      const goals = await KycService.getInvestmentGoals();
      return (goals as any[]).map((g) => ({
        id: String(g.id),
        name: String(g.goal_type || 'Goal'),
        target: Number(g.target_amount || 0),
        current: 0,
        progress: 0,
        timeframe: g.target_date ? new Date(g.target_date).toLocaleDateString() : '—',
        priority: (Number(g.priority || 1) <= 1 ? 'High' : Number(g.priority || 1) <= 2 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
        status: String(g.status || 'ACTIVE'),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for goal progress
export function useGoalProgress(goalIds: string[]) {
  return useQuery({
    queryKey: ['kyc', 'goals', 'progress', goalIds.join(',')],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const goalId of goalIds) {
        try {
          const contribs = await KycService.listGoalContributions({ goalId });
          const sum = (contribs as any[]).reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          // Note: We need target value from the goal itself, this is a limitation
          result[goalId] = 0; // Will be calculated in component
        } catch (error) {
          console.error(`Failed to fetch contributions for goal ${goalId}:`, error);
          result[goalId] = 0;
        }
      }
      return result;
    },
    enabled: goalIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}
