import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PortfolioService } from '@/client';
import { Portfolio, Stock, PortfolioSummary } from '../types/portfolio';

// Mock stock data for demonstration (will be replaced with real API)
const MOCK_STOCKS = [
  { symbol: 'AAPL', companyName: 'Apple Inc.', currentPrice: 192.53, sector: 'Technology' },
  { symbol: 'GOOGL', companyName: 'Alphabet Inc.', currentPrice: 138.21, sector: 'Technology' },
  { symbol: 'MSFT', companyName: 'Microsoft Corporation', currentPrice: 378.85, sector: 'Technology' },
  { symbol: 'TSLA', companyName: 'Tesla, Inc.', currentPrice: 248.42, sector: 'Consumer Cyclical' },
  { symbol: 'NVDA', companyName: 'NVIDIA Corporation', currentPrice: 875.28, sector: 'Technology' },
  { symbol: 'JPM', companyName: 'JPMorgan Chase & Co.', currentPrice: 179.86, sector: 'Financial Services' },
  { symbol: 'JNJ', companyName: 'Johnson & Johnson', currentPrice: 155.92, sector: 'Healthcare' },
  { symbol: 'V', companyName: 'Visa Inc.', currentPrice: 285.34, sector: 'Financial Services' },
];

export function usePortfolios() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch portfolios from API
  const { data: portfolios = [], isLoading } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const response = await PortfolioService.getUserPortfolios();
      return response.map(portfolio => ({
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description || '',
        createdDate: portfolio.created_at,
        totalValue: 0, // Will be calculated
        totalCost: 0, // Will be calculated
        cash: 0, // Will be fetched from positions
        stocks: [] // Will be fetched separately
      }));
    }
  });

  // Fetch portfolio positions
  const { data: portfolioPositions = {} } = useQuery({
    queryKey: ['portfolio-positions', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return {};
      const response = await PortfolioService.getPortfolioPositions(selectedPortfolioId);
      return response.reduce((acc, position) => {
        if (!acc[position.portfolio_id]) {
          acc[position.portfolio_id] = [];
        }
        acc[position.portfolio_id].push({
          id: position.id,
          symbol: (position as any).stock_symbol || position.stock_id, // prefer symbol if provided by API
          companyName: '', // Can be populated by market list
          quantity: position.quantity,
          purchasePrice: parseFloat(position.average_price.toString()),
          currentPrice: parseFloat(position.current_value.toString()) / position.quantity,
          purchaseDate: position.last_updated,
          sector: ''
        });
        return acc;
      }, {} as Record<string, Stock[]>);
    },
    enabled: !!selectedPortfolioId
  });

  // Calculate portfolio values
  const updatedPortfolios = useMemo(() => {
    return portfolios.map(portfolio => {
      const positions = portfolioPositions[portfolio.id] || [];
      const totalValue = positions.reduce((sum, stock) => 
        sum + (stock.quantity * stock.currentPrice), 0) + portfolio.cash;
      const totalCost = positions.reduce((sum, stock) => 
        sum + (stock.quantity * stock.purchasePrice), 0) + portfolio.cash;
      
      return {
        ...portfolio,
        stocks: positions,
        totalValue,
        totalCost
      };
    });
  }, [portfolios, portfolioPositions]);

  const selectedPortfolio = useMemo(() => 
    updatedPortfolios.find(p => p.id === selectedPortfolioId) || null,
    [updatedPortfolios, selectedPortfolioId]
  );

  const portfolioSummary = useMemo((): PortfolioSummary => {
    const totalValue = updatedPortfolios.reduce((sum, p) => sum + p.totalValue, 0);
    const totalCost = updatedPortfolios.reduce((sum, p) => sum + p.totalCost, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    
    // Mock day change (would come from real API)
    const dayChange = totalValue * 0.012; // Mock 1.2% daily change
    const dayChangePercent = 1.2;

    return {
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent
    };
  }, [updatedPortfolios]);

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: async (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
      const response = await PortfolioService.createPortfolio({
        name: portfolio.name,
        description: portfolio.description,
        is_default: false,
        is_active: true
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    }
  });

  // Add stock mutation
  const addStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stock }: { portfolioId: string, stock: Omit<Stock, 'id'> }) => {
      const response = await PortfolioService.addPosition(portfolioId, {
        stock_symbol: stock.symbol,
        quantity: stock.quantity,
        average_price: stock.purchasePrice
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] });
    }
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stockId, updates }: { portfolioId: string, stockId: string, updates: Partial<Stock> }) => {
      const response = await PortfolioService.updatePosition(portfolioId, stockId, {
        quantity: updates.quantity,
        average_price: updates.purchasePrice
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] });
    }
  });

  // Remove stock mutation
  const removeStockMutation = useMutation({
    mutationFn: async ({ portfolioId, stockId }: { portfolioId: string, stockId: string }) => {
      await PortfolioService.removePosition(portfolioId, stockId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] });
    }
  });

  const addPortfolio = (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
    createPortfolioMutation.mutate(portfolio);
  };

  const updatePortfolio = (id: string, updates: Partial<Portfolio>) => {
    // TODO: Implement portfolio update
    console.log('Update portfolio:', id, updates);
  };

  const deletePortfolio = (id: string) => {
    // TODO: Implement portfolio deletion
    console.log('Delete portfolio:', id);
    if (selectedPortfolioId === id) {
      setSelectedPortfolioId(updatedPortfolios.length > 1 ? updatedPortfolios[0].id : null);
    }
  };

  const addStock = (portfolioId: string, stock: Omit<Stock, 'id'>) => {
    addStockMutation.mutate({ portfolioId, stock });
  };

  const updateStock = (portfolioId: string, stockId: string, updates: Partial<Stock>) => {
    updateStockMutation.mutate({ portfolioId, stockId, updates });
  };

  const removeStock = (portfolioId: string, stockId: string) => {
    removeStockMutation.mutate({ portfolioId, stockId });
  };

  const getAvailableStocks = () => MOCK_STOCKS;

  return {
    portfolios: updatedPortfolios,
    selectedPortfolio,
    selectedPortfolioId,
    portfolioSummary,
    isLoading,
    setSelectedPortfolioId,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addStock,
    updateStock,
    removeStock,
    getAvailableStocks
  };
}