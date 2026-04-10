import { useQuery } from "@tanstack/react-query";
import { MarketService, OpenAPI } from "../src/client";
import { queryKeys } from "./queryKeys";

interface MarketData {
    symbol: string;
    companyName: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    volume: number;
    high52Week: number;
    low52Week: number;
    marketCap: number;
    peRatio?: number;
    dividend?: number;
    dividendYield?: number;
    sector: string;
    industry: string;
    lastUpdated: string;
}

/**
 * Hook to fetch ALL market stocks with pagination.
 * Used by useTrading hook for the full market data list.
 * Fetches stocks in batches until all are retrieved.
 */
export function useAllMarketData() {
    return useQuery({
        queryKey: queryKeys.marketList(500, 0), // Same key as useTrading for cache compatibility
        enabled: !!(OpenAPI as any).TOKEN,
        queryFn: async () => {
            const pageSize = 200;
            let offset = 0;
            const seen = new Set<string>();
            const allRows: any[] = [];

            while (true) {
                const page = (await MarketService.listStocks({ limit: pageSize, offset })) as any[];
                const rows = page || [];

                if (!rows.length) {
                    break;
                }

                for (const row of rows) {
                    const symbol: string = String(row?.symbol || '').toUpperCase();
                    if (!symbol || seen.has(symbol)) continue;
                    seen.add(symbol);
                    allRows.push(row);
                }

                if (rows.length < pageSize) {
                    break;
                }

                offset += pageSize;
                if (offset >= 2000) {
                    // Safety guard to avoid unexpectedly large loops
                    break;
                }
            }

            const mapped: MarketData[] = allRows.map((it: any) => ({
                symbol: String(it.symbol || '').toUpperCase(),
                companyName: it.company_name || it.name || String(it.symbol || '').toUpperCase(),
                currentPrice: Number(it.ltp || it.last || 0),
                change: Number(it.change || 0),
                changePercent: Number(it.change_percent || 0),
                volume: Number(it.volume || 0),
                high52Week: 0,
                low52Week: 0,
                marketCap: (() => {
                    const lastPrice = Number(it.ltp || it.last || 0);
                    const totalSecurities = Number(it.total_outstanding_securities || 0);
                    // Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
                    // 1 crore = 10,000,000
                    return lastPrice > 0 && totalSecurities > 0
                        ? (lastPrice * totalSecurities) / 10_000_000
                        : Number(it.market_cap || 0);
                })(),
                peRatio: it.pe ? Number(it.pe) : undefined,
                dividend: undefined,
                dividendYield: it.dividend_yield ? Number(it.dividend_yield) : undefined,
                sector: it.sector || 'Unknown',
                industry: it.industry || 'Unknown',
                lastUpdated: it.timestamp || new Date().toISOString(),
            }));

            return mapped.sort((a, b) => a.symbol.localeCompare(b.symbol));
        },
        staleTime: 30 * 1000, // 30 seconds
    });
}
