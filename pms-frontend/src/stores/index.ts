/**
 * Zustand Stores - Centralized State Management
 *
 * This module exports all Zustand stores used in the application.
 *
 * Architecture: Hybrid React Query + Zustand
 * - React Query: Handles server state, fetching, caching, revalidation.
 * - Zustand: Provides persistent client-side state for instant UI rendering.
 *
 * Stores:
 * - useUIStore: Global UI state (navigation, dialogs).
 * - useStockDataStore: Persistent cache for stock fundamentals/technicals.
 * - usePerformanceStore: Persistent cache for portfolio performance/risk.
 */

export { useUIStore } from './useUIStore';
export type { View } from './useUIStore';

export { useStockDataStore } from './useStockDataStore';
export type { CachedStockDetails } from './useStockDataStore';

export { usePerformanceStore } from './usePerformanceStore';
export type {
    CachedHistoryPoint,
    CachedPerformanceHistory,
    CachedRiskMetrics,
    CachedPerformanceSummary,
} from './usePerformanceStore';
