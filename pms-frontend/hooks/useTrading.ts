import { useEffect, useMemo, useState } from 'react';
import { User, Order, Trade, MarketData, Watchlist, Transaction, NewsItem, AccountBalance } from '../types/trading';
import { MarketService, NewsService, OpenAPI, OrdersService, PortfolioService } from '../src/client';

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [accountBalance, setAccountBalance] = useState<AccountBalance>({
    totalValue: 0,
    cashBalance: 0,
    stockValue: 0,
    buyingPower: 0,
    dayTradingBuyingPower: 0,
    marginUsed: 0,
    maintenanceMargin: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('portfoliomax_token');
    if (token) {
      OpenAPI.TOKEN = token as unknown as any;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Market
        const list = (await MarketService.listStocks({ limit: 50, offset: 0 })) as any[];
        const mappedMarket: MarketData[] = (list || []).map((it: any) => ({
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
        setMarketData(mappedMarket);

        // News
        const newsList = await NewsService.listNews({ limit: 20, offset: 0 });
        setNews(
          (newsList as any[]).map((n: any) => ({
            id: String(n.id),
            title: n.title,
            summary: n.summary || n.content?.slice(0, 140) || '',
            source: n.source,
            timestamp: n.published_at,
            url: n.source_url || '#',
          }))
        );

        // Orders
        const apiOrders = await OrdersService.getUserOrders();
        setOrders(
          (apiOrders as any[]).map((o: any) => ({
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
          }))
        );

        // Basic balance estimation from orders
        const totalValue = mappedMarket.reduce((sum, s) => sum + s.currentPrice, 0);
        setAccountBalance((prev) => ({
          ...prev,
          totalValue,
          stockValue: totalValue,
          cashBalance: 0,
          buyingPower: Math.max(0, 0),
        }));
      } catch {
        // keep defaults
      }
    };
    load();
  }, []);

  const getMarketData = (symbol: string) => {
    return marketData.find((data) => data.symbol === symbol);
  };

  const placeOrder = async (
    orderData: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>
  ) => {
    try {
      // Need stock_id and optional portfolio_id; resolve stock by symbol via MarketService.listStocks
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

      const mapped: Order = {
        id: String((created as any).id),
        portfolioId: (created as any).portfolio_id ? String((created as any).portfolio_id) : '',
        symbol: orderData.symbol,
        companyName: orderData.companyName,
        side: orderData.side,
        orderType: orderData.orderType,
        quantity: orderData.quantity,
        limitPrice: orderData.limitPrice,
        stopPrice: orderData.stopPrice,
        timeInForce: orderData.timeInForce,
        status: 'pending',
        filledQuantity: 0,
        orderDate: new Date().toISOString(),
        totalValue: orderData.totalValue,
        fees: 0,
      };

      setOrders((prev) => [mapped, ...prev]);
      return mapped.id;
    } catch {
      const fallbackId = `order_${Date.now()}`;
      setOrders((prev) => [
        {
          id: fallbackId,
          portfolioId: orderData.portfolioId,
          symbol: orderData.symbol,
          companyName: orderData.companyName,
          side: orderData.side,
          orderType: orderData.orderType,
          quantity: orderData.quantity,
          limitPrice: orderData.limitPrice,
          stopPrice: orderData.stopPrice,
          timeInForce: orderData.timeInForce,
          status: 'pending',
          filledQuantity: 0,
          orderDate: new Date().toISOString(),
          totalValue: orderData.totalValue,
          fees: 0,
        },
        ...prev,
      ]);
      return fallbackId;
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await OrdersService.cancelOrder({ orderId });
    } catch {}
    setOrders((prev) => prev.map((order) => (order.id === orderId && order.status === 'pending' ? { ...order, status: 'cancelled' as const } : order)));
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