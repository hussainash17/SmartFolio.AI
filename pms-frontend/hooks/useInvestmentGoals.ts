import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OpenAPI } from "../src/client/core/OpenAPI";
import { request } from "../src/client/core/request";
import { queryKeys } from "./queryKeys";

// ==================== TYPE DEFINITIONS ====================

export interface UserInvestmentGoalCreate {
  goal_name: string;
  goal_type: 'RETIREMENT' | 'EDUCATION' | 'WEALTH_BUILDING' | 'INCOME_GENERATION' | 'CAPITAL_PRESERVATION' | 'SHORT_TERM_GAINS' | 'HOME_PURCHASE' | 'VACATION' | 'EMERGENCY_FUND' | 'WEDDING' | 'VEHICLE_PURCHASE' | 'BUSINESS_STARTUP';
  target_amount: number;
  target_date?: string;
  current_amount?: number;
  monthly_contribution?: number;
  expected_return_rate?: number;
  risk_tolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  priority?: number;
  description?: string;
  is_active?: boolean;
}

export interface UserInvestmentGoalUpdate {
  goal_name?: string;
  target_amount?: number;
  target_date?: string;
  current_amount?: number;
  monthly_contribution?: number;
  expected_return_rate?: number;
  risk_tolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  priority?: number;
  description?: string;
  is_active?: boolean;
}

export interface UserInvestmentGoal extends UserInvestmentGoalCreate {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  projected_amount?: number;
  shortfall_amount?: number;
  monthly_sip_required?: number;
  progress_percentage?: number;
  time_remaining_months?: number;
}

export interface UserInvestmentGoalContributionCreate {
  amount: number;
  contribution_date?: string;
  description?: string;
}

export interface UserInvestmentGoalContribution {
  id: string;
  goal_id: string;
  amount: number;
  contributed_at: string;
  description?: string;
  created_at: string;
}

export interface SIPCalculationResult {
  goal_id: string;
  current_amount: number;
  target_amount: number;
  time_remaining_months: number;
  expected_annual_return: number;
  required_monthly_sip: number;
  total_investment_required: number;
  expected_returns: number;
  is_achievable: boolean;
  shortfall_amount?: number;
  recommendations: string[];
}

export interface GoalProgressResponse {
  goal_id: string;
  goal_name: string;
  target_amount: number;
  current_value: number;
  progress_percentage: number;
  contributions_total: number;
  investment_returns: number;
  time_elapsed_months: number;
  time_remaining_months: number;
  is_on_track: boolean;
  projected_final_amount: number;
  shortfall_amount?: number;
  ahead_by_amount?: number;
  monthly_pace_required: number;
  monthly_pace_actual: number;
  milestones: Array<{
    percentage: number;
    amount: number;
    achieved: boolean;
    date_achieved?: string;
  }>;
}

export interface WhatIfScenarioRequest {
  scenario_type: 'increase_sip' | 'decrease_sip' | 'delay_goal' | 'advance_goal' | 'change_return';
  new_monthly_sip?: number;
  new_target_date?: string;
  new_return_rate?: number;
}

export interface WhatIfScenarioResponse {
  original_scenario: {
    monthly_sip: number;
    target_date: string;
    expected_return: number;
    projected_amount: number;
    shortfall: number;
  };
  new_scenario: {
    monthly_sip: number;
    target_date: string;
    expected_return: number;
    projected_amount: number;
    shortfall: number;
  };
  impact: {
    amount_difference: number;
    time_difference_months: number;
    sip_difference: number;
    success_probability_change: number;
  };
  recommendation: string;
}

export interface AssetAllocationRecommendation {
  goal_id: string;
  goal_type: string;
  risk_tolerance: string;
  time_horizon_years: number;
  recommended_allocation: {
    equity: number;
    debt: number;
    gold: number;
    cash: number;
  };
  rationale: string;
  rebalancing_frequency: string;
  suggested_drift_threshold: number;
}

export interface ProductRecommendation {
  product_type: 'mutual_fund' | 'etf' | 'stock' | 'bond' | 'fd';
  product_name: string;
  category: string;
  expected_return: number;
  risk_level: string;
  min_investment: number;
  liquidity: string;
  tax_efficiency: string;
  suitability_score: number;
  rationale: string;
}

export interface ProductRecommendationResponse {
  goal_id: string;
  recommendations: ProductRecommendation[];
  diversification_note: string;
}

export interface GoalAlert {
  alert_type: 'drift' | 'milestone' | 'rebalance' | 'review';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  action_required?: string;
  created_at: string;
}

export interface GoalAlertResponse {
  goal_id: string;
  alerts: GoalAlert[];
  overall_health_score: number;
}

export interface GoalLinkedAssetCreate {
  symbol: string;
  allocation_type: 'QUANTITY' | 'PERCENTAGE';
  allocation_value: number;
}

export interface GoalLinkedAsset {
  id: string;
  goal_id: string;
  symbol: string;
  company_name?: string;
  allocation_type: 'QUANTITY' | 'PERCENTAGE';
  allocation_value: number;
  linked_quantity: number;
  current_value: number;
  created_at: string;
}

// ==================== API FUNCTIONS ====================

const apiRequest = async <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: any): Promise<T> => {
  return request(OpenAPI, {
    method,
    url,
    body,
    mediaType: 'application/json',
  });
};

// ==================== HOOKS ====================

export function useInvestmentGoals() {
  const queryClient = useQueryClient();

  // Fetch all goals
  const { data: goals = [], isLoading, error } = useQuery<UserInvestmentGoal[]>({
    queryKey: queryKeys.investmentGoals,
    queryFn: () => apiRequest('GET', '/api/v1/kyc/goals'),
  });

  // Create goal
  const createGoal = useMutation({
    mutationFn: (data: UserInvestmentGoalCreate) =>
      apiRequest<UserInvestmentGoal>('POST', '/api/v1/kyc/goals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
    },
  });

  // Update goal
  const updateGoal = useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: UserInvestmentGoalUpdate }) =>
      apiRequest<UserInvestmentGoal>('PUT', `/api/v1/kyc/goals/${goalId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
    },
  });

  // Delete goal
  const deleteGoal = useMutation({
    mutationFn: (goalId: string) =>
      apiRequest('DELETE', `/api/v1/kyc/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
    },
  });

  return {
    goals,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}

// Goal Contributions
export function useGoalContributions(goalId: string) {
  const queryClient = useQueryClient();

  // Fetch contributions
  const { data: contributions = [], isLoading } = useQuery<UserInvestmentGoalContribution[]>({
    queryKey: queryKeys.goalContributions(goalId),
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/contributions`),
    enabled: !!goalId,
  });

  // Add contribution
  const addContribution = useMutation({
    mutationFn: (data: UserInvestmentGoalContributionCreate) =>
      apiRequest<UserInvestmentGoalContribution>('POST', `/api/v1/kyc/goals/${goalId}/contributions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
      queryClient.invalidateQueries({ queryKey: queryKeys.goalProgress(goalId) });
    },
  });

  // Delete contribution
  const deleteContribution = useMutation({
    mutationFn: (contributionId: string) =>
      apiRequest('DELETE', `/api/v1/kyc/goals/contributions/${contributionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalContributions(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
      queryClient.invalidateQueries({ queryKey: queryKeys.goalProgress(goalId) });
    },
  });

  return {
    contributions,
    isLoading,
    addContribution,
    deleteContribution,
  };
}

// SIP Calculation
export function useGoalSIPCalculation(goalId: string) {
  return useQuery<SIPCalculationResult>({
    queryKey: queryKeys.goalSIPCalculation(goalId),
    queryFn: () => apiRequest('POST', `/api/v1/kyc/goals/${goalId}/calculate-sip`),
    enabled: !!goalId,
  });
}

// Goal Progress
export function useGoalProgress(goalId: string) {
  return useQuery<GoalProgressResponse>({
    queryKey: queryKeys.goalProgress(goalId),
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/progress`),
    enabled: !!goalId,
  });
}

// What-If Scenarios
export function useWhatIfScenario() {
  return useMutation({
    mutationFn: ({ goalId, scenario }: { goalId: string; scenario: WhatIfScenarioRequest }) =>
      apiRequest<WhatIfScenarioResponse>('POST', `/api/v1/kyc/goals/${goalId}/what-if`, scenario),
  });
}

// Asset Allocation
export function useAssetAllocation(goalId: string) {
  return useQuery<AssetAllocationRecommendation>({
    queryKey: queryKeys.goalAssetAllocation(goalId),
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/asset-allocation`),
    enabled: !!goalId,
  });
}

// Product Recommendations
export function useProductRecommendations(goalId: string) {
  return useQuery<ProductRecommendationResponse>({
    queryKey: queryKeys.goalProductRecommendations(goalId),
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/recommendations`),
    enabled: !!goalId,
  });
}

// Goal Alerts
export function useGoalAlerts(goalId: string) {
  return useQuery<GoalAlertResponse>({
    queryKey: queryKeys.goalAlerts(goalId),
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/alerts`),
    enabled: !!goalId,
  });
}

// Goal Linked Assets
export function useGoalLinkedAssets(goalId: string) {
  const queryClient = useQueryClient();

  // Fetch linked assets
  const { data: linkedAssets = [], isLoading } = useQuery<GoalLinkedAsset[]>({
    queryKey: ['goalLinkedAssets', goalId],
    queryFn: () => apiRequest('GET', `/api/v1/kyc/goals/${goalId}/assets`),
    enabled: !!goalId,
  });

  // Link asset
  const linkAsset = useMutation({
    mutationFn: (data: GoalLinkedAssetCreate) =>
      apiRequest<GoalLinkedAsset>('POST', `/api/v1/kyc/goals/${goalId}/assets`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalLinkedAssets', goalId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.goalProgress(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
    },
  });

  // Unlink asset
  const unlinkAsset = useMutation({
    mutationFn: (assetId: string) =>
      apiRequest('DELETE', `/api/v1/kyc/goals/assets/${assetId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goalLinkedAssets', goalId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.goalProgress(goalId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.investmentGoals });
    },
  });

  return {
    linkedAssets,
    isLoading,
    linkAsset,
    unlinkAsset,
  };
}

