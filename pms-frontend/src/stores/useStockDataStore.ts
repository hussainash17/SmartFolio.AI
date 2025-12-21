import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Cached stock details combining fundamental and technical data.
 * This structure is designed to hold the "heavy" data that is expensive to fetch.
 */
export interface CachedStockDetails {
    // Identification
    symbol: string;
    companyName: string;
    sector: string;
    category?: string;

    // Valuation Metrics
    ltp?: number;
    ltpChange?: number;
    ycp?: number;
    currentPE?: number;
    auditedPE?: number;
    dividendYield?: number;
    nav?: number;
    faceValue?: number;
    marketCap?: number;

    // Financial Health
    shortTermLoan?: number;
    longTermLoan?: number;
    totalDebt?: number;
    reserveAndSurplus?: number;
    debtStatus?: string;

    // Profitability
    eps?: number;
    roe?: number;
    debtToEquity?: number;
    score?: number;

    // Earnings Data (quarterly and annual)
    quarterlyEPS?: Array<{
        quarter: string;
        year: number;
        eps: number;
        growthPercent?: number;
    }>;
    annualProfit?: Array<{
        year: number;
        profit: number;
        eps: number;
        growthPercent?: number;
    }>;

    // Dividends
    dividendHistory?: Array<{
        year: number;
        cashDividend?: number;
        stockDividend?: number;
        dividendYield?: number;
    }>;

    // Metadata
    lastUpdated: number; // Unix timestamp
}

interface StockDataState {
    /**
     * Cache of stock details, keyed by uppercase symbol.
     */
    stocks: Record<string, CachedStockDetails>;

    /**
     * Timestamp of the last cache cleanup.
     */
    lastCacheCleanup: number;
}

interface StockDataActions {
    /**
     * Sync (upsert) stock details into the cache.
     * @param symbol - Stock symbol (will be normalized to uppercase).
     * @param data - Partial stock data to merge into existing cache.
     */
    syncStock: (symbol: string, data: Partial<Omit<CachedStockDetails, 'symbol' | 'lastUpdated'>>) => void;

    /**
     * Get cached stock details by symbol.
     * Returns undefined if not found or if data is stale (older than maxAge).
     * @param symbol - Stock symbol.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 24 hours.
     */
    getStock: (symbol: string, maxAgeMs?: number) => CachedStockDetails | undefined;

    /**
     * Check if a stock exists in cache and is fresh.
     * @param symbol - Stock symbol.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 1 hour.
     */
    hasValidCache: (symbol: string, maxAgeMs?: number) => boolean;

    /**
     * Clear all cached stock data.
     */
    clearCache: () => void;

    /**
     * Clean up stale entries older than a specified age.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 7 days.
     */
    cleanupStaleEntries: (maxAgeMs?: number) => void;
}

// Default cache validity: 1 hour
const DEFAULT_CACHE_MAX_AGE_MS = 60 * 60 * 1000;
// Stale entry cleanup: 7 days
const STALE_ENTRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Persistent store for stock details.
 * Uses localStorage to persist data across sessions.
 * Provides instant access to previously fetched data while React Query updates in background.
 */
export const useStockDataStore = create<StockDataState & StockDataActions>()(
    persist(
        (set, get) => ({
            stocks: {},
            lastCacheCleanup: Date.now(),

            syncStock: (symbol, data) => {
                const normalizedSymbol = symbol.toUpperCase();
                set((state) => ({
                    stocks: {
                        ...state.stocks,
                        [normalizedSymbol]: {
                            ...(state.stocks[normalizedSymbol] || {}),
                            ...data,
                            symbol: normalizedSymbol,
                            lastUpdated: Date.now(),
                        } as CachedStockDetails,
                    },
                }));
            },

            getStock: (symbol, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
                const normalizedSymbol = symbol.toUpperCase();
                const cached = get().stocks[normalizedSymbol];
                if (!cached) return undefined;

                const age = Date.now() - cached.lastUpdated;
                if (age > maxAgeMs) return undefined;

                return cached;
            },

            hasValidCache: (symbol, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
                return !!get().getStock(symbol, maxAgeMs);
            },

            clearCache: () => {
                set({ stocks: {}, lastCacheCleanup: Date.now() });
            },

            cleanupStaleEntries: (maxAgeMs = STALE_ENTRY_MAX_AGE_MS) => {
                const now = Date.now();
                set((state) => {
                    const freshStocks: Record<string, CachedStockDetails> = {};
                    Object.entries(state.stocks).forEach(([symbol, data]) => {
                        if (now - data.lastUpdated < maxAgeMs) {
                            freshStocks[symbol] = data;
                        }
                    });
                    return { stocks: freshStocks, lastCacheCleanup: now };
                });
            },
        }),
        {
            name: 'tradesmart-stock-data-cache',
            storage: createJSONStorage(() => localStorage),
            // Only persist essential fields, skip actions
            partialize: (state) => ({
                stocks: state.stocks,
                lastCacheCleanup: state.lastCacheCleanup,
            }),
        }
    )
);
