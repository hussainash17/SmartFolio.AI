export const queryKeys = {
  portfolios: ['portfolios'] as const,
  portfolio: (portfolioId: string) => ['portfolio', portfolioId] as const,
  portfolioSummary: (portfolioId: string) => ['portfolio', portfolioId, 'summary'] as const,
  portfolioPositionsDetails: (portfolioId: string) => ['portfolio', portfolioId, 'positions-details'] as const,

  dashboardSummary: ['dashboard', 'summary'] as const,
  portfolioAnalytics: (portfolioId: string) => ['analytics', 'portfolio', portfolioId] as const,
  portfolioAllocation: (portfolioId: string) => ['allocation', 'portfolio', portfolioId] as const,
  allocationTargets: (portfolioId: string) => ['allocation', 'targets', portfolioId] as const,
  investmentGoals: ['kyc', 'goals'] as const,
  goalProgress: (goalId: string) => ['kyc', 'goals', goalId, 'progress'] as const,
  goalContributions: (goalId: string) => ['kyc', 'goals', goalId, 'contributions'] as const,
  goalSIPCalculation: (goalId: string) => ['kyc', 'goals', goalId, 'sip'] as const,
  goalAssetAllocation: (goalId: string) => ['kyc', 'goals', goalId, 'asset-allocation'] as const,
  goalProductRecommendations: (goalId: string) => ['kyc', 'goals', goalId, 'recommendations'] as const,
  goalAlerts: (goalId: string) => ['kyc', 'goals', goalId, 'alerts'] as const,
  riskAlerts: (portfolioId?: string) => ['risk', 'alerts', portfolioId ?? 'none'] as const,
  riskOverview: (portfolioId: string, period: string, benchmarkId?: string) => 
    ['risk', 'overview', portfolioId, period, benchmarkId ?? 'none'] as const,
  riskMetricsDetailed: (portfolioId: string, period: string, benchmarkId?: string) => 
    ['risk', 'metrics', portfolioId, period, benchmarkId ?? 'none'] as const,
  riskMetricsTimeseries: (portfolioId: string, period: string, benchmarkId?: string) => 
    ['risk', 'metrics', 'timeseries', portfolioId, period, benchmarkId ?? 'none'] as const,
  sectorConcentration: (portfolioId: string, period: string, benchmarkId?: string) => 
    ['risk', 'concentration', 'sector', portfolioId, period, benchmarkId ?? 'none'] as const,
  correlationAnalysis: (portfolioId: string, period: string, top: number) => 
    ['risk', 'correlation', portfolioId, period, top] as const,
  stressTests: (portfolioId: string, scenarios?: string[], benchmarkId?: string) => 
    ['risk', 'stress-tests', portfolioId, scenarios?.join(',') ?? 'all', benchmarkId ?? 'none'] as const,
  rebalancingRecommendations: (portfolioId: string, targets?: Record<string, number>) => 
    ['risk', 'rebalancing', 'recommendations', portfolioId, targets ? JSON.stringify(targets) : 'default'] as const,
  userRiskProfile: ['risk', 'profile'] as const,

  marketList: (limit = 50, offset = 0, q?: string) => ['market', 'list', { limit, offset, q: q || '' }] as const,
  newsList: (limit = 20, offset = 0, category?: string, symbol?: string, days?: number) =>
    ['news', 'list', { limit, offset, category: category || '', symbol: symbol || '', days: days ?? 7 }] as const,
  ordersList: ['orders', 'list'] as const,
  fundsSummary: ['funds', 'summary'] as const,
  transactions: ['funds', 'transactions'] as const,
  recentTrades: (limit = 20) => ['trades', 'recent', { limit }] as const,
  sectorAnalysis: ['market', 'sector-analysis'] as const,
  indices: ['market', 'indices'] as const,
  topMovers: ['market', 'top-movers'] as const,
  mostActive: ['market', 'most-active'] as const,
  turnoverCompare: ['market', 'turnover-compare'] as const,
  marketSentiment: ['analytics', 'market-sentiment'] as const,
  upcomingEvents: ['market', 'events', 'upcoming'] as const,
  marketFlows: ['market', 'flows'] as const,
  macroSnapshot: ['market', 'macro'] as const,
  stockOfTheDay: ['research', 'stock-of-the-day'] as const,
  analystPicks: ['research', 'analyst-picks'] as const,
  earningsHighlights: ['research', 'earnings-highlights'] as const,
  themes: ['research', 'themes'] as const,

  // New
  watchlists: ['watchlists'] as const,
  watchlistItems: (watchlistId: string) => ['watchlists', watchlistId, 'items'] as const,
  alerts: ['alerts'] as const,

  // Fundamental Analysis
  fundamentalCompanyInfo: (tradingCode: string) => ['fundamentals', 'company', tradingCode] as const,
  fundamentalMarketSummary: (tradingCode: string) => ['fundamentals', 'market-summary', tradingCode] as const,
  fundamentalShareholding: (tradingCode: string) => ['fundamentals', 'shareholding', tradingCode] as const,
  fundamentalEarnings: (tradingCode: string) => ['fundamentals', 'earnings', tradingCode] as const,
  fundamentalFinancialHealth: (tradingCode: string) => ['fundamentals', 'financial-health', tradingCode] as const,
  fundamentalDividends: (tradingCode: string, limit?: number) => ['fundamentals', 'dividends', tradingCode, limit ?? 10] as const,
  fundamentalRatios: (tradingCode: string, years?: number) => ['fundamentals', 'ratios', tradingCode, years ?? 5] as const,
  fundamentalComparison: (codes: string) => ['fundamentals', 'compare', codes] as const,
  fundamentalSearch: (params: { sector?: string; category?: string; minPe?: number; maxPe?: number; minDividendYield?: number }) => 
    ['fundamentals', 'search', params] as const,
  fundamentalDataAvailability: (tradingCode: string) => ['fundamentals', 'data-availability', tradingCode] as const,

  // Performance Analytics
  performanceSummary: (portfolioId: string, period: string) => ['performance', 'summary', portfolioId, period] as const,
  valueHistory: (portfolioId: string, period: string, benchmarkId?: string, frequency?: string) =>
    ['performance', 'value-history', portfolioId, period, benchmarkId ?? 'none', frequency ?? 'daily'] as const,
  benchmarkComparison: (portfolioId: string, benchmarkId: string) => ['performance', 'benchmark-comparison', portfolioId, benchmarkId] as const,
  benchmarks: ['performance', 'benchmarks'] as const,
  monthlyReturns: (portfolioId: string, year?: number) => ['performance', 'monthly-returns', portfolioId, year ?? 'current'] as const,
  securityAttribution: (portfolioId: string, period: string, limit: number) => ['performance', 'security-attribution', portfolioId, period, limit] as const,
  sectorAttribution: (portfolioId: string, period: string, benchmarkId?: string) => ['performance', 'sector-attribution', portfolioId, period, benchmarkId ?? 'none'] as const,
  riskMetrics: (portfolioId: string, period: string, benchmarkId?: string) => ['performance', 'risk-metrics', portfolioId, period, benchmarkId ?? 'none'] as const,
  
  // New Optimized Split APIs
  currentValue: (portfolioId: string) => ['performance', 'current-value', portfolioId] as const,
  performanceReturns: (portfolioId: string, period: string) => ['performance', 'returns', portfolioId, period] as const,
  performanceRisk: (portfolioId: string, period: string) => ['performance', 'risk', portfolioId, period] as const,
  bestWorst: (portfolioId: string, period: string) => ['performance', 'best-worst', portfolioId, period] as const,
  cashFlows: (portfolioId: string, period: string) => ['performance', 'cash-flows', portfolioId, period] as const,

  rebalancingSettings: (portfolioId: string) => ['rebalancing', 'settings', portfolioId] as const,
  rebalancingSuggestions: (portfolioId: string, params: { thresholdPct: number; minTradeValue: number; strategy: string }) =>
    ['rebalancing', 'suggestions', portfolioId, params.thresholdPct, params.minTradeValue, params.strategy] as const,
  rebalancingHistory: (portfolioId: string, limit: number, offset: number) =>
    ['rebalancing', 'history', portfolioId, limit, offset] as const,
};