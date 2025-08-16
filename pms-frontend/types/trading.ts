export interface User {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  accountNumber: string;
  accountType: 'standard' | 'premium' | 'professional';
  joinDate: string;
  totalAccountValue: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
}

export interface Order {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected';
  filledQuantity: number;
  avgFillPrice?: number;
  orderDate: string;
  fillDate?: string;
  totalValue: number;
  fees: number;
}

export interface Trade {
  id: string;
  orderId: string;
  portfolioId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalValue: number;
  fees: number;
  timestamp: string;
}

export interface MarketData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  high52Week: number;
  low52Week: number;
  marketCap: number;
  peRatio?: number;
  dividend?: number;
  dividendYield?: number;
  sector: string;
  industry: string;
  lastUpdated: string;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdDate: string;
  description?: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'dividend' | 'trade' | 'fee';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  symbols?: string[];
  url: string;
}

export interface AccountBalance {
  totalValue: number;
  cashBalance: number;
  stockValue: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
  marginUsed: number;
  maintenanceMargin: number;
  dayChange?: number;
  dayChangePercent?: number;
}