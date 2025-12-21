import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Cached value history data point for charts.
 */
export interface CachedHistoryPoint {
    date: string;
    portfolioValue: number;
    portfolioReturn: number;
    portfolioCumulativeReturn: number;
    benchmarkValue?: number;
    benchmarkReturn?: number;
    benchmarkCumulativeReturn?: number;
    relativeReturn?: number;
    alpha?: number;
}

/**
 * Cached performance history for a portfolio.
 */
export interface CachedPerformanceHistory {
    portfolioId: string;
    period: string;
    benchmarkId?: string;
    benchmarkName?: string;
    frequency: string;
    data: CachedHistoryPoint[];
    lastUpdated: number;
}

/**
 * Cached risk metrics for a portfolio.
 */
export interface CachedRiskMetrics {
    portfolioId: string;
    period: string;
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    beta?: number;
    correlation?: number;
    var95?: number;
    var99?: number;
    lastUpdated: number;
}

/**
 * Cached performance summary for quick dashboard access.
 */
export interface CachedPerformanceSummary {
    portfolioId: string;
    portfolioName: string;
    period: string;
    totalValue: number;
    totalCost: number;
    cumulativeReturn: number;
    cumulativeReturnPercent: number;
    timeWeightedReturn: number;
    moneyWeightedReturn: number;
    annualizedReturn: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    netContributions: number;
    netWithdrawals: number;
    lastUpdated: number;
}

interface PerformanceState {
    /**
     * Cached performance history, keyed by `{portfolioId}_{period}_{benchmarkId}`.
     */
    history: Record<string, CachedPerformanceHistory>;

    /**
     * Cached risk metrics, keyed by `{portfolioId}_{period}`.
     */
    risk: Record<string, CachedRiskMetrics>;

    /**
     * Cached performance summaries, keyed by `{portfolioId}_{period}`.
     */
    summary: Record<string, CachedPerformanceSummary>;
}

interface PerformanceActions {
    /**
     * Generate cache key for history.
     */
    getHistoryKey: (portfolioId: string, period: string, benchmarkId?: string) => string;

    /**
     * Generate cache key for risk/summary.
     */
    getRiskKey: (portfolioId: string, period: string) => string;

    /**
     * Sync performance history into cache.
     */
    syncHistory: (portfolioId: string, period: string, data: Omit<CachedPerformanceHistory, 'portfolioId' | 'period' | 'lastUpdated'>) => void;

    /**
     * Sync risk metrics into cache.
     */
    syncRisk: (portfolioId: string, period: string, data: Omit<CachedRiskMetrics, 'portfolioId' | 'period' | 'lastUpdated'>) => void;

    /**
     * Sync performance summary into cache.
     */
    syncSummary: (portfolioId: string, period: string, data: Omit<CachedPerformanceSummary, 'portfolioId' | 'period' | 'lastUpdated'>) => void;

    /**
     * Get cached history.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 5 minutes.
     */
    getHistory: (portfolioId: string, period: string, benchmarkId?: string, maxAgeMs?: number) => CachedPerformanceHistory | undefined;

    /**
     * Get cached risk metrics.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 5 minutes.
     */
    getRisk: (portfolioId: string, period: string, maxAgeMs?: number) => CachedRiskMetrics | undefined;

    /**
     * Get cached performance summary.
     * @param maxAgeMs - Maximum age in milliseconds. Default: 5 minutes.
     */
    getSummary: (portfolioId: string, period: string, maxAgeMs?: number) => CachedPerformanceSummary | undefined;

    /**
     * Clear all performance cache.
     */
    clearCache: () => void;

    /**
     * Clear cache for a specific portfolio.
     */
    clearPortfolioCache: (portfolioId: string) => void;
}

// Default cache validity: 5 minutes for performance data
const DEFAULT_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Persistent store for portfolio performance data.
 * Provides instant access to performance metrics and charts while React Query updates in background.
 */
export const usePerformanceStore = create<PerformanceState & PerformanceActions>()(
    persist(
        (set, get) => ({
            history: {},
            risk: {},
            summary: {},

            // Key generators
            getHistoryKey: (portfolioId, period, benchmarkId) =>
                `${portfolioId}_${period}_${benchmarkId || 'DSEX'}`,

            getRiskKey: (portfolioId, period) => `${portfolioId}_${period}`,

            // Sync actions
            syncHistory: (portfolioId, period, data) => {
                const key = get().getHistoryKey(portfolioId, period, data.benchmarkId);
                set((state) => ({
                    history: {
                        ...state.history,
                        [key]: {
                            ...data,
                            portfolioId,
                            period,
                            lastUpdated: Date.now(),
                        },
                    },
                }));
            },

            syncRisk: (portfolioId, period, data) => {
                const key = get().getRiskKey(portfolioId, period);
                set((state) => ({
                    risk: {
                        ...state.risk,
                        [key]: {
                            ...data,
                            portfolioId,
                            period,
                            lastUpdated: Date.now(),
                        },
                    },
                }));
            },

            syncSummary: (portfolioId, period, data) => {
                const key = get().getRiskKey(portfolioId, period);
                set((state) => ({
                    summary: {
                        ...state.summary,
                        [key]: {
                            ...data,
                            portfolioId,
                            period,
                            lastUpdated: Date.now(),
                        },
                    },
                }));
            },

            // Get actions with freshness check
            getHistory: (portfolioId, period, benchmarkId, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
                const key = get().getHistoryKey(portfolioId, period, benchmarkId);
                const cached = get().history[key];
                if (!cached) return undefined;
                if (Date.now() - cached.lastUpdated > maxAgeMs) return undefined;
                return cached;
            },

            getRisk: (portfolioId, period, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
                const key = get().getRiskKey(portfolioId, period);
                const cached = get().risk[key];
                if (!cached) return undefined;
                if (Date.now() - cached.lastUpdated > maxAgeMs) return undefined;
                return cached;
            },

            getSummary: (portfolioId, period, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
                const key = get().getRiskKey(portfolioId, period);
                const cached = get().summary[key];
                if (!cached) return undefined;
                if (Date.now() - cached.lastUpdated > maxAgeMs) return undefined;
                return cached;
            },

            // Clear actions
            clearCache: () => {
                set({ history: {}, risk: {}, summary: {} });
            },

            clearPortfolioCache: (portfolioId) => {
                set((state) => {
                    const filterByPortfolio = (obj: Record<string, any>) => {
                        return Object.fromEntries(
                            Object.entries(obj).filter(([key]) => !key.startsWith(portfolioId))
                        );
                    };
                    return {
                        history: filterByPortfolio(state.history),
                        risk: filterByPortfolio(state.risk),
                        summary: filterByPortfolio(state.summary),
                    };
                });
            },
        }),
        {
            name: 'tradesmart-performance-cache',
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for sensitive financial data
            partialize: (state) => ({
                history: state.history,
                risk: state.risk,
                summary: state.summary,
            }),
        }
    )
);
