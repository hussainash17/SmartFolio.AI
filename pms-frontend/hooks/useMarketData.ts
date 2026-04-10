import { useQuery } from "@tanstack/react-query";
import { MarketService } from "../src/client";
import { queryKeys } from "./queryKeys";

interface MarketStock {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    pe: number;
    dividendYield: number;
    roe: number;
    debtToEquity: number;
    marketCap: number;
    eps: number;
    navPerShare: number;
}

interface UseMarketDataOptions {
    searchQuery?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
}

/**
 * Shared hook for fetching market stock data.
 * Uses React Query's cache to prevent duplicate API calls.
 * Multiple components using this hook with the same parameters will share cached data.
 */
export function useMarketData(options: UseMarketDataOptions = {}) {
    const {
        searchQuery = '',
        limit = 50,
        offset = 0,
        enabled = true
    } = options;

    return useQuery({
        queryKey: queryKeys.marketList(limit, offset, searchQuery),
        enabled,
        queryFn: async () => {
            const list = await MarketService.listStocks({
                q: searchQuery || undefined,
                limit,
                offset
            });

            return (list as any[]).map((c: any) => ({
                id: String(c.id),
                symbol: String(c.symbol),
                companyName: String(c.company_name || c.symbol),
                sector: String(c.sector || "Unknown"),
                currentPrice: Number(c.ltp || c.last || 0),
                priceChange: Number(c.change || 0),
                priceChangePercent: Number(c.change_percent || 0),
                pe: Number(c.pe || 0),
                dividendYield: Number(c.dividend_yield || 0),
                roe: Number(c.roe || 0),
                debtToEquity: Number(c.debt_equity || c.debt_to_equity || 0),
                marketCap: Number(c.market_cap || 0),
                eps: Number(c.eps || 0),
                navPerShare: Number(c.nav || 0),
            })) as MarketStock[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
