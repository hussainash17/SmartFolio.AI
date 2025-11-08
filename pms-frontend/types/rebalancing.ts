export type RebalancingPriority = 'high' | 'medium' | 'low';

export interface RebalancingSuggestion {
  symbol: string;
  companyName: string;
  sector: string;
  action: 'BUY' | 'SELL';
  currentAllocation: number;
  targetAllocation: number;
  deviation: number;
  suggestedShares: number;
  suggestedValue: number;
  currentValue: number;
  priority: RebalancingPriority;
}

export interface RebalancingSuggestionsSummary {
  buyValue: number;
  sellValue: number;
  estimatedCost: number;
}

export interface RebalancingSuggestionsResponse {
  portfolioId: string;
  thresholdPct: number;
  minTradeValue: number;
  suggestions: RebalancingSuggestion[];
  totals: RebalancingSuggestionsSummary;
}

export interface RebalancingSettings {
  id: string;
  userId: string;
  portfolioId: string;
  enabled: boolean;
  thresholdPct: number;
  frequency: string;
  minTradeValue: number;
  lastRebalanceAt?: Date | null;
  nextRebalanceAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface RebalancingTradeSummary {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  value: number;
}

export interface RebalancingRun {
  id: string;
  portfolioId: string;
  type: string;
  driftBefore: number;
  driftAfter: number;
  tradesCount: number;
  buyValue: number;
  sellValue: number;
  transactionCost: number;
  notes?: string | null;
  executedAt: Date;
  trades: RebalancingTradeSummary[];
}

export interface RebalancingHistory {
  portfolioId: string;
  runs: RebalancingRun[];
  totalRuns: number;
}

export interface ExecuteRebalancingInputSuggestion {
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  limit_price?: number | null;
}

export interface ExecuteRebalancingRequest {
  suggestions: ExecuteRebalancingInputSuggestion[];
  simulate?: boolean;
}

export interface ExecuteRebalancingResult {
  runId: string;
  executedAt: Date;
  trades: RebalancingTradeSummary[];
  buyValue: number;
  sellValue: number;
  transactionCost: number;
  driftBefore: number;
  driftAfter: number;
}

