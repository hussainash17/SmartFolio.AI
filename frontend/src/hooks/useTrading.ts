import { useState, useMemo } from 'react';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance, Position, MarketIndex, OrderBook, TimeAndSales, TechnicalAnalysis, RiskMetrics, PortfolioAnalytics, MarketMovers, SectorPerformance } from '@/types/trading';

// Mock user data
const MOCK_USER: User = {
  id: 'user_1',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountNumber: 'ACC-789012345',
  accountType: 'premium',
  joinDate: '2022-01-15',
  totalAccountValue: 150000,
  buyingPower: 25000,
  dayTradingBuyingPower: 100000,
  marginLevel: 85.5,
  dayTradesUsed: 2,
  dayTradesRemaining: 1,
  patternDayTrader: false,
  accountStatus: 'active',
};

// Mock market data
const MOCK_MARKET_DATA: MarketData[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    currentPrice: 192.53,
    change: 2.45,
    changePercent: 1.29,
    volume: 45678900,
    avgVolume: 50000000,
    high52Week: 199.62,
    low52Week: 164.08,
    marketCap: 2980000000000,
    peRatio: 29.8,
    forwardPE: 28.5,
    dividend: 0.24,
    dividendYield: 0.50,
    exDividendDate: '2025-02-10',
    payoutRatio: 15.2,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    lastUpdated: new Date().toISOString(),
    bid: 192.50,
    ask: 192.55,
    bidSize: 1000,
    askSize: 1500,
    lastTradePrice: 192.53,
    lastTradeSize: 500,
    lastTradeTime: new Date().toISOString(),
    open: 190.25,
    high: 193.10,
    low: 189.80,
    previousClose: 190.08,
    rsi: 65.4,
    macd: 2.15,
    macdSignal: 1.85,
    macdHistogram: 0.30,
    sma20: 188.50,
    sma50: 185.20,
    sma200: 175.80,
    bollingerUpper: 195.20,
    bollingerLower: 181.80,
    bollingerMiddle: 188.50,
    impliedVolatility: 0.25,
    putCallRatio: 0.85,
    openInterest: 150000,
    beta: 1.15,
    shortRatio: 2.5,
    shortPercent: 1.2,
    institutionalOwnership: 65.5,
    insiderOwnership: 0.1,
    returnOnEquity: 25.5,
    returnOnAssets: 18.2,
    debtToEquity: 0.15,
    currentRatio: 1.45,
    quickRatio: 1.20,
    grossMargin: 42.5,
    operatingMargin: 28.5,
    netMargin: 25.2,
    revenueGrowth: 8.5,
    earningsGrowth: 12.3,
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    currentPrice: 138.21,
    change: -1.15,
    changePercent: -0.82,
    volume: 23456789,
    avgVolume: 25000000,
    high52Week: 152.15,
    low52Week: 121.46,
    marketCap: 1750000000000,
    peRatio: 24.5,
    forwardPE: 22.8,
    sector: 'Technology',
    industry: 'Internet Software & Services',
    lastUpdated: new Date().toISOString(),
    bid: 138.20,
    ask: 138.22,
    bidSize: 800,
    askSize: 1200,
    lastTradePrice: 138.21,
    lastTradeSize: 300,
    lastTradeTime: new Date().toISOString(),
    open: 139.50,
    high: 140.20,
    low: 137.80,
    previousClose: 139.36,
    rsi: 45.2,
    macd: -1.25,
    macdSignal: -0.85,
    macdHistogram: -0.40,
    sma20: 140.50,
    sma50: 142.20,
    sma200: 135.80,
    bollingerUpper: 145.20,
    bollingerLower: 135.80,
    bollingerMiddle: 140.50,
    impliedVolatility: 0.30,
    putCallRatio: 1.15,
    openInterest: 120000,
    beta: 1.05,
    shortRatio: 1.8,
    shortPercent: 0.8,
    institutionalOwnership: 70.2,
    insiderOwnership: 0.05,
    returnOnEquity: 22.8,
    returnOnAssets: 15.5,
    debtToEquity: 0.08,
    currentRatio: 2.15,
    quickRatio: 1.95,
    grossMargin: 55.2,
    operatingMargin: 28.8,
    netMargin: 24.5,
    revenueGrowth: 12.5,
    earningsGrowth: 18.2,
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    currentPrice: 378.85,
    change: 5.67,
    changePercent: 1.52,
    volume: 34567890,
    avgVolume: 30000000,
    high52Week: 384.52,
    low52Week: 309.45,
    marketCap: 2850000000000,
    peRatio: 32.1,
    forwardPE: 30.2,
    dividend: 0.75,
    dividendYield: 0.79,
    exDividendDate: '2025-02-15',
    payoutRatio: 25.3,
    sector: 'Technology',
    industry: 'Software & Programming',
    lastUpdated: new Date().toISOString(),
    bid: 378.80,
    ask: 378.90,
    bidSize: 1200,
    askSize: 1800,
    lastTradePrice: 378.85,
    lastTradeSize: 400,
    lastTradeTime: new Date().toISOString(),
    open: 375.20,
    high: 380.50,
    low: 374.80,
    previousClose: 373.18,
    rsi: 72.5,
    macd: 3.45,
    macdSignal: 2.85,
    macdHistogram: 0.60,
    sma20: 370.50,
    sma50: 365.20,
    sma200: 340.80,
    bollingerUpper: 385.20,
    bollingerLower: 355.80,
    bollingerMiddle: 370.50,
    impliedVolatility: 0.22,
    putCallRatio: 0.75,
    openInterest: 180000,
    beta: 0.95,
    shortRatio: 1.2,
    shortPercent: 0.5,
    institutionalOwnership: 75.8,
    insiderOwnership: 0.08,
    returnOnEquity: 35.2,
    returnOnAssets: 20.5,
    debtToEquity: 0.25,
    currentRatio: 1.85,
    quickRatio: 1.65,
    grossMargin: 68.5,
    operatingMargin: 40.2,
    netMargin: 35.8,
    revenueGrowth: 15.2,
    earningsGrowth: 22.5,
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    currentPrice: 248.42,
    change: -8.23,
    changePercent: -3.20,
    volume: 89012345,
    avgVolume: 80000000,
    high52Week: 299.29,
    low52Week: 152.37,
    marketCap: 790000000000,
    peRatio: 65.4,
    forwardPE: 45.2,
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers',
    lastUpdated: new Date().toISOString(),
    bid: 248.40,
    ask: 248.45,
    bidSize: 2000,
    askSize: 2500,
    lastTradePrice: 248.42,
    lastTradeSize: 800,
    lastTradeTime: new Date().toISOString(),
    open: 255.80,
    high: 257.20,
    low: 247.50,
    previousClose: 256.65,
    rsi: 35.8,
    macd: -5.25,
    macdSignal: -3.85,
    macdHistogram: -1.40,
    sma20: 260.50,
    sma50: 275.20,
    sma200: 220.80,
    bollingerUpper: 285.20,
    bollingerLower: 235.80,
    bollingerMiddle: 260.50,
    impliedVolatility: 0.45,
    putCallRatio: 1.45,
    openInterest: 250000,
    beta: 2.15,
    shortRatio: 8.5,
    shortPercent: 3.2,
    institutionalOwnership: 45.2,
    insiderOwnership: 0.15,
    returnOnEquity: 18.5,
    returnOnAssets: 8.2,
    debtToEquity: 0.35,
    currentRatio: 1.25,
    quickRatio: 1.05,
    grossMargin: 25.8,
    operatingMargin: 12.5,
    netMargin: 10.2,
    revenueGrowth: 25.5,
    earningsGrowth: 35.8,
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    currentPrice: 875.28,
    change: 12.45,
    changePercent: 1.44,
    volume: 56789012,
    avgVolume: 50000000,
    high52Week: 950.02,
    low52Week: 200.02,
    marketCap: 2150000000000,
    peRatio: 73.2,
    forwardPE: 55.8,
    sector: 'Technology',
    industry: 'Semiconductors',
    lastUpdated: new Date().toISOString(),
    bid: 875.25,
    ask: 875.30,
    bidSize: 1500,
    askSize: 2000,
    lastTradePrice: 875.28,
    lastTradeSize: 600,
    lastTradeTime: new Date().toISOString(),
    open: 870.50,
    high: 880.20,
    low: 868.80,
    previousClose: 862.83,
    rsi: 68.5,
    macd: 8.45,
    macdSignal: 6.85,
    macdHistogram: 1.60,
    sma20: 850.50,
    sma50: 800.20,
    sma200: 600.80,
    bollingerUpper: 920.20,
    bollingerLower: 780.80,
    bollingerMiddle: 850.50,
    impliedVolatility: 0.35,
    putCallRatio: 0.65,
    openInterest: 300000,
    beta: 1.85,
    shortRatio: 3.2,
    shortPercent: 1.5,
    institutionalOwnership: 80.5,
    insiderOwnership: 0.12,
    returnOnEquity: 45.2,
    returnOnAssets: 25.8,
    debtToEquity: 0.18,
    currentRatio: 2.45,
    quickRatio: 2.25,
    grossMargin: 75.5,
    operatingMargin: 45.2,
    netMargin: 38.5,
    revenueGrowth: 45.8,
    earningsGrowth: 65.2,
  },
];

// Mock orders
const MOCK_ORDERS: Order[] = [
  {
    id: 'order_1',
    portfolioId: '1',
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    side: 'buy',
    orderType: 'limit',
    quantity: 100,
    limitPrice: 190.00,
    timeInForce: 'day',
    status: 'pending',
    filledQuantity: 0,
    orderDate: '2025-01-28T09:30:00Z',
    totalValue: 19000,
    fees: 0,
    routing: 'smart',
  },
  {
    id: 'order_2',
    portfolioId: '1',
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    side: 'sell',
    orderType: 'market',
    quantity: 25,
    timeInForce: 'day',
    status: 'filled',
    filledQuantity: 25,
    avgFillPrice: 378.85,
    orderDate: '2025-01-28T10:15:00Z',
    fillDate: '2025-01-28T10:15:30Z',
    totalValue: 9471.25,
    fees: 0,
    routing: 'smart',
  },
];

// Mock transactions
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn_1',
    type: 'trade',
    amount: -9471.25,
    description: 'Sold 25 MSFT @ $378.85',
    date: '2025-01-28T10:15:30Z',
    status: 'completed',
    symbol: 'MSFT',
    quantity: 25,
    price: 378.85,
    fees: 0,
  },
  {
    id: 'txn_2',
    type: 'dividend',
    amount: 24.00,
    description: 'AAPL Dividend Payment',
    date: '2025-01-27T09:00:00Z',
    status: 'completed',
    symbol: 'AAPL',
  },
  {
    id: 'txn_3',
    type: 'deposit',
    amount: 5000.00,
    description: 'Bank Transfer',
    date: '2025-01-26T14:30:00Z',
    status: 'completed',
  },
];

// Mock news
const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news_1',
    title: 'Apple Reports Strong Q4 Earnings, Beats Expectations',
    summary: 'Apple Inc. reported fourth-quarter earnings that exceeded analyst expectations, driven by strong iPhone sales and services revenue growth.',
    content: 'Apple Inc. (AAPL) today announced financial results for its fiscal 2024 fourth quarter ended September 28, 2024. The Company posted quarterly revenue of $89.5 billion, up 8 percent year over year, and quarterly earnings per diluted share of $1.46, up 13 percent year over year.',
    source: 'Reuters',
    timestamp: '2025-01-28T16:30:00Z',
    symbols: ['AAPL'],
    url: 'https://example.com/apple-earnings',
    sentiment: 'positive',
    impact: 'high',
    category: 'earnings',
  },
  {
    id: 'news_2',
    title: 'Federal Reserve Signals Potential Rate Cut in March',
    summary: 'The Federal Reserve indicated it may consider cutting interest rates as early as March, citing improved inflation data and economic stability.',
    source: 'Bloomberg',
    timestamp: '2025-01-28T15:45:00Z',
    symbols: [],
    url: 'https://example.com/fed-rate-cut',
    sentiment: 'positive',
    impact: 'high',
    category: 'monetary-policy',
  },
];

// Mock positions
const MOCK_POSITIONS: Position[] = [
  {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    quantity: 150,
    avgCost: 185.50,
    marketValue: 28879.50,
    unrealizedPnL: 1054.50,
    unrealizedPnLPercent: 3.78,
    realizedPnL: 0,
    dayPnL: 367.50,
    dayPnLPercent: 1.29,
    sector: 'Technology',
    lastPrice: 192.53,
    change: 2.45,
    changePercent: 1.29,
    beta: 1.15,
    weight: 19.25,
    marginUsed: 0,
    shortable: true,
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    quantity: 75,
    avgCost: 350.20,
    marketValue: 28413.75,
    unrealizedPnL: 2148.75,
    unrealizedPnLPercent: 8.18,
    realizedPnL: 0,
    dayPnL: 425.25,
    dayPnLPercent: 1.52,
    sector: 'Technology',
    lastPrice: 378.85,
    change: 5.67,
    changePercent: 1.52,
    beta: 0.95,
    weight: 18.94,
    marginUsed: 0,
    shortable: true,
  },
];

// Mock market indexes
const MOCK_MARKET_INDEXES: MarketIndex[] = [
  {
    symbol: 'SPY',
    name: 'S&P 500 ETF',
    value: 4850.25,
    change: 15.75,
    changePercent: 0.33,
    volume: 85000000,
    high: 4860.50,
    low: 4830.20,
    open: 4835.80,
    previousClose: 4834.50,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'QQQ',
    name: 'NASDAQ-100 ETF',
    value: 425.80,
    change: 8.45,
    changePercent: 2.02,
    volume: 65000000,
    high: 427.20,
    low: 420.50,
    open: 421.80,
    previousClose: 417.35,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'DIA',
    name: 'Dow Jones ETF',
    value: 375.45,
    change: 2.15,
    changePercent: 0.58,
    volume: 45000000,
    high: 376.80,
    low: 373.20,
    open: 374.50,
    previousClose: 373.30,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'IWM',
    name: 'Russell 2000 ETF',
    value: 195.80,
    change: -1.25,
    changePercent: -0.63,
    volume: 35000000,
    high: 197.50,
    low: 194.80,
    open: 196.20,
    previousClose: 197.05,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'VIX',
    name: 'Volatility Index',
    value: 18.50,
    change: -0.75,
    changePercent: -3.90,
    volume: 25000000,
    high: 19.20,
    low: 18.30,
    open: 19.10,
    previousClose: 19.25,
    lastUpdated: new Date().toISOString(),
  },
];

// Mock order book
const MOCK_ORDER_BOOK: OrderBook = {
  symbol: 'AAPL',
  timestamp: new Date().toISOString(),
  bids: [
    { price: 192.50, size: 1000, total: 1000, orders: 5 },
    { price: 192.45, size: 1500, total: 2500, orders: 8 },
    { price: 192.40, size: 2000, total: 4500, orders: 12 },
    { price: 192.35, size: 1200, total: 5700, orders: 6 },
    { price: 192.30, size: 1800, total: 7500, orders: 10 },
  ],
  asks: [
    { price: 192.55, size: 1500, total: 1500, orders: 7 },
    { price: 192.60, size: 2000, total: 3500, orders: 11 },
    { price: 192.65, size: 1200, total: 4700, orders: 6 },
    { price: 192.70, size: 1800, total: 6500, orders: 9 },
    { price: 192.75, size: 1000, total: 7500, orders: 5 },
  ],
  spread: 0.05,
  spreadPercent: 0.026,
};

// Mock time and sales
const MOCK_TIME_AND_SALES: TimeAndSales = {
  symbol: 'AAPL',
  trades: [
    {
      timestamp: new Date().toISOString(),
      price: 192.53,
      size: 500,
      side: 'buy',
      exchange: 'NASDAQ',
      tradeId: 'T123456',
      conditions: ['regular'],
    },
    {
      timestamp: new Date(Date.now() - 1000).toISOString(),
      price: 192.50,
      size: 300,
      side: 'sell',
      exchange: 'NASDAQ',
      tradeId: 'T123455',
      conditions: ['regular'],
    },
  ],
};

// Mock technical analysis
const MOCK_TECHNICAL_ANALYSIS: TechnicalAnalysis = {
  symbol: 'AAPL',
  timestamp: new Date().toISOString(),
  signals: {
    overall: 'buy',
    strength: 75,
    movingAverages: 'buy',
    technicalIndicators: 'buy',
    summary: 'Strong bullish signals with RSI in neutral territory and MACD showing positive momentum.',
  },
  indicators: {
    rsi: 65.4,
    macd: 2.15,
    macdSignal: 1.85,
    macdHistogram: 0.30,
    sma20: 188.50,
    sma50: 185.20,
    sma200: 175.80,
    ema12: 190.20,
    ema26: 187.50,
    bollingerUpper: 195.20,
    bollingerLower: 181.80,
    bollingerMiddle: 188.50,
    stochasticK: 75.5,
    stochasticD: 72.3,
    williamsR: -25.5,
    cci: 125.8,
    adx: 28.5,
    atr: 8.5,
  },
  support: [185.50, 180.20, 175.80],
  resistance: [195.20, 200.50, 205.80],
  pivotPoints: {
    pp: 192.53,
    r1: 195.20,
    r2: 197.85,
    r3: 200.50,
    s1: 189.85,
    s2: 187.20,
    s3: 184.55,
  },
};

// Mock risk metrics
const MOCK_RISK_METRICS: RiskMetrics = {
  symbol: 'AAPL',
  beta: 1.15,
  alpha: 2.5,
  sharpeRatio: 1.85,
  sortinoRatio: 2.15,
  maxDrawdown: -12.5,
  volatility: 18.5,
  var95: -2500,
  var99: -3500,
  expectedReturn: 12.5,
  downsideDeviation: 8.5,
  informationRatio: 0.85,
  treynorRatio: 0.95,
  calmarRatio: 1.25,
};

// Mock portfolio analytics
const MOCK_PORTFOLIO_ANALYTICS: PortfolioAnalytics = {
  totalValue: 150000,
  totalCost: 142500,
  totalGainLoss: 7500,
  totalGainLossPercent: 5.26,
  dayGainLoss: 792.75,
  dayGainLossPercent: 0.53,
  monthGainLoss: 2500,
  monthGainLossPercent: 1.69,
  yearGainLoss: 7500,
  yearGainLossPercent: 5.26,
  beta: 1.05,
  alpha: 1.8,
  sharpeRatio: 1.85,
  volatility: 15.2,
  maxDrawdown: -8.5,
  sectorAllocation: {
    'Technology': 75.5,
    'Healthcare': 15.2,
    'Financial': 9.3,
  },
  topHoldings: MOCK_POSITIONS,
  performanceHistory: [
    { date: '2025-01-28', value: 150000, gainLoss: 792.75, gainLossPercent: 0.53 },
    { date: '2025-01-27', value: 149207.25, gainLoss: -500, gainLossPercent: -0.33 },
  ],
};

// Mock market movers
const MOCK_MARKET_MOVERS: MarketMovers = {
  gainers: MOCK_MARKET_DATA.filter(stock => stock.changePercent > 0).slice(0, 10),
  losers: MOCK_MARKET_DATA.filter(stock => stock.changePercent < 0).slice(0, 10),
  mostActive: MOCK_MARKET_DATA.sort((a, b) => b.volume - a.volume).slice(0, 10),
  highestVolume: MOCK_MARKET_DATA.sort((a, b) => b.volume - a.volume).slice(0, 10),
  highestValue: MOCK_MARKET_DATA.sort((a, b) => b.marketCap - a.marketCap).slice(0, 10),
};

// Mock sector performance
const MOCK_SECTOR_PERFORMANCE: SectorPerformance[] = [
  {
    sector: 'Technology',
    change: 2.5,
    changePercent: 1.85,
    volume: 150000000,
    marketCap: 8500000000000,
    topGainers: ['NVDA', 'MSFT', 'AAPL'],
    topLosers: ['TSLA'],
  },
  {
    sector: 'Healthcare',
    change: -0.8,
    changePercent: -0.45,
    volume: 45000000,
    marketCap: 3200000000000,
    topGainers: ['JNJ'],
    topLosers: ['PFE', 'UNH'],
  },
  {
    sector: 'Financial',
    change: 1.2,
    changePercent: 0.85,
    volume: 35000000,
    marketCap: 2800000000000,
    topGainers: ['JPM', 'BAC'],
    topLosers: ['WFC'],
  },
];

export function useTrading() {
  const [user] = useState<User>(MOCK_USER);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([
    {
      id: 'watchlist_1',
      name: 'My Watchlist',
      symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
      createdDate: '2025-01-20',
      description: 'My main watchlist',
      isDefault: true,
    },
  ]);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [news] = useState<NewsItem[]>(MOCK_NEWS);
  const [positions] = useState<Position[]>(MOCK_POSITIONS);
  const [marketIndexes] = useState<MarketIndex[]>(MOCK_MARKET_INDEXES);
  const [orderBook] = useState<OrderBook>(MOCK_ORDER_BOOK);
  const [timeAndSales] = useState<TimeAndSales>(MOCK_TIME_AND_SALES);
  const [technicalAnalysis] = useState<TechnicalAnalysis>(MOCK_TECHNICAL_ANALYSIS);
  const [riskMetrics] = useState<RiskMetrics>(MOCK_RISK_METRICS);
  const [portfolioAnalytics] = useState<PortfolioAnalytics>(MOCK_PORTFOLIO_ANALYTICS);
  const [marketMovers] = useState<MarketMovers>(MOCK_MARKET_MOVERS);
  const [sectorPerformance] = useState<SectorPerformance[]>(MOCK_SECTOR_PERFORMANCE);

  const marketData = useMemo(() => MOCK_MARKET_DATA, []);

  const accountBalance = useMemo((): AccountBalance => {
    const totalValue = user.totalAccountValue;
    const stockValue = totalValue * 0.83; // 83% in stocks
    const cashBalance = totalValue - stockValue;
    const marginUsed = stockValue * 0.1; // 10% margin usage
    
    return {
      totalValue,
      cashBalance,
      stockValue,
      optionValue: 0,
      buyingPower: user.buyingPower,
      dayTradingBuyingPower: user.dayTradingBuyingPower,
      marginUsed,
      maintenanceMargin: marginUsed * 0.25,
      marginLevel: user.marginLevel,
      availableFunds: user.buyingPower,
      settledFunds: user.buyingPower * 0.8,
      unsettledFunds: user.buyingPower * 0.2,
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      marginExcess: user.buyingPower - marginUsed,
      marginDeficit: 0,
      netLiquidationValue: totalValue,
      totalCashValue: cashBalance,
      totalSecuritiesValue: stockValue,
      totalOptionsValue: 0,
      totalCommoditiesValue: 0,
      totalFuturesValue: 0,
      totalForexValue: 0,
      totalBondsValue: 0,
      totalMutualFundsValue: 0,
      totalETFsValue: 0,
      totalOtherValue: 0,
    };
  }, [user]);

  const getMarketData = (symbol: string) => {
    return marketData.find(data => data.symbol === symbol);
  };

  const placeOrder = (orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => {
    const newOrder: Order = {
      ...orderData,
      id: `order_${Date.now()}`,
      orderDate: new Date().toISOString(),
      status: 'pending',
      filledQuantity: 0,
    };

    setOrders(prev => [newOrder, ...prev]);

    // Simulate order execution for market orders
    if (orderData.orderType === 'market') {
      setTimeout(() => {
        setOrders(prev => prev.map(order => 
          order.id === newOrder.id 
            ? { ...order, status: 'filled', filledQuantity: order.quantity, avgFillPrice: orderData.limitPrice || getMarketData(orderData.symbol)?.currentPrice || 0, fillDate: new Date().toISOString() }
            : order
        ));

        // Create trade record
        const trade: Trade = {
          id: `trade_${Date.now()}`,
          orderId: newOrder.id,
          portfolioId: orderData.portfolioId,
          symbol: orderData.symbol,
          side: orderData.side,
          quantity: orderData.quantity,
          price: orderData.limitPrice || getMarketData(orderData.symbol)?.currentPrice || 0,
          totalValue: orderData.totalValue,
          fees: orderData.fees,
          timestamp: new Date().toISOString(),
          exchange: 'NASDAQ',
          tradeId: `T${Date.now()}`,
        };

        setTrades(prev => [trade, ...prev]);
      }, 1000);
    }
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: 'cancelled' }
        : order
    ));
  };

  const addToWatchlist = (watchlistId: string, symbol: string) => {
    setWatchlists(prev => prev.map(watchlist => 
      watchlist.id === watchlistId
        ? { ...watchlist, symbols: [...new Set([...watchlist.symbols, symbol])] }
        : watchlist
    ));
  };

  const removeFromWatchlist = (watchlistId: string, symbol: string) => {
    setWatchlists(prev => prev.map(watchlist => 
      watchlist.id === watchlistId
        ? { ...watchlist, symbols: watchlist.symbols.filter(s => s !== symbol) }
        : watchlist
    ));
  };

  const createWatchlist = (name: string) => {
    const newWatchlist: Watchlist = {
      id: `watchlist_${Date.now()}`,
      name,
      symbols: [],
      createdDate: new Date().toISOString(),
      description: `Watchlist: ${name}`,
      isDefault: false,
    };
    setWatchlists(prev => [...prev, newWatchlist]);
  };

  return {
    user,
    orders,
    trades,
    watchlists,
    transactions,
    news,
    marketData,
    positions,
    marketIndexes,
    orderBook,
    timeAndSales,
    technicalAnalysis,
    riskMetrics,
    portfolioAnalytics,
    marketMovers,
    sectorPerformance,
    accountBalance,
    placeOrder,
    cancelOrder,
    addToWatchlist,
    removeFromWatchlist,
    createWatchlist,
    getMarketData,
  };
}