import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';

// Mock market data (will be replaced with real API)
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

// Mock news (will be replaced with real API)
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
  const queryClient = useQueryClient();

  // Mock user data (will be replaced with real API)
  const [user] = useState<User>({
    id: 'user_1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    avatar: undefined,
    accountNumber: 'ACC-789012345',
    accountType: 'premium',
    joinDate: '2022-01-15',
    totalAccountValue: 150000,
    buyingPower: 25000,
    dayTradingBuyingPower: 100000,
  });

  // Fetch orders from API
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      // TODO: Replace with real API call
      return [];
    }
  });

  // Fetch trades from API
  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: async () => {
      // TODO: Replace with real API call
      return [];
    }
  });

  // Fetch watchlists from API
  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists'],
    queryFn: async () => {
      // TODO: Replace with real API call
      return [{
        id: 'watchlist_1',
        name: 'My Watchlist',
        symbols: ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'],
        createdDate: '2025-01-20',
      }];
    }
  });

  // Mock transactions (will be replaced with real API)
  const [transactions] = useState<Transaction[]>([
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
  ]);

  const marketData = useMemo(() => MOCK_MARKET_DATA, []);
  const news = useMemo(() => MOCK_NEWS, []);

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

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => {
      // TODO: Replace with real API call
      const newOrder: Order = {
        ...orderData,
        id: `order_${Date.now()}`,
        orderDate: new Date().toISOString(),
        status: 'pending',
        filledQuantity: 0,
      };
      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // TODO: Replace with real API call
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const getMarketData = (symbol: string) => {
    return marketData.find(data => data.symbol === symbol);
  };

  const placeOrder = (orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => {
    placeOrderMutation.mutate(orderData);
    
    // Simulate order execution for market orders
    if (orderData.orderType === 'market') {
      setTimeout(() => {
        const marketPrice = getMarketData(orderData.symbol)?.currentPrice || 0;
        const fillPrice = marketPrice * (1 + (Math.random() - 0.5) * 0.001); // Small random spread

        // Create trade record
        const trade: Trade = {
          id: `trade_${Date.now()}`,
          orderId: `order_${Date.now()}`,
          portfolioId: orderData.portfolioId,
          symbol: orderData.symbol,
          side: orderData.side,
          quantity: orderData.quantity,
          price: fillPrice,
          totalValue: orderData.quantity * fillPrice,
          fees: 0,
          timestamp: new Date().toISOString(),
        };

        // TODO: Add trade to API
        console.log('Trade executed:', trade);
      }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
    }

    return `order_${Date.now()}`;
  };

  const cancelOrder = (orderId: string) => {
    cancelOrderMutation.mutate(orderId);
  };

  const addToWatchlist = (symbol: string, watchlistId?: string) => {
    // TODO: Implement with real API
    console.log('Add to watchlist:', symbol, watchlistId);
  };

  const removeFromWatchlist = (watchlistId: string, symbol: string) => {
    // TODO: Implement with real API
    console.log('Remove from watchlist:', watchlistId, symbol);
  };

  const createWatchlist = (name: string) => {
    // TODO: Implement with real API
    const newWatchlistId = `watchlist_${Date.now()}`;
    console.log('Create watchlist:', name, newWatchlistId);
    return newWatchlistId;
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