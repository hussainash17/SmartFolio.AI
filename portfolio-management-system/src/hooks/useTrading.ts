import { useState, useMemo } from 'react';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';

// Mock user data
const MOCK_USER: User = {
  id: 'user_1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  avatar: undefined, // No avatar URL for now
  accountNumber: 'ACC-789012345',
  accountType: 'premium',
  joinDate: '2022-01-15',
  totalAccountValue: 150000,
  buyingPower: 25000,
  dayTradingBuyingPower: 100000,
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
    high52Week: 199.62,
    low52Week: 164.08,
    marketCap: 2980000000000,
    peRatio: 29.8,
    dividend: 0.24,
    dividendYield: 0.50,
    sector: 'Technology',
    industry: 'Consumer Electronics',
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'GOOGL',
    companyName: 'Alphabet Inc.',
    currentPrice: 138.21,
    change: -1.15,
    changePercent: -0.82,
    volume: 23456789,
    high52Week: 152.15,
    low52Week: 121.46,
    marketCap: 1750000000000,
    peRatio: 24.5,
    sector: 'Technology',
    industry: 'Internet Software & Services',
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'MSFT',
    companyName: 'Microsoft Corporation',
    currentPrice: 378.85,
    change: 5.67,
    changePercent: 1.52,
    volume: 34567890,
    high52Week: 384.52,
    low52Week: 309.45,
    marketCap: 2850000000000,
    peRatio: 32.1,
    dividend: 0.75,
    dividendYield: 0.79,
    sector: 'Technology',
    industry: 'Software & Programming',
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'TSLA',
    companyName: 'Tesla, Inc.',
    currentPrice: 248.42,
    change: -8.23,
    changePercent: -3.20,
    volume: 89012345,
    high52Week: 299.29,
    low52Week: 152.37,
    marketCap: 790000000000,
    peRatio: 65.4,
    sector: 'Consumer Cyclical',
    industry: 'Auto Manufacturers',
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'NVDA',
    companyName: 'NVIDIA Corporation',
    currentPrice: 875.28,
    change: 12.45,
    changePercent: 1.44,
    volume: 56789012,
    high52Week: 950.02,
    low52Week: 200.02,
    marketCap: 2150000000000,
    peRatio: 73.2,
    sector: 'Technology',
    industry: 'Semiconductors',
    lastUpdated: new Date().toISOString(),
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
  },
];

// Mock transactions
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn_1',
    type: 'deposit',
    amount: 10000,
    description: 'Bank transfer deposit',
    date: '2025-01-27',
    status: 'completed',
  },
  {
    id: 'txn_2',
    type: 'trade',
    amount: -9471.25,
    description: 'Sold 25 shares of MSFT',
    date: '2025-01-28',
    status: 'completed',
  },
  {
    id: 'txn_3',
    type: 'dividend',
    amount: 120.50,
    description: 'AAPL dividend payment',
    date: '2025-01-25',
    status: 'completed',
  },
];

// Mock news
const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news_1',
    title: 'Apple Reports Strong Q4 Earnings Beat',
    summary: 'Apple Inc. reported quarterly earnings that exceeded analyst expectations, driven by strong iPhone sales and services revenue.',
    source: 'MarketWatch',
    timestamp: '2025-01-28T08:30:00Z',
    symbols: ['AAPL'],
    url: '#',
  },
  {
    id: 'news_2',
    title: 'Tech Stocks Rally on AI Optimism',
    summary: 'Technology stocks surged in pre-market trading as investors showed renewed optimism about artificial intelligence developments.',
    source: 'Reuters',
    timestamp: '2025-01-28T07:45:00Z',
    symbols: ['NVDA', 'MSFT', 'GOOGL'],
    url: '#',
  },
  {
    id: 'news_3',
    title: 'Federal Reserve Signals Potential Rate Cut',
    summary: 'Federal Reserve officials hinted at possible interest rate reductions in upcoming meetings, boosting market sentiment.',
    source: 'Bloomberg',
    timestamp: '2025-01-28T06:00:00Z',
    url: '#',
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
    },
  ]);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [news] = useState<NewsItem[]>(MOCK_NEWS);

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
      buyingPower: user.buyingPower,
      dayTradingBuyingPower: user.dayTradingBuyingPower,
      marginUsed,
      maintenanceMargin: marginUsed * 0.25,
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
        const marketPrice = getMarketData(orderData.symbol)?.currentPrice || 0;
        const fillPrice = marketPrice * (1 + (Math.random() - 0.5) * 0.001); // Small random spread

        setOrders(prev => prev.map(order => 
          order.id === newOrder.id 
            ? {
                ...order,
                status: 'filled' as const,
                filledQuantity: order.quantity,
                avgFillPrice: fillPrice,
                fillDate: new Date().toISOString(),
              }
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
          price: fillPrice,
          totalValue: orderData.quantity * fillPrice,
          fees: 0,
          timestamp: new Date().toISOString(),
        };

        setTrades(prev => [trade, ...prev]);
      }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
    }

    return newOrder.id;
  };

  const cancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId && order.status === 'pending'
        ? { ...order, status: 'cancelled' as const }
        : order
    ));
  };

  const addToWatchlist = (symbol: string, watchlistId?: string) => {
    const targetWatchlistId = watchlistId || watchlists[0]?.id;
    if (!targetWatchlistId) return;

    setWatchlists(prev => prev.map(watchlist => 
      watchlist.id === targetWatchlistId
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
      createdDate: new Date().toISOString().split('T')[0],
    };
    setWatchlists(prev => [...prev, newWatchlist]);
    return newWatchlist.id;
  };

  return {
    user,
    orders,
    trades,
    watchlists,
    transactions,
    news,
    marketData,
    accountBalance,
    getMarketData,
    placeOrder,
    cancelOrder,
    addToWatchlist,
    removeFromWatchlist,
    createWatchlist,
  };
}