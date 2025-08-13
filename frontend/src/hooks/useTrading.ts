import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectRealtime } from '@/services/realtime';
import { OpenAPI } from '@/client';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';

const WS_PATH = '/api/v1/utils/ws';

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

  const { data: marketData = [] } = useQuery({
    queryKey: ['market-list'],
    queryFn: async () => {
      const res = await fetch(`${OpenAPI.BASE}/market/stocks`)
      return (await res.json()) as any[]
    },
  })

  useEffect(() => {
    const wsBase = (OpenAPI.BASE || '').replace(/^http/, 'ws')
    const wsUrl = `${wsBase}${WS_PATH}`
    const disconnect = connectRealtime(wsUrl, (msg) => {
      if (msg.type === 'stock_update') {
        queryClient.invalidateQueries({ queryKey: ['market-list'] })
      }
    })
    return () => disconnect()
  }, [queryClient])

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
    return (marketData as any[]).find((d) => d.symbol === symbol)
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