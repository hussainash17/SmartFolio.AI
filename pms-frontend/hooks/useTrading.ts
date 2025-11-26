import { useMemo, useState } from 'react';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';
import { MarketService, NewsService, OrdersService, OpenAPI, WatchlistService, AlertsService } from '../src/client';
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

  const queryClient = useQueryClient();

  const { data: marketData = [] } = useQuery({
    queryKey: queryKeys.marketList(500, 0),
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const pageSize = 200;
      let offset = 0;
      const seen = new Set<string>();
      const allRows: any[] = [];

      while (true) {
        const page = (await MarketService.listStocks({ limit: pageSize, offset })) as any[];
        const rows = page || [];
        if (!rows.length) {
          break;
        }
        for (const row of rows) {
          const symbol: string = String(row?.symbol || '').toUpperCase();
          if (!symbol || seen.has(symbol)) continue;
          seen.add(symbol);
          allRows.push(row);
        }
        if (rows.length < pageSize) {
          break;
        }
        offset += pageSize;
        if (offset >= 2000) {
          // Safety guard to avoid unexpectedly large loops
          break;
        }
      }

      const mapped: MarketData[] = allRows.map((it: any) => ({
        symbol: String(it.symbol || '').toUpperCase(),
        companyName: it.company_name || it.name || String(it.symbol || '').toUpperCase(),
        currentPrice: Number(it.last || 0),
        change: Number(it.change || 0),
        changePercent: Number(it.change_percent || 0),
        volume: Number(it.volume || 0),
        high52Week: 0,
        low52Week: 0,
        marketCap: (() => {
            const lastPrice = Number(it.last || 0);
            const totalSecurities = Number(it.total_outstanding_securities || 0);
            // Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
            // 1 crore = 10,000,000
            return lastPrice > 0 && totalSecurities > 0 
                ? (lastPrice * totalSecurities) / 10_000_000 
                : Number(it.market_cap || 0);
        })(),
        peRatio: undefined,
        dividend: undefined,
        dividendYield: undefined,
        sector: it.sector || 'Unknown',
        industry: it.industry || 'Unknown',
        lastUpdated: it.timestamp || new Date().toISOString(),
      }));

      return mapped.sort((a, b) => a.symbol.localeCompare(b.symbol));
    },
    staleTime: 30 * 1000,
  });

  const { data: news = [] } = useQuery({
    queryKey: queryKeys.newsList(20, 0),
    enabled: !!(OpenAPI as any).TOKEN,
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

  const fetchWatchlistItems = async (watchlistId: string) => {
    try {
      const items = await WatchlistService.getWatchlistItemsWithDetails({ watchlistId });
      const symbols = (items as any[]).map((row: any) => String(row?.stock?.symbol || ''))
        .filter(Boolean);
      return Array.from(new Set(symbols));
    } catch {
      return [] as string[];
    }
  };

  const { data: watchlists = [] } = useQuery({
    queryKey: queryKeys.watchlists,
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const lists = await WatchlistService.getUserWatchlists();
      const enriched = await Promise.all((lists as any[]).map(async (wl: any) => {
        const symbols = await fetchWatchlistItems(String(wl.id));
        return {
          id: String(wl.id),
          name: wl.name,
          createdDate: wl.created_at,
          symbols,
          description: wl.description || '',
          isDefault: !!wl.is_default,
        } as Watchlist;
      }));
      return enriched;
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: queryKeys.ordersList,
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/orders/with-details`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return [] as Order[];
      const apiOrders = await res.json();
      return (apiOrders as any[]).map((o: any) => ({
        id: String(o.id),
        portfolioId: o.portfolio_id ? String(o.portfolio_id) : '',
        symbol: o.symbol || '',
        companyName: o.company_name || '',
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
    queryKey: ['trading', 'dashboard-summary'],
    enabled: !!(OpenAPI as any).TOKEN,
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

  // Funds: summary + transactions
  const { data: fundsSummary = { cash_balance: 0, buying_power: 0, credit_limit: 0 } } = useQuery({
    queryKey: queryKeys.fundsSummary,
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/funds/summary`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return { cash_balance: 0, buying_power: 0, credit_limit: 0 };
      return await res.json();
    },
    staleTime: 15 * 1000,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: queryKeys.transactions,
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/funds/transactions`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return [] as Transaction[];
      const rows = await res.json();
      const mapped: Transaction[] = (rows as any[]).map((t: any) => ({
        id: String(t.id),
        type: String(t.type || '').toLowerCase() as any,
        amount: Number(t.amount || 0) * (String(t.type).toUpperCase() === 'WITHDRAWAL' ? -1 : 1),
        description: t.description || '',
        date: t.created_at,
        status: 'completed',
      }));
      return mapped;
    },
    staleTime: 15 * 1000,
  });

  const { data: trades = [] } = useQuery({
    queryKey: queryKeys.recentTrades(50),
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolio/trades/recent?limit=50`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return [] as Trade[];
      const apiTrades = await res.json();
      return (apiTrades as any[]).map((t: any) => ({
        id: String(t.id),
        orderId: '',
        portfolioId: t.portfolio_id ? String(t.portfolio_id) : '',
        symbol: t.symbol || '',
        side: String(t.trade_type || '').toLowerCase() as any,
        quantity: Number(t.quantity || 0),
        price: Number(t.price || 0),
        totalValue: Number(t.total_amount || (Number(t.price || 0) * Number(t.quantity || 0))),
        fees: Number(t.commission || 0),
        timestamp: t.trade_date,
      })) as Trade[];
    },
  });

  const accountBalance: AccountBalance = useMemo(() => {
    return {
      totalValue: Number(dashboard.total_portfolio_value || 0),
      stockValue: Number(dashboard.stock_value || 0),
      cashBalance: Number(dashboard.cash_balance || fundsSummary.cash_balance || 0),
      buyingPower: Number(dashboard.buying_power || fundsSummary.buying_power || 0),
      dayTradingBuyingPower: Number(dashboard.buying_power || fundsSummary.buying_power || 0),
      marginUsed: 0,
      maintenanceMargin: 0,
      dayChange: Number(dashboard.day_change || 0),
      dayChangePercent: Number(dashboard.day_change_percent || 0),
    };
  }, [dashboard, fundsSummary]);

  const placeOrderMutation = useMutation({
    mutationFn: async (orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => {
      let stockId: string | undefined;
      try {
        const stockResp = await MarketService.getStock({ symbol: orderData.symbol });
        stockId = (stockResp as any)?.id as string | undefined;
      } catch {
        const stocks = (await MarketService.listStocks({ q: orderData.symbol, limit: 1 })) as any[];
        stockId = stocks && stocks[0]?.id;
      }
      if (!stockId) {
        throw new Error(`Unknown symbol: ${orderData.symbol}`);
      }
      const created = await OrdersService.createOrder({
        requestBody: {
          stock_id: stockId,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });

  const addToWatchlist = async (...args: any[]) => {
    let symbol: string | undefined;
    let targetWatchlistId: string | undefined;
    if (args.length === 1) {
      symbol = String(args[0] ?? '');
    } else if (args.length >= 2) {
      targetWatchlistId = String(args[0] ?? '');
      symbol = String(args[1] ?? '');
    }
    if (!symbol) return;
    if (!targetWatchlistId) {
      targetWatchlistId = (watchlists[0]?.id as string | undefined);
    }
    if (!targetWatchlistId) return;
    const stocks = (await MarketService.listStocks({ q: symbol, limit: 1 })) as any[];
    const stock = stocks && stocks[0];
    if (!stock) return;
    await WatchlistService.addWatchlistItem({
      watchlistId: targetWatchlistId,
      requestBody: { stock_id: stock.id },
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlists });
  };

  const removeFromWatchlist = async (watchlistId: string, symbol: string) => {
    const base = (OpenAPI as any).BASE || '';
    const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/watchlist/${watchlistId}/items/with-details`, {
      headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
      credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
    });
    if (!res.ok) return;
    const rows = await res.json();
    const row = (rows as any[]).find((r: any) => String(r?.stock?.symbol || '') === symbol);
    if (!row) return;
    await WatchlistService.removeWatchlistItem({ watchlistId, itemId: String(row.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlists });
  };

  const updateWatchlistItemNote = async (watchlistId: string, symbol: string, notes: string) => {
    const base = (OpenAPI as any).BASE || '';
    const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/watchlist/${watchlistId}/items/with-details`, {
      headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
      credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
    });
    if (!res.ok) return;
    const rows = await res.json();
    const row = (rows as any[]).find((r: any) => String(r?.stock?.symbol || '') === symbol);
    if (!row) return;
    await WatchlistService.updateWatchlistItem({ watchlistId, itemId: String(row.id), notes });
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlists });
  };

  const createWatchlist = async (name: string, description?: string, is_default?: boolean) => {
    const created = await WatchlistService.createWatchlist({ requestBody: { name, description, is_default } });
    queryClient.invalidateQueries({ queryKey: queryKeys.watchlists });
    return created.id as string;
  };

  const deposit = async (amount: number, portfolioId?: string) => {
    const base = (OpenAPI as any).BASE || '';
    await fetch(`${String(base).replace(/\/$/, '')}/api/v1/funds/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : {},
      },
      credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      body: JSON.stringify({
        amount,
        portfolio_id: portfolioId || undefined,
      }),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
  };

  const withdraw = async (amount: number, portfolioId?: string) => {
    const base = (OpenAPI as any).BASE || '';
    await fetch(`${String(base).replace(/\/$/, '')}/api/v1/funds/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : {},
      },
      credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      body: JSON.stringify({
        amount,
        portfolio_id: portfolioId || undefined,
      }),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
  };

  const updateCreditLimit = async (credit_limit: number) => {
    const base = (OpenAPI as any).BASE || '';
    await fetch(`${String(base).replace(/\/$/, '')}/api/v1/funds/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : {},
      },
      credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      body: JSON.stringify({ credit_limit }),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
  };

  const getMarketData = (symbol: string) => {
    return marketData.find((data) => data.symbol === symbol);
  };

  const placeOrder = async (
    orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>
  ) => {
    try {
      const created = await placeOrderMutation.mutateAsync(orderData);
      return String((created as any)?.id ?? `order_${Date.now()}`);
    } catch {
      const fallbackId = `order_${Date.now()}`;
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

  const createAlert = async (payload: { stock_id?: string; alert_type: string; condition: string; target_value: number; notification_method?: string; is_recurring?: boolean; frequency?: string | null; notes?: string | null; }) => {
    const created = await AlertsService.createAlert({ requestBody: {
      stock_id: payload.stock_id,
      alert_type: payload.alert_type,
      condition: payload.condition,
      target_value: payload.target_value as unknown as any,
      notification_method: payload.notification_method || 'in_app',
      is_recurring: payload.is_recurring || false,
      frequency: payload.frequency || null,
      notes: payload.notes || null,
    }});
    return created;
  };

  const deleteAlert = async (alertId: string) => {
    await AlertsService.deleteAlert({ alertId });
  };

  const evaluateAlert = async (alertId: string) => {
    return await AlertsService.evaluateAlert({ alertId });
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
    updateWatchlistItemNote: updateWatchlistItemNote,
    createWatchlist,
    createAlert,
    deleteAlert,
    evaluateAlert,
    fetchWatchlistItems,
    deposit,
    withdraw,
    updateCreditLimit,
  };
}