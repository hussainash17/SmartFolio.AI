/**
 * Formatting Utilities
 * Centralized formatting functions for prices, changes, P&L, numbers, etc.
 * Used across all components for consistent formatting throughout the application.
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import React from 'react';

/**
 * Format a price value (handles both string and number inputs)
 * @param price - The price to format (can be number or string)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string or '--' if invalid
 * 
 * @example
 * formatPrice(1234.56) // "1234.56"
 * formatPrice("1234.56") // "1234.56"
 * formatPrice(null) // "--"
 */
export function formatPrice(price?: number | string | null, decimals: number = 2): string {
    if (price === undefined || price === null) return '--';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '--' : numPrice.toFixed(decimals);
}

/**
 * Format a change value with optional percentage
 * @param change - The change value (can be number or string)
 * @param changePercent - Optional percentage change (can be number or string)
 * @returns Formatted change string with sign and percentage, or null if invalid
 * 
 * @example
 * formatChange(5.5, 2.3) // "+5.50 (+2.30%)"
 * formatChange(-3.2) // "-3.20"
 * formatChange(null) // null
 */
export function formatChange(change?: number | string | null, changePercent?: number | string | null): string | null {
    if (change === undefined || change === null) return null;
    const numChange = typeof change === 'string' ? parseFloat(change) : change;
    if (isNaN(numChange)) return null;

    const sign = numChange >= 0 ? '+' : '';
    let percentStr = '';
    if (changePercent !== undefined && changePercent !== null) {
        const numPercent = typeof changePercent === 'string' ? parseFloat(changePercent) : changePercent;
        if (!isNaN(numPercent)) {
            percentStr = ` (${sign}${numPercent.toFixed(2)}%)`;
        }
    }
    return `${sign}${numChange.toFixed(2)}${percentStr}`;
}

/**
 * Format a P&L (Profit & Loss) value
 * @param pnl - The P&L value (can be number or string)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted P&L string with sign, or '--' if invalid
 * 
 * @example
 * formatPnL(123.45) // "+123.45"
 * formatPnL(-67.89) // "-67.89"
 * formatPnL(null) // "--"
 */
export function formatPnL(pnl?: number | string | null, decimals: number = 2): string {
    if (pnl === undefined || pnl === null) return '--';
    const numPnL = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    if (isNaN(numPnL)) return '--';
    const sign = numPnL >= 0 ? '+' : '';
    return `${sign}${numPnL.toFixed(decimals)}`;
}

/**
 * Format a number with K/M/B suffixes
 * @param num - The number to format (can be number or string)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string with suffix or '--' if invalid
 * 
 * @example
 * formatNumber(1500000000) // "1.50B"
 * formatNumber(2500000) // "2.50M"
 * formatNumber(3500) // "3.50K"
 * formatNumber(null) // "--"
 */
export function formatNumber(num?: number | string | null, decimals: number = 2): string {
    if (num === undefined || num === null) return '--';
    const numVal = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numVal)) return '--';
    if (numVal >= 1e9) return `${(numVal / 1e9).toFixed(decimals)}B`;
    if (numVal >= 1e6) return `${(numVal / 1e6).toFixed(decimals)}M`;
    if (numVal >= 1e3) return `${(numVal / 1e3).toFixed(decimals)}K`;
    return numVal.toFixed(0);
}

/**
 * Get Tailwind CSS color class for change value
 * @param change - The change value (can be number or string)
 * @returns Tailwind CSS color class
 * 
 * @example
 * getChangeColor(5.5) // "text-emerald-500"
 * getChangeColor(-3.2) // "text-rose-500"
 * getChangeColor(null) // "text-muted-foreground"
 */
export function getChangeColor(change?: number | string | null): string {
    if (!change) return 'text-muted-foreground';
    const numChange = typeof change === 'string' ? parseFloat(change) : change;
    return isNaN(numChange) ? 'text-muted-foreground' : numChange >= 0 ? 'text-emerald-500' : 'text-rose-500';
}

/**
 * Get change icon component (TrendingUp or TrendingDown)
 * @param change - The change value (can be number or string)
 * @returns React component or null
 * 
 * @example
 * getChangeIcon(5.5) // <TrendingUp className="w-3 h-3" />
 * getChangeIcon(-3.2) // <TrendingDown className="w-3 h-3" />
 * getChangeIcon(null) // null
 */
export function getChangeIcon(change?: number | string | null, className: string = 'w-3 h-3'): React.ReactElement | null {
    if (!change) return null;
    const numChange = typeof change === 'string' ? parseFloat(change) : change;
    if (isNaN(numChange)) return null;
    return numChange >= 0 ? <TrendingUp className={className} /> : <TrendingDown className={className} />;
}

/**
 * Get Tailwind CSS color class for P&L value
 * @param pnl - The P&L value (can be number or string)
 * @returns Tailwind CSS color class
 * 
 * @example
 * getPnLColor(123.45) // "text-emerald-500"
 * getPnLColor(-67.89) // "text-rose-500"
 * getPnLColor(null) // "text-muted-foreground"
 */
export function getPnLColor(pnl?: number | string | null): string {
    if (!pnl) return 'text-muted-foreground';
    const numPnL = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    return isNaN(numPnL) ? 'text-muted-foreground' : numPnL >= 0 ? 'text-emerald-500' : 'text-rose-500';
}

/**
 * Get Tailwind CSS color class for order status
 * @param status - The order status string
 * @returns Tailwind CSS color class
 * 
 * @example
 * getStatusColor('filled') // "text-emerald-500"
 * getStatusColor('pending') // "text-blue-500"
 * getStatusColor('cancelled') // "text-rose-500"
 */
export function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'filled':
            return 'text-emerald-500';
        case 'open':
        case 'pending':
            return 'text-blue-500';
        case 'cancelled':
        case 'rejected':
            return 'text-rose-500';
        default:
            return 'text-muted-foreground';
    }
}

