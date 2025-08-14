import { useMemo, useState } from 'react';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';
import { MarketService, NewsService, OrdersService, OpenAPI } from '../src/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function useTrading() {
  const [user] = useState<User>({
    id: 'me',
    name: 'User',
    email: 'user@example.com',
    firstName: 'User',
    lastName: 'Example',
    avatar: undefined,
    accountNumber: 'N/A',
    accountType: 'standard',
    joinDate: new Date().toISOString().split('T')[0],
    totalAccountValue: 0,
    buyingPower: 0,
    dayTradingBuyingPower: 0,
  });

  const [trades] = useState<Trade[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [transactions] = useState<Transaction[]>([]);

  const queryClient = useQueryClient();

  const { data: marketData = [] } = useQuery({
    queryKey: queryKeys.marketList(50, 0),
    queryFn: async () => {
      const list = (await MarketService.listStocks({ limit: 50, offset: 0 })) as any[];
      const mapped: MarketData[] = (list || []).map((it: any) => ({
        symbol: it.symbol,
        companyName: it.company_name,
        currentPrice: Number(it.last || 0),
        change: Number(it.change || 0),
        changePercent: Number(it.change_percent || 0),
        volume: Number(it.volume || 0),
        high52Week: 0,
        low52Week: 0,
        marketCap: Number(it.market_cap || 0),
        peRatio: undefined,
        dividend: undefined,
        dividendYield: undefined,
        sector: it.sector || 'Unknown',
        industry: it.industry || 'Unknown',
        lastUpdated: it.timestamp || new Date().toISOString(),
      }));
      return mapped;
    },
    staleTime: 30 * 1000,
  });

  const { data: news = [] } = useQuery({
    queryKey: queryKeys.newsList(20, 0),
    queryFn: async () => {
      const newsList = await NewsService.listNews({ limit: 20, offset: 0 });
      return (newsList as any[]).map((n: any) => ({
        id: String(n.id),
        title: n.title,
        summary: n.summary || n.content?.slice(0, 140) || '',
        source: n.source,
        timestamp: n.published_at,
        url: n.source_url || '#',
      })) as NewsItem[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.ordersList,
    queryFn: async () => {
      const apiOrders = await OrdersService.getUserOrders();
      return (apiOrders as any[]).map((o: any) => ({
        id: String(o.id),
        portfolioId: o.portfolio_id ? String(o.portfolio_id) : '',
        symbol: '',
        companyName: '',
        side: String(o.side || '').toLowerCase() as any,
        orderType: String(o.order_type || '').toLowerCase().replace('_', '-') as any,
        quantity: Number(o.quantity || 0),
        limitPrice: o.price ? Number(o.price) : undefined,
        stopPrice: o.stop_price ? Number(o.stop_price) : undefined,
        timeInForce: String(o.validity || 'DAY').toLowerCase() as any,
        status: String(o.status || 'PENDING').toLowerCase() as any,
        filledQuantity: Number(o.filled_quantity || 0),
        avgFillPrice: o.average_price ? Number(o.average_price) : undefined,
        orderDate: o.placed_at,
        fillDate: o.filled_at || undefined,
        totalValue: o.total_amount ? Number(o.total_amount) : Number(o.quantity || 0) * Number(o.price || 0),
        fees: o.commission ? Number(o.commission) : 0,
      })) as Order[];
    },
  });

  const { data: dashboard = { total_portfolio_value: 0, cash_balance: 0, stock_value: 0, buying_power: 0, day_change: 0, day_change_percent: 0 } } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/dashboard/summary`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return { total_portfolio_value: 0, cash_balance: 0, stock_value: 0, buying_power: 0, day_change: 0, day_change_percent: 0 };
      const data = await res.json();
      return {
        total_portfolio_value: Number(data.total_portfolio_value || 0),
        cash_balance: Number(data.cash_balance || 0),
        stock_value: Number(data.stock_value || 0),
        buying_power: Number(data.buying_power || 0),
        day_change: Number(data.day_change || 0),
        day_change_percent: Number(data.day_change_percent || 0),
      };
    },
    staleTime: 30 * 1000,
  });

  const accountBalance: AccountBalance = useMemo(() => {
    return {
      totalValue: Number(dashboard.total_portfolio_value || 0),
      stockValue: Number(dashboard.stock_value || 0),
      cashBalance: Number(dashboard.cash_balance || 0),
      buyingPower: Number(dashboard.buying_power || 0),
      dayTradingBuyingPower: Number(dashboard.buying_power || 0),
      marginUsed: 0,
      maintenanceMargin: 0,
      dayChange: Number(dashboard.day_change || 0),
      dayChangePercent: Number(dashboard.day_change_percent || 0),
    };
  }, [dashboard]);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => {
      const stocks = (await MarketService.listStocks({ q: orderData.symbol, limit: 1 })) as any[];
      const stock = stocks && stocks[0];
      const created = await OrdersService.createOrder({
        requestBody: {
          stock_id: stock?.id,
          portfolio_id: orderData.portfolioId || undefined,
          order_type: (orderData.orderType || 'market').toUpperCase().replace('-', '_') as any,
          side: (orderData.side || 'buy').toUpperCase() as any,
          quantity: orderData.quantity,
          price: orderData.limitPrice,
          stop_price: orderData.stopPrice,
          validity: (orderData.timeInForce || 'day').toUpperCase() as any,
          notes: undefined,
          is_simulated: true,
        },
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersList });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await OrdersService.cancelOrder({ orderId });
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ordersList });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const getMarketData = (symbol: string) => {
    return marketData.find((data) => data.symbol === symbol);
  };

  const placeOrder = async (
    orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>
  ) => {
    try {
      const created = await placeOrderMutation.mutateAsync(orderData);
      // Return an ID if possible else fallback
      return String((created as any)?.id ?? `order_${Date.now()}`);
    } catch {
      const fallbackId = `order_${Date.now()}`;
      // Optimistic fallback is not persisted in query cache; leave for now
      return fallbackId;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync(orderId);
    } catch {
      // no-op
    }
  };

  const addToWatchlist = (symbol: string, watchlistId?: string) => {
    const targetWatchlistId = watchlistId || watchlists[0]?.id;
    if (!targetWatchlistId) return;
    setWatchlists((prev) =>
      prev.map((watchlist) =>
        watchlist.id === targetWatchlistId
          ? { ...watchlist, symbols: [...new Set([...watchlist.symbols, symbol])] }
          : watchlist
      )
    );
  };

  const removeFromWatchlist = (watchlistId: string, symbol: string) => {
    setWatchlists((prev) =>
      prev.map((watchlist) =>
        watchlist.id === watchlistId
          ? { ...watchlist, symbols: watchlist.symbols.filter((s) => s !== symbol) }
          : watchlist
      )
    );
  };

  const createWatchlist = (name: string) => {
    const newWatchlist: Watchlist = {
      id: `watchlist_${Date.now()}`,
      name,
      symbols: [],
      createdDate: new Date().toISOString().split('T')[0],
    };
    setWatchlists((prev) => [...prev, newWatchlist]);
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