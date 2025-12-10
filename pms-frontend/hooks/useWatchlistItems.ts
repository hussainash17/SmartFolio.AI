import { useState, useEffect, useCallback } from 'react'
import { WatchlistService, MarketService } from '../src/client'
import type { WatchlistItemPublic } from '../src/client'

interface WatchlistSymbol {
    symbol: string
    stock_id: string
    item_id: string
    last_trade_price?: number
    change?: number
    change_percent?: number
    volume?: number
    notes?: string | null
    added_at: string
}

interface StockSearchResult {
    stock_id: string
    symbol: string
    company_name?: string
}

interface UseWatchlistItemsReturn {
    items: WatchlistSymbol[]
    loading: boolean
    error: string | null
    addStock: (stockId: string, notes?: string) => Promise<void>
    addSymbols: (symbols: string[]) => Promise<void>
    removeItem: (itemId: string) => Promise<void>
    searchStocks: (query: string) => Promise<StockSearchResult[]>
    refreshItems: () => Promise<void>
}

export function useWatchlistItems(watchlistId: string | null): UseWatchlistItemsReturn {
    const [items, setItems] = useState<WatchlistSymbol[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load watchlist items and enrich with market data
    const loadItems = useCallback(async () => {
        if (!watchlistId) {
            setItems([])
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Try to use the detailed endpoint first
            try {
                const detailedData = await WatchlistService.getWatchlistItemsWithDetails({
                    watchlistId
                }) as any

                if (Array.isArray(detailedData)) {
                    // Map the detailed response
                    const enrichedItems: WatchlistSymbol[] = detailedData.map((item: any) => ({
                        symbol: item.symbol || item.stock?.symbol || item.stock?.trading_code || '',
                        stock_id: item.stock_id || item.stock?.id || '',
                        item_id: item.id,
                        last_trade_price: item.last_trade_price ?? item.stock?.last_trade_price,
                        change: item.change ?? item.stock?.change,
                        change_percent: item.change_percent ?? item.stock?.change_percent,
                        volume: item.volume ?? item.stock?.volume,
                        notes: item.notes,
                        added_at: item.added_at
                    }))
                    setItems(enrichedItems)
                    return
                }
            } catch (detailError) {
                console.log('Detailed endpoint not available, falling back to basic items')
            }

            // Fallback: Load basic items and enrich manually
            const basicItems = await WatchlistService.getWatchlistItems({ watchlistId })

            if (!Array.isArray(basicItems) || basicItems.length === 0) {
                setItems([])
                return
            }

            // Get symbols for each stock_id by fetching stock data
            const enrichedItems = await Promise.all(
                basicItems.map(async (item) => {
                    try {
                        // Try to get symbol from stock_id (assuming stock_id might be the symbol)
                        const stockData = await MarketService.getStock({
                            symbol: item.stock_id
                        }) as any

                        return {
                            symbol: item.stock_id, // Use stock_id as symbol fallback
                            stock_id: item.stock_id,
                            item_id: item.id,
                            last_trade_price: stockData?.data?.last_trade_price ?? stockData?.last_trade_price,
                            change: stockData?.data?.change ?? stockData?.change,
                            change_percent: stockData?.data?.change_percent ?? stockData?.change_percent,
                            volume: stockData?.data?.volume ?? stockData?.volume,
                            notes: item.notes,
                            added_at: item.added_at
                        }
                    } catch {
                        // If fetching market data fails, return basic info
                        return {
                            symbol: item.stock_id,
                            stock_id: item.stock_id,
                            item_id: item.id,
                            notes: item.notes,
                            added_at: item.added_at
                        }
                    }
                })
            )

            setItems(enrichedItems)
        } catch (err) {
            console.error('Error loading watchlist items:', err)
            setError('Failed to load watchlist items')
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [watchlistId])

    // Load items when watchlist changes
    useEffect(() => {
        loadItems()
    }, [loadItems])

    // Add a single stock to the watchlist
    const addStock = useCallback(async (stockId: string, notes?: string): Promise<void> => {
        if (!watchlistId) {
            throw new Error('No watchlist selected')
        }

        try {
            await WatchlistService.addWatchlistItem({
                watchlistId,
                requestBody: {
                    stock_id: stockId,
                    notes: notes || null
                }
            })
            await loadItems()
        } catch (err) {
            console.error('Error adding stock:', err)
            throw new Error('Failed to add stock')
        }
    }, [watchlistId, loadItems])

    // Add multiple stocks by symbol
    const addSymbols = useCallback(async (symbols: string[]): Promise<void> => {
        if (!watchlistId) {
            throw new Error('No watchlist selected')
        }

        if (symbols.length === 0) {
            return
        }

        try {
            await WatchlistService.addMultipleBySymbols({
                watchlistId,
                requestBody: { symbols }
            })
            await loadItems()
        } catch (err) {
            console.error('Error adding symbols:', err)
            throw new Error('Failed to add symbols')
        }
    }, [watchlistId, loadItems])

    // Remove an item from the watchlist
    const removeItem = useCallback(async (itemId: string): Promise<void> => {
        if (!watchlistId) {
            throw new Error('No watchlist selected')
        }

        try {
            await WatchlistService.removeWatchlistItem({
                watchlistId,
                itemId
            })
            await loadItems()
        } catch (err) {
            console.error('Error removing item:', err)
            throw new Error('Failed to remove item')
        }
    }, [watchlistId, loadItems])

    // Search for stocks
    const searchStocks = useCallback(async (query: string): Promise<StockSearchResult[]> => {
        if (!query || query.trim().length < 2) {
            return []
        }

        try {
            const results = await WatchlistService.searchStocks({
                query: query.trim(),
                limit: 20
            }) as any

            if (Array.isArray(results)) {
                return results.map((stock: any) => ({
                    stock_id: stock.stock_id || stock.id || stock.symbol,
                    symbol: stock.symbol || stock.trading_code,
                    company_name: stock.company_name || stock.name
                }))
            }

            return []
        } catch (err) {
            console.error('Error searching stocks:', err)
            return []
        }
    }, [])

    return {
        items,
        loading,
        error,
        addStock,
        addSymbols,
        removeItem,
        searchStocks,
        refreshItems: loadItems
    }
}
