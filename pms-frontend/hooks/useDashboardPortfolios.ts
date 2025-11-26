import { useMemo } from 'react';
import { MarketData } from '../types/trading';
import { usePortfolios } from './usePortfolios';

// Types
export interface EnrichedPortfolio {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  stocks: Array<{
    id: string;
    symbol: string;
    companyName: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: string;
    sector: string;
  }>;
  cash: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalValue: number;
  totalCost: number;
  stocksMarketValue: number;
}

export interface PortfolioAggregates {
  totalValue: number;
  totalCost: number;
  totalCash: number;
  unrealizedPL: number;
}

export interface TopMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  contribution: number;
}

export interface SectorExposure {
  sector: string;
  value: number;
  percent: number;
}

export interface MarketOverview {
  advancers: number;
  decliners: number;
  unchanged: number;
  totalVolume: number;
}

// Hook for enriching portfolios with market data
export function useDashboardPortfolios(marketData: MarketData[]) {
  const { portfolios } = usePortfolios();

  // Create market price map
  const marketPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    marketData.forEach((quote) => {
      const symbol = String(quote.symbol || '').toUpperCase();
      if (!symbol) return;
      const price = Number(quote.currentPrice ?? quote.change ?? 0);
      if (!Number.isFinite(price)) return;
      map.set(symbol, price);
    });
    return map;
  }, [marketData]);

  // Enrich portfolios with live market prices
  const enrichedPortfolios = useMemo(() => {
    return portfolios.map((p) => {
      const stocks = p.stocks.map((s) => {
        const live = marketPriceMap.get(String(s.symbol || '').toUpperCase()) ?? s.currentPrice;
        return { ...s, currentPrice: live };
      });
      const stocksMarketValue = stocks.reduce((sum, s) => sum + s.quantity * s.currentPrice, 0);
      const totalCost = stocks.reduce((sum, s) => sum + s.quantity * s.purchasePrice, 0);
      const totalValue = stocksMarketValue + p.cash;
      return { ...p, stocks, stocksMarketValue, totalCost, totalValue } as EnrichedPortfolio;
    });
  }, [portfolios, marketPriceMap]);

  // Calculate aggregates
  const aggregates = useMemo(() => {
    const totalValue = enrichedPortfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalCost = enrichedPortfolios.reduce((sum, p) => sum + p.totalCost, 0);
    const totalCash = enrichedPortfolios.reduce((sum, p) => sum + p.cash, 0);
    const totalStocksValue = enrichedPortfolios.reduce((sum, p) => sum + p.stocksMarketValue, 0);
    const unrealizedPL = totalStocksValue - totalCost;
    return { totalValue, totalCost, totalCash, unrealizedPL };
  }, [enrichedPortfolios]);

  // Calculate market overview
  const marketOverview = useMemo(() => {
    let advancers = 0,
      decliners = 0,
      unchanged = 0;
    let totalVolume = 0;
    marketData.forEach((q) => {
      totalVolume += Number(q.volume || 0);
      const cp = Number(q.changePercent || 0);
      if (cp > 0) advancers++;
      else if (cp < 0) decliners++;
      else unchanged++;
    });
    return { advancers, decliners, unchanged, totalVolume };
  }, [marketData]);

  // Calculate top movers
  const topMovers = useMemo(() => {
    const items: TopMover[] = [];
    const bySymbolHoldings = new Map<string, { quantity: number; companyName: string }>();

    enrichedPortfolios.forEach((p) =>
      p.stocks.forEach((s) => {
        const key = String(s.symbol || '').toUpperCase();
        const prev = bySymbolHoldings.get(key) || { quantity: 0, companyName: s.companyName };
        bySymbolHoldings.set(key, { quantity: prev.quantity + s.quantity, companyName: prev.companyName });
      })
    );

    marketData.forEach((q) => {
      const key = String(q.symbol || '').toUpperCase();
      const holding = bySymbolHoldings.get(key);
      if (!holding) return;
      const price = Number(q.currentPrice || 0);
      const changePct = Number(q.changePercent || 0);
      const contrib = holding.quantity * price * (changePct / 100);
      items.push({
        symbol: key,
        name: holding.companyName,
        price,
        changePercent: changePct,
        volume: Number(q.volume || 0),
        contribution: contrib,
      });
    });

    return items.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 8);
  }, [enrichedPortfolios, marketData]);

  // Calculate sector exposure
  const sectorExposure = useMemo(() => {
    const map = new Map<string, number>();
    enrichedPortfolios.forEach((p) =>
      p.stocks.forEach((s) => {
        const sector = String(s.sector || 'Unknown');
        const value = s.quantity * s.currentPrice;
        map.set(sector, (map.get(sector) || 0) + value);
      })
    );
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(map.entries())
      .map(([sector, value]) => ({ sector, value, percent: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [enrichedPortfolios]);

  return {
    enrichedPortfolios,
    aggregates,
    marketOverview,
    topMovers,
    sectorExposure,
  };
}
