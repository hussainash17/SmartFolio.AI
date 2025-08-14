import { useEffect, useMemo, useState } from 'react';
import { Portfolio, Stock, PortfolioSummary } from '../types/portfolio';
import { OpenAPI, PortfolioService } from '../src/client';

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('portfoliomax_token');
    if (token) {
      OpenAPI.TOKEN = token as unknown as any;
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiPortfolios = await PortfolioService.getUserPortfolios();
        const mapped: Portfolio[] = await Promise.all(
          apiPortfolios.map(async (p) => {
            const positions = await PortfolioService.getPortfolioPositions({ portfolioId: p.id });
            // Map positions into UI stocks. Backend does not provide symbol/name here; fall back via detailed endpoint when available
            const details = await fetchPositionsWithDetailsSafe(p.id);
            const stocks: Stock[] = (details || []).map((row: any) => ({
              id: String(row.id),
              symbol: row.stock?.symbol || '',
              companyName: row.stock?.company_name || '',
              quantity: Number(row.quantity || 0),
              purchasePrice: Number(row.average_price || 0),
              currentPrice: Number(row.current_price || 0),
              purchaseDate: new Date(row.last_updated).toISOString().split('T')[0],
              sector: row.stock?.sector,
            }));

            const cash = 0;
            const totalStockValue = stocks.reduce((sum, s) => sum + s.quantity * s.currentPrice, 0);
            const totalCost = stocks.reduce((sum, s) => sum + s.quantity * s.purchasePrice, 0) + cash;
            const totalValue = totalStockValue + cash;

            return {
              id: String(p.id),
              name: p.name,
              description: p.description || '',
              createdDate: new Date(p.created_at).toISOString().split('T')[0],
              totalValue,
              totalCost,
              stocks,
              cash,
            } as Portfolio;
          })
        );

        setPortfolios(mapped);
        if (!selectedPortfolioId && mapped.length > 0) {
          setSelectedPortfolioId(mapped[0].id);
        }
      } catch (e) {
        // keep empty on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchPositionsWithDetailsSafe = async (portfolioId: string) => {
    try {
      // Optional helper endpoint if available
      const res = await fetch(`${(OpenAPI.BASE || '').replace(/\/$/, '')}/api/v1/portfolio/${portfolioId}/positions/with-details`, {
        headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
        credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const updatedPortfolios = useMemo(() => {
    return portfolios.map((portfolio) => {
      const totalValue = portfolio.stocks.reduce((sum, stock) => sum + stock.quantity * stock.currentPrice, 0) + portfolio.cash;
      const totalCost = portfolio.stocks.reduce((sum, stock) => sum + stock.quantity * stock.purchasePrice, 0) + portfolio.cash;
      return { ...portfolio, totalValue, totalCost };
    });
  }, [portfolios]);

  const selectedPortfolio = useMemo(
    () => updatedPortfolios.find((p) => p.id === selectedPortfolioId) || null,
    [updatedPortfolios, selectedPortfolioId]
  );

  const portfolioSummary = useMemo((): PortfolioSummary => {
    const totalValue = updatedPortfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalCost = updatedPortfolios.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const dayChange = totalValue * 0.0;
    const dayChangePercent = 0;
    return { totalValue, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent };
  }, [updatedPortfolios]);

  const addPortfolio = async (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
    const created = await PortfolioService.createPortfolio({
      requestBody: {
        name: portfolio.name,
        description: portfolio.description,
        is_default: false,
        is_active: true,
      },
    });
    setPortfolios((prev) => [
      ...prev,
      {
        id: String(created.id),
        name: created.name,
        description: created.description || '',
        createdDate: new Date(created.created_at).toISOString().split('T')[0],
        totalValue: 0,
        totalCost: 0,
        stocks: [],
        cash: portfolio.cash || 0,
      },
    ]);
  };

  const updatePortfolio = async (id: string, updates: Partial<Portfolio>) => {
    await PortfolioService.updatePortfolio({
      portfolioId: id,
      requestBody: {
        name: updates.name,
        description: updates.description,
        is_default: undefined,
        is_active: undefined,
      },
    });
    setPortfolios((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePortfolio = async (id: string) => {
    await PortfolioService.deletePortfolio({ portfolioId: id });
    setPortfolios((prev) => prev.filter((p) => p.id !== id));
    if (selectedPortfolioId === id) {
      setSelectedPortfolioId(updatedPortfolios.length > 1 ? updatedPortfolios[0].id : null);
    }
  };

  const addStock = async (portfolioId: string, stock: Omit<Stock, 'id'>) => {
    await PortfolioService.addPosition({
      portfolioId,
      stockSymbol: stock.symbol,
      quantity: stock.quantity,
      averagePrice: stock.purchasePrice,
    });
    // Refresh positions for that portfolio
    const details = await fetchPositionsWithDetailsSafe(portfolioId);
    setPortfolios((prev) =>
      prev.map((p) =>
        p.id === portfolioId
          ? {
              ...p,
              stocks: (details || []).map((row: any) => ({
                id: String(row.id),
                symbol: row.stock?.symbol || '',
                companyName: row.stock?.company_name || '',
                quantity: Number(row.quantity || 0),
                purchasePrice: Number(row.average_price || 0),
                currentPrice: Number(row.current_price || 0),
                purchaseDate: new Date(row.last_updated).toISOString().split('T')[0],
                sector: row.stock?.sector,
              })),
            }
          : p
      )
    );
  };

  const updateStock = async (portfolioId: string, stockId: string, updates: Partial<Stock>) => {
    await PortfolioService.updatePosition({
      portfolioId,
      positionId: stockId,
      quantity: updates.quantity,
      averagePrice: updates.purchasePrice,
    });
    const details = await fetchPositionsWithDetailsSafe(portfolioId);
    setPortfolios((prev) =>
      prev.map((p) =>
        p.id === portfolioId
          ? {
              ...p,
              stocks: (details || []).map((row: any) => ({
                id: String(row.id),
                symbol: row.stock?.symbol || '',
                companyName: row.stock?.company_name || '',
                quantity: Number(row.quantity || 0),
                purchasePrice: Number(row.average_price || 0),
                currentPrice: Number(row.current_price || 0),
                purchaseDate: new Date(row.last_updated).toISOString().split('T')[0],
                sector: row.stock?.sector,
              })),
            }
          : p
      )
    );
  };

  const removeStock = async (portfolioId: string, stockId: string) => {
    await PortfolioService.removePosition({ portfolioId, positionId: stockId });
    const details = await fetchPositionsWithDetailsSafe(portfolioId);
    setPortfolios((prev) =>
      prev.map((p) =>
        p.id === portfolioId
          ? {
              ...p,
              stocks: (details || []).map((row: any) => ({
                id: String(row.id),
                symbol: row.stock?.symbol || '',
                companyName: row.stock?.company_name || '',
                quantity: Number(row.quantity || 0),
                purchasePrice: Number(row.average_price || 0),
                currentPrice: Number(row.current_price || 0),
                purchaseDate: new Date(row.last_updated).toISOString().split('T')[0],
                sector: row.stock?.sector,
              })),
            }
          : p
      )
    );
  };

  const getAvailableStocks = () => {
    // This can be wired to MarketService.listStocks later for live search
    const symbols = new Set<string>();
    const stocks: Stock[] = portfolios.flatMap((p) => p.stocks);
    return stocks
      .filter((s) => {
        if (symbols.has(s.symbol)) return false;
        symbols.add(s.symbol);
        return true;
      })
      .map((s) => ({
        symbol: s.symbol,
        companyName: s.companyName,
        currentPrice: s.currentPrice,
        sector: s.sector,
      }));
  };

  return {
    portfolios: updatedPortfolios,
    selectedPortfolio,
    selectedPortfolioId,
    portfolioSummary,
    setSelectedPortfolioId,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addStock,
    updateStock,
    removeStock,
    getAvailableStocks,
  };
}