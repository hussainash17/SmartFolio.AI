import { useQuery } from "@tanstack/react-query";
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
        enabled: enabled && !!symbol && symbol.trim() !== '',
        queryFn: async (): Promise<TradingViewPosition[]> => {
            const normalizedSymbol = symbol.trim().toUpperCase();

            try {
                const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
                const response = await fetch(`${apiUrl}/api/v1/tradingview/positions/${normalizedSymbol}`);

                if (!response.ok) {
                    return [];
                }

                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Error fetching positions for', symbol, error);
                return [];
            }
        },
        staleTime: 60000, // 1 minute - positions don't change frequently
    });
}
