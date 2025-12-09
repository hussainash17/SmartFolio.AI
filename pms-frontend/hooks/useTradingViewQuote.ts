import { useQuery } from "@tanstack/react-query";
import { MarketService } from "../src/client";
import { queryKeys } from "./queryKeys";

interface TradingViewQuote {
    symbol: string;
    lastPrice: number | null;
    change: number | null;
    changePercent: number | null;
    priceDirection: 'up' | 'down' | null;
}

interface UseTradingViewQuoteOptions {
    symbol: string;
    enabled?: boolean;
    refetchInterval?: number;
}

/**
 * Hook for fetching real-time quote data for TradingView chart.
 * Automatically refetches every 30 seconds to show current price updates.
 */
export function useTradingViewQuote(options: UseTradingViewQuoteOptions) {
    const {
        symbol,
        enabled = true,
        refetchInterval = 30000, // 30 seconds
    } = options;

    return useQuery({
        queryKey: queryKeys.tradingViewQuote(symbol),
        enabled: enabled && !!symbol,
        refetchInterval,
        queryFn: async (): Promise<TradingViewQuote> => {
            try {
                const stockResponse = await MarketService.getStock({ symbol });

                // Extract data with fallbacks for different API response structures
                const data = (stockResponse as any)?.data || stockResponse;
                const last = data?.last_trade_price ?? data?.last ?? data?.close ?? data?.price ?? null;
                const change = data?.change ?? null;
                const changePercentVal = data?.change_percent ?? null;

                const parsedLast = last !== null ? Number(last) : null;
                const parsedChange = change !== null ? Number(change) : null;
                const parsedChangePercent = changePercentVal !== null ? Number(changePercentVal) : null;

                return {
                    symbol,
                    lastPrice: parsedLast !== null && !Number.isNaN(parsedLast) ? parsedLast : null,
                    change: parsedChange !== null && !Number.isNaN(parsedChange) ? parsedChange : null,
                    changePercent: parsedChangePercent !== null && !Number.isNaN(parsedChangePercent) ? parsedChangePercent : null,
                    priceDirection: null, // Direction will be determined by component comparing with previous value
                };
            } catch (error) {
                console.error('Error fetching quote for', symbol, error);
                return {
                    symbol,
                    lastPrice: null,
                    change: null,
                    changePercent: null,
                    priceDirection: null,
                };
            }
        },
        staleTime: 30000, // 30 seconds
    });
}
