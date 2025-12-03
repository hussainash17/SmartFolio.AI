import { useQuery } from "@tanstack/react-query";
import { MarketService } from "../src/client";
import { queryKeys } from "./queryKeys";

interface MarketStock {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    industry: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
    turnover: number;
    timestamp: string;
}

interface UseMarketDataOptions {
    searchQuery?: string;
    sector?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
}

/**
 * Hook for fetching basic market stock data.
 * Fast, lightweight endpoint for basic stock information.
 * For fundamental metrics, use useFundamentalsData hook instead.
 */
export function useMarketData(options: UseMarketDataOptions = {}) {
    const {
        searchQuery = '',
        sector,
        limit = 50,
        offset = 0,
        enabled = true
    } = options;

    return useQuery({
        queryKey: queryKeys.marketList(limit, offset, searchQuery, sector),
        enabled,
        queryFn: async () => {
            const list = await MarketService.listStocks({
                q: searchQuery || undefined,
                sector: sector || undefined,
                limit,
                offset
            });

            return (list as any[]).map((c: any) => ({
                id: String(c.id),
                symbol: String(c.symbol),
                companyName: String(c.company_name || c.symbol),
                sector: String(c.sector || "Unknown"),
                industry: String(c.industry || ""),
                currentPrice: Number(c.ltp || c.last || 0),
                priceChange: Number(c.change || 0),
                priceChangePercent: Number(c.change_percent || 0),
                volume: Number(c.volume || 0),
                turnover: Number(c.turnover || 0),
                timestamp: c.timestamp || '',
            })) as MarketStock[];
        },
        staleTime: 1000 * 60 * 1, // 1 minute for live market data
    });
}
