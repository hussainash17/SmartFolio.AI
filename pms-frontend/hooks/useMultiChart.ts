import { useState, useCallback, useEffect } from 'react'
import type { Layout } from 'react-grid-layout'
import { MarketService } from '../src/client'

export interface ChartConfig {
    i: string           // Unique ID (required by RGL)
    symbol: string
    timeframe: string
    chartType: 'candlestick' | 'line' | 'area'

    // React-Grid-Layout positioning
    x: number          // Grid column (0-11)
    y: number          // Grid row (0-based)
    w: number          // Width in grid units
    h: number          // Height in grid units
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
}

const STORAGE_KEY = 'multi_chart_layout'

// Fetch random symbols from API
async function fetchRandomSymbols(count: number = 4): Promise<string[]> {
    try {
        const response = await MarketService.listStocks({ limit: 100, offset: 0 }) as any
        if (Array.isArray(response) && response.length > 0) {
            // Get valid symbols
            const validSymbols = response.filter((stock: any) => stock?.symbol).map((stock: any) => stock.symbol)

            // Shuffle and pick random symbols
            const shuffled = validSymbols.sort(() => 0.5 - Math.random())
            return shuffled.slice(0, Math.min(count, shuffled.length))
        }
    } catch (error) {
        console.error('Error fetching symbols:', error)
    }

    // Fallback to known valid symbols
    return ['GP', 'BRACBANK', 'SQURPHARMA', 'BATBC'].slice(0, count)
}

export function useMultiChart() {
    const [charts, setCharts] = useState<ChartConfig[]>(() => {
        // Load from localStorage or use defaults
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                // Ignore parsing errors
            }
        }

        // Default empty - will be populated by effect
        return []
    })

    // Initialize with random symbols from API on first load
    useEffect(() => {
        const initializeCharts = async () => {
            if (charts.length === 0) {
                const symbols = await fetchRandomSymbols(4)

                // Default 2×2 layout with real symbols
                const defaultCharts: ChartConfig[] = [
                    { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
                    { i: '2', symbol: symbols[1] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
                    { i: '3', symbol: symbols[2] || 'SQURPHARMA', timeframe: 'D', chartType: 'line', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
                    { i: '4', symbol: symbols[3] || 'BATBC', timeframe: 'D', chartType: 'candlestick', x: 6, y: 4, w: 6, h: 4, minW: 3, minH: 3 }
                ]
                setCharts(defaultCharts)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCharts))
            }
        }

        initializeCharts()
    }, []) // Run only once on mount

    // Save to localStorage whenever layout changes
    const saveLayout = useCallback((newCharts: ChartConfig[]) => {
        setCharts(newCharts)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newCharts))
    }, [])

    // Handle layout change from drag/resize
    const handleLayoutChange = useCallback((newLayout: Layout[]) => {
        setCharts(prev => {
            const updated = prev.map(chart => {
                const layoutItem = newLayout.find(item => item.i === chart.i)
                if (layoutItem) {
                    return {
                        ...chart,
                        x: layoutItem.x,
                        y: layoutItem.y,
                        w: layoutItem.w,
                        h: layoutItem.h
                    }
                }
                return chart
            })
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
            return updated
        })
    }, [])

    // Add new chart
    const addChart = useCallback((symbol: string = 'GP', timeframe: string = 'D') => {
        const newChart: ChartConfig = {
            i: `chart_${Date.now()}`,
            symbol,
            timeframe,
            chartType: 'candlestick',
            x: 0,
            y: Infinity, // Auto-place at bottom
            w: 6,
            h: 4,
            minW: 3,
            minH: 3
        }
        saveLayout([...charts, newChart])
    }, [charts, saveLayout])

    // Remove chart
    const removeChart = useCallback((id: string) => {
        saveLayout(charts.filter(c => c.i !== id))
    }, [charts, saveLayout])

    // Update chart config
    const updateChart = useCallback((id: string, updates: Partial<ChartConfig>) => {
        saveLayout(charts.map(c => c.i === id ? { ...c, ...updates } : c))
    }, [charts, saveLayout])

    // Apply preset layout
    const applyPreset = useCallback(async (preset: 'single' | '2x2' | '3x3' | '2x3' | '3x4') => {
        const symbolCounts: Record<string, number> = { 'single': 1, '2x2': 4, '2x3': 6, '3x3': 9, '3x4': 12 }
        const symbols = await fetchRandomSymbols(symbolCounts[preset])

        const presets: Record<string, ChartConfig[]> = {
            single: [
                { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 12, h: 8, minW: 6, minH: 4 }
            ],
            '2x2': [
                { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
                { i: '2', symbol: symbols[1] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 6, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
                { i: '3', symbol: symbols[2] || 'SQURPHARMA', timeframe: 'D', chartType: 'line', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
                { i: '4', symbol: symbols[3] || 'BATBC', timeframe: 'D', chartType: 'candlestick', x: 6, y: 4, w: 6, h: 4, minW: 3, minH: 3 }
            ],
            '2x3': [
                { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
                { i: '2', symbol: symbols[1] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
                { i: '3', symbol: symbols[2] || 'SQURPHARMA', timeframe: 'D', chartType: 'candlestick', x: 8, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
                { i: '4', symbol: symbols[3] || 'BATBC', timeframe: 'D', chartType: 'line', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
                { i: '5', symbol: symbols[4] || 'GP', timeframe: 'D', chartType: 'line', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
                { i: '6', symbol: symbols[5] || 'BRACBANK', timeframe: 'D', chartType: 'line', x: 8, y: 4, w: 4, h: 4, minW: 3, minH: 3 }
            ],
            '3x3': [
                { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '2', symbol: symbols[1] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '3', symbol: symbols[2] || 'SQURPHARMA', timeframe: 'D', chartType: 'candlestick', x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '4', symbol: symbols[3] || 'BATBC', timeframe: 'D', chartType: 'candlestick', x: 0, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '5', symbol: symbols[4] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 4, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '6', symbol: symbols[5] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 8, y: 3, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '7', symbol: symbols[6] || 'SQURPHARMA', timeframe: 'D', chartType: 'line', x: 0, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '8', symbol: symbols[7] || 'BATBC', timeframe: 'D', chartType: 'line', x: 4, y: 6, w: 4, h: 3, minW: 3, minH: 2 },
                { i: '9', symbol: symbols[8] || 'GP', timeframe: 'D', chartType: 'line', x: 8, y: 6, w: 4, h: 3, minW: 3, minH: 2 }
            ],
            '3x4': [
                { i: '1', symbol: symbols[0] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '2', symbol: symbols[1] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '3', symbol: symbols[2] || 'SQURPHARMA', timeframe: 'D', chartType: 'candlestick', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '4', symbol: symbols[3] || 'BATBC', timeframe: 'D', chartType: 'candlestick', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '5', symbol: symbols[4] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '6', symbol: symbols[5] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 3, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '7', symbol: symbols[6] || 'SQURPHARMA', timeframe: 'D', chartType: 'candlestick', x: 6, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '8', symbol: symbols[7] || 'BATBC', timeframe: 'D', chartType: 'candlestick', x: 9, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '9', symbol: symbols[8] || 'GP', timeframe: 'D', chartType: 'candlestick', x: 0, y: 6, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '10', symbol: symbols[9] || 'BRACBANK', timeframe: 'D', chartType: 'candlestick', x: 3, y: 6, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '11', symbol: symbols[10] || 'SQURPHARMA', timeframe: 'D', chartType: 'line', x: 6, y: 6, w: 3, h: 3, minW: 2, minH: 2 },
                { i: '12', symbol: symbols[11] || 'BATBC', timeframe: 'D', chartType: 'line', x: 9, y: 6, w: 3, h: 3, minW: 2, minH: 2 }
            ]
        }
        saveLayout(presets[preset])
    }, [saveLayout])

    // Clear all
    const clearAll = useCallback(() => {
        saveLayout([])
    }, [saveLayout])

    return {
        charts,
        handleLayoutChange,
        addChart,
        removeChart,
        updateChart,
        applyPreset,
        clearAll
    }
}
