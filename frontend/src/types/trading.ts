export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountNumber: string;
  accountType: 'standard' | 'premium' | 'professional';
  joinDate: string;
  totalAccountValue: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
  marginLevel: number;
  dayTradesUsed: number;
  dayTradesRemaining: number;
  patternDayTrader: boolean;
  accountStatus: 'active' | 'restricted' | 'suspended';
}

export interface Order {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit' | 'trailing-stop';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  trailingPercent?: number;
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok' | 'ext';
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected' | 'expired';
  filledQuantity: number;
  avgFillPrice?: number;
  orderDate: string;
  fillDate?: string;
  totalValue: number;
  fees: number;
  routing: 'smart' | 'direct' | 'manual';
  notes?: string;
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
  exchange: string;
  tradeId: string;
}

export interface MarketData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  high52Week: number;
  low52Week: number;
  marketCap: number;
  peRatio?: number;
  forwardPE?: number;
  dividend?: number;
  dividendYield?: number;
  exDividendDate?: string;
  payoutRatio?: number;
  sector: string;
  industry: string;
  lastUpdated: string;
  
  // Real-time data
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  lastTradePrice: number;
  lastTradeSize: number;
  lastTradeTime: string;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  
  // Technical indicators
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  bollingerMiddle?: number;
  
  // Options data
  impliedVolatility?: number;
  putCallRatio?: number;
  openInterest?: number;
  
  // Additional metrics
  beta?: number;
  shortRatio?: number;
  shortPercent?: number;
  institutionalOwnership?: number;
  insiderOwnership?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  orders: number;
}

export interface TimeAndSales {
  symbol: string;
  trades: TradeTick[];
}

export interface TradeTick {
  timestamp: string;
  price: number;
  size: number;
  side: 'buy' | 'sell' | 'unknown';
  exchange: string;
  tradeId: string;
  conditions?: string[];
}

export interface OptionsChain {
  symbol: string;
  expirationDate: string;
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
  impliedVolatility: number;
}

export interface OptionContract {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  rho?: number;
  intrinsicValue: number;
  timeValue: number;
  inTheMoney: boolean;
}

export interface Position {
  symbol: string;
  companyName: string;
  quantity: number;
  avgCost: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  dayPnL: number;
  dayPnLPercent: number;
  sector: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  beta: number;
  weight: number;
  marginUsed: number;
  shortable: boolean;
  shortQuantity?: number;
  shortAvgCost?: number;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdDate: string;
  description?: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'dividend' | 'trade' | 'fee' | 'interest' | 'transfer' | 'adjustment';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  symbol?: string;
  quantity?: number;
  price?: number;
  fees?: number;
  reference?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content?: string;
  source: string;
  timestamp: string;
  symbols?: string[];
  url: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  impact?: 'high' | 'medium' | 'low';
  category?: string;
}

export interface AccountBalance {
  totalValue: number;
  cashBalance: number;
  stockValue: number;
  optionValue: number;
  buyingPower: number;
  dayTradingBuyingPower: number;
  marginUsed: number;
  maintenanceMargin: number;
  marginLevel: number;
  availableFunds: number;
  settledFunds: number;
  unsettledFunds: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  marginExcess: number;
  marginDeficit: number;
  netLiquidationValue: number;
  totalCashValue: number;
  totalSecuritiesValue: number;
  totalOptionsValue: number;
  totalCommoditiesValue: number;
  totalFuturesValue: number;
  totalForexValue: number;
  totalBondsValue: number;
  totalMutualFundsValue: number;
  totalETFsValue: number;
  totalOtherValue: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  lastUpdated: string;
}

export interface EconomicCalendar {
  date: string;
  time: string;
  event: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  actual?: number;
  forecast?: number;
  previous?: number;
  description?: string;
}

export interface EarningsCalendar {
  symbol: string;
  companyName: string;
  reportDate: string;
  reportTime: 'before-market' | 'after-market';
  estimate: number;
  actual?: number;
  surprise?: number;
  surprisePercent?: number;
  revenueEstimate?: number;
  revenueActual?: number;
  revenueSurprise?: number;
  revenueSurprisePercent?: number;
}

export interface SectorPerformance {
  sector: string;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  topGainers: string[];
  topLosers: string[];
}

export interface MarketMovers {
  gainers: MarketData[];
  losers: MarketData[];
  mostActive: MarketData[];
  highestVolume: MarketData[];
  highestValue: MarketData[];
}

export interface TechnicalAnalysis {
  symbol: string;
  timestamp: string;
  signals: {
    overall: 'buy' | 'sell' | 'hold';
    strength: number; // 0-100
    movingAverages: 'buy' | 'sell' | 'hold';
    technicalIndicators: 'buy' | 'sell' | 'hold';
    summary: string;
  };
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
    bollingerUpper: number;
    bollingerLower: number;
    bollingerMiddle: number;
    stochasticK: number;
    stochasticD: number;
    williamsR: number;
    cci: number;
    adx: number;
    atr: number;
  };
  support: number[];
  resistance: number[];
  pivotPoints: {
    pp: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
}

export interface RiskMetrics {
  symbol: string;
  beta: number;
  alpha: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  expectedReturn: number;
  downsideDeviation: number;
  informationRatio: number;
  treynorRatio: number;
  calmarRatio: number;
}

export interface PortfolioAnalytics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayGainLoss: number;
  dayGainLossPercent: number;
  monthGainLoss: number;
  monthGainLossPercent: number;
  yearGainLoss: number;
  yearGainLossPercent: number;
  beta: number;
  alpha: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  sectorAllocation: { [sector: string]: number };
  topHoldings: Position[];
  performanceHistory: {
    date: string;
    value: number;
    gainLoss: number;
    gainLossPercent: number;
  }[];
}