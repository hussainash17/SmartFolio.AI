import { useQuery } from '@tanstack/react-query';
import { FundamentalsService, OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

/**
 * Custom hook for Fundamental Analysis API integration
 * Provides methods to fetch company fundamentals, market data, and comparisons
 */
export function useFundamentals(tradingCode?: string) {
  // API 1: Company Basic Info
  const { 
    data: companyInfo, 
    isLoading: companyInfoLoading, 
    error: companyInfoError 
  } = useQuery({
    queryKey: queryKeys.fundamentalCompanyInfo(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getCompanyInfo({ tradingCode: tradingCode! });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // API 2: Market Summary
  const { 
    data: marketSummary, 
    isLoading: marketSummaryLoading,
    error: marketSummaryError 
  } = useQuery({
    queryKey: queryKeys.fundamentalMarketSummary(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getMarketSummary({ tradingCode: tradingCode! });
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // API 3: Shareholding Pattern
  const { 
    data: shareholding, 
    isLoading: shareholdingLoading,
    error: shareholdingError 
  } = useQuery({
    queryKey: queryKeys.fundamentalShareholding(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getShareholdingPattern({ tradingCode: tradingCode! });
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // API 4: Earnings & Profit
  const { 
    data: earnings, 
    isLoading: earningsLoading,
    error: earningsError 
  } = useQuery({
    queryKey: queryKeys.fundamentalEarnings(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getEarningsProfit({ tradingCode: tradingCode! });
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // API 5: Financial Health
  const { 
    data: financialHealth, 
    isLoading: financialHealthLoading,
    error: financialHealthError 
  } = useQuery({
    queryKey: queryKeys.fundamentalFinancialHealth(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getFinancialHealth({ tradingCode: tradingCode! });
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // API 6: Dividend History
  const { 
    data: dividends, 
    isLoading: dividendsLoading,
    error: dividendsError 
  } = useQuery({
    queryKey: queryKeys.fundamentalDividends(tradingCode || '', 10),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getDividendHistory({ 
        tradingCode: tradingCode!, 
        limit: 10 
      });
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // API 7: Historical Ratios
  const { 
    data: historicalRatios, 
    isLoading: historicalRatiosLoading,
    error: historicalRatiosError 
  } = useQuery({
    queryKey: queryKeys.fundamentalRatios(tradingCode || '', 5),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.getHistoricalRatios({ 
        tradingCode: tradingCode!, 
        years: 5 
      });
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Data availability check
  const { 
    data: dataAvailability, 
    isLoading: dataAvailabilityLoading 
  } = useQuery({
    queryKey: queryKeys.fundamentalDataAvailability(tradingCode || ''),
    enabled: !!(OpenAPI as any).TOKEN && !!tradingCode,
    queryFn: async () => {
      return await FundamentalsService.checkDataAvailability({ tradingCode: tradingCode! });
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Aggregate loading state
  const isLoading = 
    companyInfoLoading || 
    marketSummaryLoading || 
    shareholdingLoading || 
    earningsLoading || 
    financialHealthLoading || 
    dividendsLoading || 
    historicalRatiosLoading;

  // Check if any critical data failed to load
  const hasError = 
    companyInfoError || 
    marketSummaryError || 
    shareholdingError || 
    earningsError || 
    financialHealthError || 
    dividendsError || 
    historicalRatiosError;

  return {
    // Data
    companyInfo,
    marketSummary,
    shareholding,
    earnings,
    financialHealth,
    dividends,
    historicalRatios,
    dataAvailability,
    
    // Loading states
    isLoading,
    companyInfoLoading,
    marketSummaryLoading,
    shareholdingLoading,
    earningsLoading,
    financialHealthLoading,
    dividendsLoading,
    historicalRatiosLoading,
    dataAvailabilityLoading,
    
    // Error states
    hasError,
    companyInfoError,
    marketSummaryError,
    shareholdingError,
    earningsError,
    financialHealthError,
    dividendsError,
    historicalRatiosError,
  };
}

/**
 * Hook for company comparison
 */
export function useCompanyComparison(tradingCodes: string[]) {
  const codesString = tradingCodes.join(',');
  
  return useQuery({
    queryKey: queryKeys.fundamentalComparison(codesString),
    enabled: !!(OpenAPI as any).TOKEN && tradingCodes.length > 0,
    queryFn: async () => {
      return await FundamentalsService.compareCompanies({ codes: codesString });
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for company search and filtering
 */
export function useCompanySearch(params: {
  sector?: string;
  category?: string;
  minPe?: number;
  maxPe?: number;
  minDividendYield?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.fundamentalSearch(params),
    enabled: !!(OpenAPI as any).TOKEN,
    queryFn: async () => {
      return await FundamentalsService.searchCompanies({
        sector: params.sector,
        category: params.category,
        minPe: params.minPe,
        maxPe: params.maxPe,
        minDividendYield: params.minDividendYield,
        limit: params.limit,
      });
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

