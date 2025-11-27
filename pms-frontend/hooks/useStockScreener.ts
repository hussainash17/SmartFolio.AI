import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OpenAPI, ResearchService } from '../src/client';
import type { ResearchStockScreenerData, ResearchStockScreenerResponse } from '../src/client';
import { createDefaultFilters, type ScreenerFilters } from '../lib/screener-utils';

export interface ScreenerResult {
    symbol: string;
    companyName: string;
    sector: string | null;
    industry: string | null;
    marketCap: number | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    volume: number | null;
    peRatio: number | null;
    priceToBook: number | null;
    dividendYield: number | null;
    rsi: number | null;
    sma20: number | null;
    sma50: number | null;
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

/**
 * Custom hook for fetching and processing stock screener data
 */
export function useStockScreener(
    filters: ScreenerFilters,
    searchTerm: string,
    sortBy: string,
    sortOrder: 'asc' | 'desc'
) {
    const PAGE_SIZE = 20;
    const defaultFilterSnapshot = useMemo(() => createDefaultFilters(), []);

    // Build query variables based on filters
    const queryVariables = useMemo<ResearchStockScreenerData>(() => {
        const payload: ResearchStockScreenerData = {
            limit: PAGE_SIZE,
        };

        const defaults = defaultFilterSnapshot;

        const [minMarketCap, maxMarketCap] = filters.marketCap;
        if (minMarketCap > defaults.marketCap[0]) payload.minMarketCap = minMarketCap;
        if (maxMarketCap < defaults.marketCap[1]) payload.maxMarketCap = maxMarketCap;

        const [minPe, maxPe] = filters.peRatio;
        if (minPe > defaults.peRatio[0]) payload.minPeRatio = minPe;
        if (maxPe < defaults.peRatio[1]) payload.maxPeRatio = maxPe;

        const [minPtb, maxPtb] = filters.priceToBook;
        if (minPtb > defaults.priceToBook[0]) payload.minPriceToBook = minPtb;
        if (maxPtb < defaults.priceToBook[1]) payload.maxPriceToBook = maxPtb;

        const [minDividend, maxDividend] = filters.dividendYield;
        if (minDividend > defaults.dividendYield[0]) payload.minDividendYield = minDividend;
        if (maxDividend < defaults.dividendYield[1]) payload.maxDividendYield = maxDividend;

        const [minPriceValue, maxPriceValue] = filters.priceRange;
        if (minPriceValue > defaults.priceRange[0]) payload.minPrice = minPriceValue;
        if (maxPriceValue < defaults.priceRange[1]) payload.maxPrice = maxPriceValue;

        if (filters.volume[0] > defaults.volume[0]) {
            payload.minVolume = filters.volume[0];
        }

        const [minRsi, maxRsi] = filters.rsi;
        if (minRsi > defaults.rsi[0]) payload.minRsi = minRsi;
        if (maxRsi < defaults.rsi[1]) payload.maxRsi = maxRsi;

        const [minPriceChange, maxPriceChange] = filters.priceChange;
        if (minPriceChange > defaults.priceChange[0]) payload.minPriceChange = minPriceChange;
        if (maxPriceChange < defaults.priceChange[1]) payload.maxPriceChange = maxPriceChange;

        if (filters.sector !== 'all') payload.sector = filters.sector;
        if (filters.industry !== 'all') payload.industry = filters.industry;
        if (filters.movingAverage !== 'all') payload.movingAverage = filters.movingAverage;

        return payload;
    }, [defaultFilterSnapshot, filters]);

    const isAuthenticated = Boolean((OpenAPI as any).TOKEN);
    const isQueryDisabled = !isAuthenticated;

    // Fetch screener data
    const {
        data: screenerData,
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useQuery<ResearchStockScreenerResponse>({
        queryKey: ['stock-screener', queryVariables],
        queryFn: async () => {
            const response = await ResearchService.stockScreener(queryVariables);
            return response as ResearchStockScreenerResponse;
        },
        enabled: !isQueryDisabled,
        staleTime: 60 * 1000,
    });

    // Get sort value for a screener item
    const getSortValue = useCallback((item: ScreenerResult) => {
        switch (sortBy) {
            case 'marketCap':
                return item.marketCap ?? null;
            case 'price':
                return item.price ?? null;
            case 'changePercent':
                return item.changePercent ?? null;
            case 'volume':
                return item.volume ?? null;
            case 'peRatio':
                return item.peRatio ?? null;
            case 'dividendYield':
                return item.dividendYield ?? null;
            case 'rsi':
                return item.rsi ?? null;
            default:
                return null;
        }
    }, [sortBy]);

    // Process and sort results
    const screenerResults = useMemo<ScreenerResult[]>(() => {
        const stocks = ((screenerData as any)?.stocks ?? []) as any[];

        const mapped: ScreenerResult[] = stocks.map((stock) => ({
            symbol: stock.symbol,
            companyName: stock.name ?? stock.symbol,
            sector: stock.sector ?? null,
            industry: stock.industry ?? null,
            marketCap: stock.market_cap ?? null,
            price: stock.current_price ?? null,
            change: stock.change ?? null,
            changePercent: stock.change_percent ?? null,
            volume: stock.volume ?? null,
            peRatio: stock.pe_ratio ?? null,
            priceToBook: stock.pb_ratio ?? null,
            dividendYield: stock.dividend_yield ?? null,
            rsi: stock.rsi ?? null,
            sma20: stock.sma_20 ?? null,
            sma50: stock.sma_50 ?? null,
            rating: (stock.rating as ScreenerResult['rating']) ?? 'Hold',
        }));

        const trimmedSearch = searchTerm.trim().toLowerCase();
        const filtered = trimmedSearch
            ? mapped.filter((item) =>
                item.symbol.toLowerCase().includes(trimmedSearch) ||
                item.companyName.toLowerCase().includes(trimmedSearch)
            )
            : mapped;

        const sorted = [...filtered].sort((a, b) => {
            const aValue = getSortValue(a);
            const bValue = getSortValue(b);

            const fallback = sortOrder === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
            const aNumber = aValue ?? fallback;
            const bNumber = bValue ?? fallback;

            if (aNumber === bNumber) {
                return a.symbol.localeCompare(b.symbol);
            }

            return sortOrder === 'asc' ? aNumber - bNumber : bNumber - aNumber;
        });

        return sorted;
    }, [getSortValue, screenerData, searchTerm, sortOrder]);

    const totalResults = (screenerData as any)?.total_results ?? screenerResults.length;
    const isEmptyState = !isQueryDisabled && !isLoading && !isFetching && !isError && screenerResults.length === 0;

    return {
        screenerResults,
        totalResults,
        isLoading,
        isFetching,
        isError,
        isEmptyState,
        isQueryDisabled,
        refetch,
    };
}
