/**
 * Formatting Utilities
 * Centralized formatting functions for currency, numbers, percentages, etc.
 * Used across all components for consistent formatting throughout the application.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Re-export formatting utilities from formatting-utils
export {
    formatPrice,
    formatChange,
    formatPnL,
    formatNumber,
    getChangeColor,
    getChangeIcon,
    getPnLColor,
    getStatusColor,
} from './formatting-utils';

/**
 * Format a number with commas and decimals (no currency symbol)
 * @param amount - The amount to format
 * @param currency - Currency code (kept for backward compatibility, ignored)
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted number string or '-' if invalid
 * 
 * @example
 * formatCurrency(1234.56) // "1,234.56"
 * formatCurrency(1000) // "1,000.00"
 * formatCurrency(null) // "-"
 */
export function formatCurrency(
    amount?: number | null,
    currency: string = 'USD',  // Kept for backward compatibility but ignored
    locale: string = 'en-US'
): string {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) {
        return '-';
    }

    // Format as decimal number with commas, no currency symbol
    return new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format a number as percentage
 * @param percent - The percentage value to format
 * @param showSign - Whether to show + sign for positive values (default: true)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string or '-' if invalid
 * 
 * @example
 * formatPercent(5.67) // "+5.67%"
 * formatPercent(-3.45) // "-3.45%"
 * formatPercent(5.67, false) // "5.67%"
 * formatPercent(null) // "-"
 */
export function formatPercent(
    percent?: number | null,
    showSign: boolean = true,
    decimals: number = 2
): string {
    if (percent === null || percent === undefined || !Number.isFinite(percent)) {
        return '-';
    }

    const sign = showSign && percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(decimals)}%`;
}


/**
 * Format market cap with Crore (Cr) suffix (no currency symbol)
 * @param marketCap - Market cap value in crores
 * @returns Formatted market cap string or 'N/A' if invalid
 * 
 * @example
 * formatMarketCap(1234.56) // "1,234.56 Cr"
 * formatMarketCap(0) // "N/A"
 * formatMarketCap(null) // "N/A"
 */
export function formatMarketCap(marketCap?: number | null): string {
    if (
        marketCap === null ||
        marketCap === undefined ||
        !Number.isFinite(marketCap) ||
        marketCap === 0
    ) {
        return 'N/A';
    }
    // Format with commas and Cr suffix, no currency symbol
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(marketCap);
    return `${formatted} Cr`;
}

/**
 * Format a number with specific decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string or '-' if invalid
 * 
 * @example
 * formatDecimal(123.456, 2) // "123.46"
 * formatDecimal(123.456, 0) // "123"
 * formatDecimal(null) // "-"
 */
export function formatDecimal(
    num?: number | null,
    decimals: number = 2
): string {
    if (num === null || num === undefined || !Number.isFinite(num)) {
        return '-';
    }
    return num.toFixed(decimals);
}

/**
 * Format a large number with commas
 * @param num - The number to format
 * @returns Formatted number string with commas or '-' if invalid
 * 
 * @example
 * formatWithCommas(1234567) // "1,234,567"
 * formatWithCommas(null) // "-"
 */
export function formatWithCommas(num?: number | null): string {
    if (num === null || num === undefined || !Number.isFinite(num)) {
        return '-';
    }
    return new Intl.NumberFormat('en-US').format(num);
}


/**
 * Get Tailwind CSS color classes for stock ratings
 * @param rating - Stock rating string
 * @returns Tailwind CSS color classes
 * 
 * @example
 * getRatingColor('Strong Buy') // "text-green-700 bg-green-100 border-green-200"
 * getRatingColor('Hold') // "text-yellow-600 bg-yellow-50 border-yellow-200"
 */
export function getRatingColor(rating: string): string {
    switch (rating) {
        case 'Strong Buy':
            return 'text-green-700 bg-green-100 border-green-200';
        case 'Buy':
            return 'text-green-600 bg-green-50 border-green-200';
        case 'Hold':
            return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'Sell':
            return 'text-red-600 bg-red-50 border-red-200';
        case 'Strong Sell':
            return 'text-red-700 bg-red-100 border-red-200';
        default:
            return 'text-gray-600 bg-gray-50 border-gray-200';
    }
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
