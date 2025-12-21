import { create } from 'zustand';
import type { Stock } from '../../types/portfolio';

/**
 * View types supported by the application navigation.
 */
export type View =
    | 'dashboard'
    | 'portfolios'
    | 'portfolio-detail'
    | 'performance'
    | 'allocation'
    | 'goals'
    | 'trading'
    | 'orders'
    | 'market'
    | 'watchlist'
    | 'screener'
    | 'research'
    | 'fundamentals'
    | 'news'
    | 'risk-analysis'
    | 'correlation'
    | 'rebalancing'
    | 'risk-profile'
    | 'reports'
    | 'tax-center'
    | 'statements'
    | 'transactions'
    | 'account'
    | 'profile'
    | 'settings'
    | 'help'
    | 'chart'
    | 'analytics'
    | 'ideas';

/**
 * UI State managed globally via Zustand.
 * This replaces useState calls in App.tsx for navigation and dialog management.
 */
interface UIState {
    // Navigation
    currentView: View;
    detailBackTarget: View;

    // Dialog visibility
    isPortfolioFormOpen: boolean;
    isStockFormOpen: boolean;
    isUploadPortfolioOpen: boolean;
    isQuickTradeOpen: boolean;

    // Dialog data
    editingStock: Stock | null;
    quickTradeSymbol: string | undefined;
    quickTradeSide: 'buy' | 'sell' | undefined;

    // Active symbols for views
    researchChartSymbol: string;
    fundamentalsSymbol: string;
}

interface UIActions {
    // Navigation
    setView: (view: View) => void;
    setViewWithBackTarget: (view: View, backTarget: View) => void;
    goBack: () => void;

    // Portfolio Form
    openPortfolioForm: () => void;
    closePortfolioForm: () => void;

    // Stock Form
    openStockForm: (stock?: Stock) => void;
    closeStockForm: () => void;

    // Upload Dialog
    openUploadPortfolio: () => void;
    closeUploadPortfolio: () => void;

    // Quick Trade
    openQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
    closeQuickTrade: () => void;

    // Symbol setters
    setResearchSymbol: (symbol: string) => void;
    setFundamentalsSymbol: (symbol: string) => void;
}

const initialState: UIState = {
    currentView: 'dashboard',
    detailBackTarget: 'portfolios',
    isPortfolioFormOpen: false,
    isStockFormOpen: false,
    isUploadPortfolioOpen: false,
    isQuickTradeOpen: false,
    editingStock: null,
    quickTradeSymbol: undefined,
    quickTradeSide: undefined,
    researchChartSymbol: 'DSEX',
    fundamentalsSymbol: 'GP',
};

/**
 * Global UI state store.
 * Manages navigation, dialog visibility, and active symbols.
 */
export const useUIStore = create<UIState & UIActions>()((set, get) => ({
    ...initialState,

    // Navigation actions
    setView: (view) => {
        set({ currentView: view });
        window.location.hash = `/${view}`;
    },

    setViewWithBackTarget: (view, backTarget) => {
        set({ currentView: view, detailBackTarget: backTarget });
        window.location.hash = `/${view}`;
    },

    goBack: () => {
        const target = get().detailBackTarget;
        set({ currentView: target });
        window.location.hash = `/${target}`;
    },

    // Portfolio Form actions
    openPortfolioForm: () => set({ isPortfolioFormOpen: true }),
    closePortfolioForm: () => set({ isPortfolioFormOpen: false }),

    // Stock Form actions
    openStockForm: (stock) =>
        set({ isStockFormOpen: true, editingStock: stock ?? null }),
    closeStockForm: () => set({ isStockFormOpen: false, editingStock: null }),

    // Upload Dialog actions
    openUploadPortfolio: () => set({ isUploadPortfolioOpen: true }),
    closeUploadPortfolio: () => set({ isUploadPortfolioOpen: false }),

    // Quick Trade actions
    openQuickTrade: (symbol, side) =>
        set({
            isQuickTradeOpen: true,
            quickTradeSymbol: symbol,
            quickTradeSide: side,
        }),
    closeQuickTrade: () =>
        set({
            isQuickTradeOpen: false,
            quickTradeSymbol: undefined,
            quickTradeSide: undefined,
        }),

    // Symbol setters
    setResearchSymbol: (symbol) => set({ researchChartSymbol: symbol }),
    setFundamentalsSymbol: (symbol) => set({ fundamentalsSymbol: symbol }),
}));
