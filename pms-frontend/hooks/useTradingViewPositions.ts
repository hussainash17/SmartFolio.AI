import { useQuery } from "@tanstack/react-query";
import { TradingviewService, OpenAPI } from "../src/client";
import { queryKeys } from "./queryKeys";

export interface TradingViewPosition {
    id: string;
    portfolio_id: string;
    portfolio_name: string;
    symbol: string;
    quantity: number;
    price: number;
    side: string;
    timestamp: number | null;
    unrealized_pnl: number;
    unrealized_pnl_percent: number;
    current_value: number;
}

interface UseTradingViewPositionsOptions {
    symbol: string;
    enabled?: boolean;
}

/**
 * Hook for fetching portfolio positions for a symbol to display on TradingView chart.
 * Shows position lines at average entry prices.
 */
export function useTradingViewPositions(options: UseTradingViewPositionsOptions) {
    const { symbol, enabled = true } = options;

    return useQuery({
        queryKey: queryKeys.tradingViewPositions(symbol),
        enabled: enabled && !!symbol && symbol.trim() !== '' && !!(OpenAPI as any).TOKEN,
        queryFn: async (): Promise<TradingViewPosition[]> => {
            const normalizedSymbol = symbol.trim().toUpperCase();

            try {
                const data = await TradingviewService.getPositionsForTradingview({
                    symbol: normalizedSymbol
                });
                return (data as any) || [];
            } catch (error) {
                console.error('Error fetching positions for', symbol, error);
                return [];
            }
        },
        staleTime: 60000, // 1 minute - positions don't change frequently
    });
}
