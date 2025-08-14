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

  const SECTOR_MAP: Record<string, string> = {
    '1': 'Banking',
    '2': 'NBFI',
    '3': 'Fuel & Power',
    '4': 'Cement',
    '5': 'Ceramics',
    '6': 'Engineering',
    '7': 'Food & Allied',
    '8': 'IT',
    '9': 'Jute',
    '10': 'Miscellaneous',
    '11': 'Paper & Printing',
    '12': 'Pharmaceuticals & Chemicals',
    '13': 'Services & Real Estate',
    '14': 'Tannery',
    '15': 'Telecommunication',
    '16': 'Travel & Leisure',
    '17': 'Textiles',
    '18': 'Mutual Funds',
    '19': 'Insurance',
  };

  const normalizeSector = (value: any): string => {
    const v = value == null ? '' : String(value).trim();
    if (!v) return 'Unknown';
    if (/^\d+$/.test(v)) return SECTOR_MAP[v] || 'Unknown';
    return v;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiPortfolios = await PortfolioService.getUserPortfolios();
        const mapped: Portfolio[] = await Promise.all(
          apiPortfolios.map(async (p) => {
            const [summary, details] = await Promise.all([
              PortfolioService.getPortfolioSummary({ portfolioId: p.id }),
              fetchPositionsWithDetailsSafe(p.id),
            ]);
            const stocks: Stock[] = (details || []).map((row: any) => ({
              id: String(row.id),
              symbol: row.stock?.symbol || '',
              companyName: row.stock?.company_name || '',
              quantity: Number(row.quantity || 0),
              purchasePrice: Number(row.average_price || 0),
              currentPrice: Number(row.current_price || 0),
              purchaseDate: new Date(row.last_updated).toISOString().split('T')[0],
              sector: normalizeSector(row.stock?.sector),
            }));

            const totalValue = Number((summary as any)?.current_value || 0);
            const totalCost = Number((summary as any)?.total_investment || 0);
            const cash = Number((p as any)?.cash_balance || 0);

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
    return portfolios;
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

    // Persist initial cash via update endpoint (backend supports cash_balance)
    try {
      await PortfolioService.updatePortfolio({
        portfolioId: created.id,
        requestBody: ({ cash_balance: portfolio.cash } as unknown) as any,
      });
    } catch {}

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
        // Allow updating cash when provided
        ...(updates.cash != null ? ({ cash_balance: updates.cash } as any) : {}),
      } as any,
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
    // Refresh positions and summary for that portfolio
    const [summary, details] = await Promise.all([
      PortfolioService.getPortfolioSummary({ portfolioId }),
      fetchPositionsWithDetailsSafe(portfolioId),
    ]);
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
                sector: normalizeSector(row.stock?.sector),
              })),
              totalValue: Number((summary as any)?.current_value || 0),
              totalCost: Number((summary as any)?.total_investment || 0),
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
    const [summary, details] = await Promise.all([
      PortfolioService.getPortfolioSummary({ portfolioId }),
      fetchPositionsWithDetailsSafe(portfolioId),
    ]);
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
                sector: normalizeSector(row.stock?.sector),
              })),
              totalValue: Number((summary as any)?.current_value || 0),
              totalCost: Number((summary as any)?.total_investment || 0),
            }
          : p
      )
    );
  };

  const removeStock = async (portfolioId: string, stockId: string) => {
    await PortfolioService.removePosition({ portfolioId, positionId: stockId });
    const [summary, details] = await Promise.all([
      PortfolioService.getPortfolioSummary({ portfolioId }),
      fetchPositionsWithDetailsSafe(portfolioId),
    ]);
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
                sector: normalizeSector(row.stock?.sector),
              })),
              totalValue: Number((summary as any)?.current_value || 0),
              totalCost: Number((summary as any)?.total_investment || 0),
            }
          : p
      )
    );
  };

  const getAvailableStocks = () => {
    // This can be wired to MarketService.listStocks later for live search
    const symbols = new Set<string>();
    portfolios.forEach((p) => p.stocks.forEach((s) => symbols.add(s.symbol)));
    return portfolios
      .flatMap((p) => p.stocks)
      .filter((s, idx, arr) => arr.findIndex((x) => x.symbol === s.symbol) === idx)
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
    loading,
    portfolioSummary,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addStock,
    updateStock,
    removeStock,
    getAvailableStocks,
    setSelectedPortfolioId,
  };
}