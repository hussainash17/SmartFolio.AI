export interface Stock {
  id: string;
  symbol: string;
  companyName: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: string;
  sector?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  createdDate: string;
  totalValue: number;
  totalCost: number;
  stocks: Stock[];
  cash: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
}