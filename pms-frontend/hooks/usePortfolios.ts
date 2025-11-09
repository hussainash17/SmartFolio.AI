import { useEffect, useMemo, useState } from 'react';
import { Portfolio, Stock, PortfolioSummary } from '../types/portfolio';
import { OpenAPI, PortfolioService } from '../src/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export function usePortfolios() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const fetchPositionsWithDetailsSafe = async (portfolioId: string) => {
    try {
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

  const { data: portfoliosRaw = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.portfolios,
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      const apiPortfolios = await PortfolioService.getUserPortfolios();
      const mapped: Portfolio[] = await Promise.all(
        (apiPortfolios as any[]).map(async (p: any) => {
          const [summary, details] = await Promise.all([
            PortfolioService.getPortfolioSummary({ portfolioId: p.id }),
            fetchPositionsWithDetailsSafe(String(p.id)),
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
      return mapped;
    },
  });

  const portfolios = useMemo(() => portfoliosRaw, [portfoliosRaw]);

  // Initialize selected portfolio when data loads
  useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [selectedPortfolioId, portfolios]);

  const selectedPortfolio = useMemo(
    () => portfolios.find((p) => p.id === selectedPortfolioId) || null,
    [portfolios, selectedPortfolioId]
  );

  const portfolioSummary = useMemo((): PortfolioSummary => {
    const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalCost = portfolios.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const dayChange = totalValue * 0.0;
    const dayChangePercent = 0;
    return { totalValue, totalGainLoss, totalGainLossPercent, dayChange, dayChangePercent };
  }, [portfolios]);

  const addPortfolioMutation = useMutation({
    mutationFn: async (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
      const created = await PortfolioService.createPortfolio({
        requestBody: {
          name: portfolio.name,
          description: portfolio.description,
          is_default: false,
          is_active: true,
        },
      });
      try {
        await PortfolioService.updatePortfolio({
          portfolioId: created.id,
          requestBody: ({ cash_balance: portfolio.cash } as unknown) as any,
        });
      } catch {}
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Portfolio> }) => {
      await PortfolioService.updatePortfolio({
        portfolioId: id,
        requestBody: {
          name: updates.name,
          description: updates.description,
          is_default: undefined,
          is_active: undefined,
          ...(updates.cash != null ? ({ cash_balance: updates.cash } as any) : {}),
        } as any,
      });
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: async (id: string) => {
      await PortfolioService.deletePortfolio({ portfolioId: id });
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
      if (selectedPortfolioId === id) {
        const next = portfolios.find((p) => p.id !== id);
        setSelectedPortfolioId(next ? next.id : null);
      }
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stock }: { portfolioId: string; stock: Omit<Stock, 'id'> }) => {
      await PortfolioService.addPosition({
        portfolioId,
        stockSymbol: stock.symbol,
        quantity: stock.quantity,
        averagePrice: stock.purchasePrice,
      });
      return portfolioId;
    },
    onSuccess: (portfolioId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      if (selectedPortfolioId === portfolioId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stockId, updates }: { portfolioId: string; stockId: string; updates: Partial<Stock> }) => {
      await PortfolioService.updatePosition({
        portfolioId,
        positionId: stockId,
        quantity: updates.quantity,
        averagePrice: updates.purchasePrice,
      });
      return portfolioId;
    },
    onSuccess: (portfolioId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      if (selectedPortfolioId === portfolioId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const removeStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stockId }: { portfolioId: string; stockId: string }) => {
      await PortfolioService.removePosition({ portfolioId, positionId: stockId });
      return portfolioId;
    },
    onSuccess: (portfolioId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      if (selectedPortfolioId === portfolioId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.portfolio(portfolioId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    },
  });

  const addPortfolio = async (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
    await addPortfolioMutation.mutateAsync(portfolio);
  };

  const updatePortfolio = async (id: string, updates: Partial<Portfolio>) => {
    await updatePortfolioMutation.mutateAsync({ id, updates });
  };

  const deletePortfolio = async (id: string) => {
    await deletePortfolioMutation.mutateAsync(id);
  };

  const addStock = async (portfolioId: string, stock: Omit<Stock, 'id'>) => {
    await addStockMutation.mutateAsync({ portfolioId, stock });
  };

  const updateStock = async (portfolioId: string, stockId: string, updates: Partial<Stock>) => {
    await updateStockMutation.mutateAsync({ portfolioId, stockId, updates });
  };

  const removeStock = async (portfolioId: string, stockId: string) => {
    await removeStockMutation.mutateAsync({ portfolioId, stockId });
  };

  const getAvailableStocks = () => {
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

  // Get positions for a specific symbol across all portfolios
  const getPositionsBySymbol = async (symbol: string) => {
    try {
      const response = await fetch(
        `${(OpenAPI.BASE || '').replace(/\/$/, '')}/api/v1/portfolio/positions/by-symbol/${symbol}`,
        {
          headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
          credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        }
      );
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching positions by symbol:', error);
      return [];
    }
  };

  // Close/remove a position from a portfolio
  const closePosition = async (portfolioId: string, positionId: string) => {
    try {
      const response = await fetch(
        `${(OpenAPI.BASE || '').replace(/\/$/, '')}/api/v1/portfolio/${portfolioId}/positions/${positionId}`,
        {
          method: 'DELETE',
          headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
          credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        }
      );
      if (!response.ok) throw new Error('Failed to close position');
      // Refresh portfolios after closing position
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
      return await response.json();
    } catch (error) {
      console.error('Error closing position:', error);
      throw error;
    }
  };

  // Get position for a specific symbol and portfolio
  const getPositionForSymbol = (symbol: string, portfolioId?: string) => {
    const targetPortfolio = portfolioId 
      ? portfolios.find(p => p.id === portfolioId)
      : selectedPortfolio;
    
    if (!targetPortfolio) return null;
    
    return targetPortfolio.stocks.find(s => 
      s.symbol.toUpperCase() === symbol.toUpperCase()
    ) || null;
  };

  return {
    portfolios,
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
    getPositionsBySymbol,
    closePosition,
    getPositionForSymbol,
  };
}