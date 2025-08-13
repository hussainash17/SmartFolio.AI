import { useState, useMemo } from 'react';
import { Portfolio, Stock, PortfolioSummary } from '../types/portfolio';

// Mock stock data for demonstration
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

const INITIAL_PORTFOLIOS: Portfolio[] = [
  {
    id: '1',
    name: 'Growth Portfolio',
    description: 'High-growth technology stocks',
    createdDate: '2024-01-15',
    totalValue: 0,
    totalCost: 0,
    cash: 5000,
    stocks: [
      {
        id: 's1',
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        quantity: 50,
        purchasePrice: 180.25,
        currentPrice: 192.53,
        purchaseDate: '2024-02-01',
        sector: 'Technology'
      },
      {
        id: 's2',
        symbol: 'GOOGL',
        companyName: 'Alphabet Inc.',
        quantity: 25,
        purchasePrice: 125.40,
        currentPrice: 138.21,
        purchaseDate: '2024-02-15',
        sector: 'Technology'
      },
      {
        id: 's3',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corporation',
        quantity: 10,
        purchasePrice: 720.50,
        currentPrice: 875.28,
        purchaseDate: '2024-03-01',
        sector: 'Technology'
      }
    ]
  },
  {
    id: '2',
    name: 'Dividend Portfolio',
    description: 'Stable dividend-paying stocks',
    createdDate: '2024-01-20',
    totalValue: 0,
    totalCost: 0,
    cash: 2500,
    stocks: [
      {
        id: 's4',
        symbol: 'JPM',
        companyName: 'JPMorgan Chase & Co.',
        quantity: 30,
        purchasePrice: 165.80,
        currentPrice: 179.86,
        purchaseDate: '2024-02-10',
        sector: 'Financial Services'
      },
      {
        id: 's5',
        symbol: 'JNJ',
        companyName: 'Johnson & Johnson',
        quantity: 40,
        purchasePrice: 148.25,
        currentPrice: 155.92,
        purchaseDate: '2024-02-20',
        sector: 'Healthcare'
      }
    ]
  }
];

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(INITIAL_PORTFOLIOS);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>('1');

  // Calculate portfolio values
  const updatedPortfolios = useMemo(() => {
    return portfolios.map(portfolio => {
      const totalValue = portfolio.stocks.reduce((sum, stock) => 
        sum + (stock.quantity * stock.currentPrice), 0) + portfolio.cash;
      const totalCost = portfolio.stocks.reduce((sum, stock) => 
        sum + (stock.quantity * stock.purchasePrice), 0) + portfolio.cash;
      
      return {
        ...portfolio,
        totalValue,
        totalCost
      };
    });
  }, [portfolios]);

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

  const addPortfolio = (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: Date.now().toString(),
      totalValue: portfolio.cash,
      totalCost: portfolio.cash
    };
    setPortfolios(prev => [...prev, newPortfolio]);
  };

  const updatePortfolio = (id: string, updates: Partial<Portfolio>) => {
    setPortfolios(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePortfolio = (id: string) => {
    setPortfolios(prev => prev.filter(p => p.id !== id));
    if (selectedPortfolioId === id) {
      setSelectedPortfolioId(updatedPortfolios.length > 1 ? updatedPortfolios[0].id : null);
    }
  };

  const addStock = (portfolioId: string, stock: Omit<Stock, 'id'>) => {
    const newStock: Stock = {
      ...stock,
      id: Date.now().toString()
    };
    
    setPortfolios(prev => prev.map(p => 
      p.id === portfolioId 
        ? { ...p, stocks: [...p.stocks, newStock] }
        : p
    ));
  };

  const updateStock = (portfolioId: string, stockId: string, updates: Partial<Stock>) => {
    setPortfolios(prev => prev.map(p => 
      p.id === portfolioId 
        ? {
            ...p,
            stocks: p.stocks.map(s => s.id === stockId ? { ...s, ...updates } : s)
          }
        : p
    ));
  };

  const removeStock = (portfolioId: string, stockId: string) => {
    setPortfolios(prev => prev.map(p => 
      p.id === portfolioId 
        ? { ...p, stocks: p.stocks.filter(s => s.id !== stockId) }
        : p
    ));
  };

  const getAvailableStocks = () => MOCK_STOCKS;

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
    getAvailableStocks
  };
}