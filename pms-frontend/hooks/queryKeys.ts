export const queryKeys = {
  portfolios: ['portfolios'] as const,
  portfolio: (portfolioId: string) => ['portfolio', portfolioId] as const,
  portfolioSummary: (portfolioId: string) => ['portfolio', portfolioId, 'summary'] as const,
  portfolioPositionsDetails: (portfolioId: string) => ['portfolio', portfolioId, 'positions-details'] as const,

  dashboardSummary: ['dashboard', 'summary'] as const,
  portfolioAnalytics: (portfolioId: string) => ['analytics', 'portfolio', portfolioId] as const,
  portfolioAllocation: (portfolioId: string) => ['allocation', 'portfolio', portfolioId] as const,
  investmentGoals: ['kyc', 'goals'] as const,
  riskAlerts: (portfolioId?: string) => ['risk', 'alerts', portfolioId ?? 'none'] as const,

  marketList: (limit = 50, offset = 0, q?: string) => ['market', 'list', { limit, offset, q: q || '' }] as const,
  newsList: (limit = 20, offset = 0, symbol?: string) => ['news', 'list', { limit, offset, symbol: symbol || '' }] as const,
  ordersList: ['orders', 'list'] as const,
};