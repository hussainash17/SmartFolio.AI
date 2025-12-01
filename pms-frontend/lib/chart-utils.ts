/**
 * Chart Utilities
 * Utility functions for chart-related operations
 */

/**
 * Get responsive layout configuration based on chart count
 * @param chartCount - Number of charts to display
 * @returns Layout configuration with cols, rows, chartCols, and chartRows
 * 
 * @example
 * getResponsiveLayout(1) // { cols: 12, rows: 1, chartCols: 12, chartRows: 12 }
 * getResponsiveLayout(4) // { cols: 12, rows: 2, chartCols: 6, chartRows: 6 }
 */
export function getResponsiveLayout(chartCount: number) {
    if (chartCount === 1) {
        return { cols: 12, rows: 1, chartCols: 12, chartRows: 12 }; // Full screen
    } else if (chartCount === 2) {
        return { cols: 12, rows: 1, chartCols: 6, chartRows: 12 }; // Side by side
    } else if (chartCount <= 4) {
        return { cols: 12, rows: 2, chartCols: 6, chartRows: 6 }; // 2x2
    } else if (chartCount <= 6) {
        return { cols: 12, rows: 2, chartCols: 4, chartRows: 6 }; // 2x3
    } else if (chartCount <= 9) {
        return { cols: 12, rows: 3, chartCols: 4, chartRows: 4 }; // 3x3
    } else {
        return { cols: 12, rows: 3, chartCols: 3, chartRows: 4 }; // 3x4
    }
}

