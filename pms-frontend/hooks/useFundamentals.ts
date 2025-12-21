import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FundamentalsService, OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';
import { useStockDataStore, type CachedStockDetails } from '../src/stores';

/**
 * Transform API responses into CachedStockDetails format for Zustand store.
 */
function transformToCachedStockDetails(
  symbol: string,
  companyInfo: any,
  marketSummary: any,
  financialHealth: any,
  earnings: any,
  dividends: any
): Partial<Omit<CachedStockDetails, 'symbol' | 'lastUpdated'>> {
  return {
    companyName: companyInfo?.company_name || companyInfo?.trading_code || symbol,
    sector: marketSummary?.sector || companyInfo?.sector || 'Unknown',
    category: marketSummary?.category,
    ltp: marketSummary?.ltp ? parseFloat(marketSummary.ltp) : undefined,
    ltpChange: marketSummary?.ltp_change ? parseFloat(marketSummary.ltp_change) : undefined,
    ycp: marketSummary?.ycp ? parseFloat(marketSummary.ycp) : undefined,
    currentPE: marketSummary?.current_pe ? parseFloat(marketSummary.current_pe) : undefined,
    auditedPE: marketSummary?.audited_pe ? parseFloat(marketSummary.audited_pe) : undefined,
    dividendYield: marketSummary?.dividend_yield ? parseFloat(marketSummary.dividend_yield) : undefined,
    nav: marketSummary?.nav ? parseFloat(marketSummary.nav) : undefined,
    faceValue: marketSummary?.face_value ? parseFloat(marketSummary.face_value) : undefined,
    marketCap: marketSummary?.market_cap ? parseFloat(marketSummary.market_cap) : undefined,
    shortTermLoan: financialHealth?.short_term_loan,
    longTermLoan: financialHealth?.long_term_loan,
    totalDebt: financialHealth?.total_debt,
    reserveAndSurplus: financialHealth?.reserve_and_surplus,
    debtStatus: financialHealth?.debt_status,
    quarterlyEPS: earnings?.quarterly_eps,
    annualProfit: earnings?.annual_profit,
    dividendHistory: dividends?.map((d: any) => ({
      year: d.year,
      cashDividend: d.cash_dividend,
      stockDividend: d.stock_dividend,
      dividendYield: d.dividend_yield,
    })),
  };
}

/**
 * Custom hook for Fundamental Analysis API integration with Zustand sync.
 * Implements the Hybrid Pattern: React Query fetches, Zustand persists for instant access.
 */
export function useFundamentals(tradingCode?: string) {
  const normalizedCode = tradingCode?.toUpperCase();

  // Get cached data from Zustand store for instant UI rendering
  const cachedStock = useStockDataStore((state) =>
    normalizedCode ? state.stocks[normalizedCode] : undefined
  );
  const syncStock = useStockDataStore((state) => state.syncStock);

  // API 1: Company Basic Info
  const {
    data: companyInfo,
    isLoading: companyInfoLoading,
    error: companyInfoError,
    isFetching: companyInfoFetching
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
    error: marketSummaryError,
    isFetching: marketSummaryFetching
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

  // Sync Pattern: Update Zustand store when fresh data arrives
  useEffect(() => {
    if (!normalizedCode) return;

    // Only sync when we have meaningful data
    if (companyInfo || marketSummary || financialHealth || earnings || dividends) {
      const transformedData = transformToCachedStockDetails(
        normalizedCode,
        companyInfo,
        marketSummary,
        financialHealth,
        earnings,
        dividends
      );
      syncStock(normalizedCode, transformedData);
    }
  }, [normalizedCode, companyInfo, marketSummary, financialHealth, earnings, dividends, syncStock]);

  // Aggregate loading state - true only if no cached data AND queries are loading
  const isLoading = !cachedStock && (
    companyInfoLoading ||
    marketSummaryLoading ||
    shareholdingLoading ||
    earningsLoading ||
    financialHealthLoading ||
    dividendsLoading ||
    historicalRatiosLoading
  );

  // Background fetching indicator (show subtle spinner when updating cached data)
  const isUpdating = companyInfoFetching || marketSummaryFetching;

  // Check if any critical data failed to load
  const hasError =
    companyInfoError ||
    marketSummaryError ||
    shareholdingError ||
    earningsError ||
    financialHealthError ||
    dividendsError ||
    historicalRatiosError;

  // Provide cached data as fallback for instant rendering
  const effectiveMarketSummary = useMemo(() => {
    if (marketSummary) return marketSummary;
    if (!cachedStock) return undefined;
    // Reconstruct from cache
    return {
      trading_code: cachedStock.symbol,
      company_name: cachedStock.companyName,
      sector: cachedStock.sector,
      category: cachedStock.category,
      ltp: cachedStock.ltp?.toString(),
      ltp_change: cachedStock.ltpChange?.toString(),
      current_pe: cachedStock.currentPE?.toString(),
      dividend_yield: cachedStock.dividendYield?.toString(),
      market_cap: cachedStock.marketCap?.toString(),
    };
  }, [marketSummary, cachedStock]);

  return {
    // Data (with cache fallback)
    companyInfo,
    marketSummary: effectiveMarketSummary,
    shareholding,
    earnings,
    financialHealth,
    dividends,
    historicalRatios,
    dataAvailability,

    // Zustand cached data for direct access
    cachedStock,

    // Loading states
    isLoading,
    isUpdating, // New: indicates background refresh
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

