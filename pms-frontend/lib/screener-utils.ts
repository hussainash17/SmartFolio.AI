/**
 * Stock Screener Utility Functions
 * Screener-specific utilities and re-exports of common formatting functions
 */

import {
    formatCurrency,
    formatNumber,
    formatPercent,
    formatMarketCap,
    getRatingColor,
} from './utils';

// Re-export formatting utilities for backward compatibility
export {
    formatCurrency,
    formatNumber,
    formatPercent,
    formatMarketCap,
    getRatingColor,
};

export interface ScreenerFilters {
    // Basic filters
    sector: string;
    industry: string;
    marketCap: [number, number];

    // Fundamental filters
    peRatio: [number, number];
    priceToBook: [number, number];
    debtToEquity: [number, number];
    returnOnEquity: [number, number];
    revenueGrowth: [number, number];
    earningsGrowth: [number, number];
    dividendYield: [number, number];

    // Technical filters
    priceRange: [number, number];
    volume: [number, number];
    rsi: [number, number];
    movingAverage: string;
    priceChange: [number, number];

    // Additional filters
    country: string;
    exchange: string;
}

export const SECTORS = [
    'Technology',
    'Healthcare',
    'Financial Services',
    'Consumer Discretionary',
    'Communication Services',
    'Industrials',
    'Consumer Staples',
    'Energy',
    'Utilities',
    'Real Estate',
    'Materials',
];

/**
 * Creates default filter values
 */
export const createDefaultFilters = (): ScreenerFilters => ({
    sector: 'all',
    industry: 'all',
    marketCap: [0, 1000000],
    peRatio: [0, 100],
    priceToBook: [0, 10],
    debtToEquity: [0, 200],
    returnOnEquity: [0, 100],
    revenueGrowth: [-50, 100],
    earningsGrowth: [-100, 200],
    dividendYield: [0, 10],
    priceRange: [0, 1000],
    volume: [0, 100000000],
    rsi: [0, 100],
    movingAverage: 'all',
    priceChange: [-20, 20],
    country: 'all',
    exchange: 'all',
});

/**
 * Checks if two range values are equal
 */
export const isRangeEqual = (a: [number, number], b: [number, number]): boolean =>
    a[0] === b[0] && a[1] === b[1];

/**
 * Calculates the number of active filters (non-default values)
 */
export const calculateActiveFilters = (current: ScreenerFilters): number => {
    const defaults = createDefaultFilters();
    let count = 0;

    if (current.sector !== defaults.sector) count++;
    if (current.industry !== defaults.industry) count++;
    if (!isRangeEqual(current.marketCap, defaults.marketCap)) count++;
    if (!isRangeEqual(current.peRatio, defaults.peRatio)) count++;
    if (!isRangeEqual(current.priceToBook, defaults.priceToBook)) count++;
    if (!isRangeEqual(current.debtToEquity, defaults.debtToEquity)) count++;
    if (!isRangeEqual(current.returnOnEquity, defaults.returnOnEquity)) count++;
    if (!isRangeEqual(current.revenueGrowth, defaults.revenueGrowth)) count++;
    if (!isRangeEqual(current.earningsGrowth, defaults.earningsGrowth)) count++;
    if (!isRangeEqual(current.dividendYield, defaults.dividendYield)) count++;
    if (!isRangeEqual(current.priceRange, defaults.priceRange)) count++;
    if (!isRangeEqual(current.volume, defaults.volume)) count++;
    if (!isRangeEqual(current.rsi, defaults.rsi)) count++;
    if (current.movingAverage !== defaults.movingAverage) count++;
    if (!isRangeEqual(current.priceChange, defaults.priceChange)) count++;
    if (current.country !== defaults.country) count++;
    if (current.exchange !== defaults.exchange) count++;

    return count;
};
