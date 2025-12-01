import { useState, useEffect, useCallback } from 'react'
import { WatchlistService } from '../src/client'
import type { WatchlistPublic, WatchlistCreate, WatchlistUpdate } from '../src/client'

interface UseWatchlistsReturn {
    watchlists: WatchlistPublic[]
    selectedWatchlistId: string | null
    loading: boolean
    error: string | null
    selectWatchlist: (id: string) => void
    createWatchlist: (data: WatchlistCreate) => Promise<WatchlistPublic>
    updateWatchlist: (id: string, data: WatchlistUpdate) => Promise<void>
    deleteWatchlist: (id: string) => Promise<void>
    setDefaultWatchlist: (id: string) => Promise<void>
    refreshWatchlists: () => Promise<void>
}

const SELECTED_WATCHLIST_KEY = 'selected_watchlist_id'
const OLD_WATCHLIST_KEY = 'research_watchlist'

export function useWatchlists(): UseWatchlistsReturn {
    const [watchlists, setWatchlists] = useState<WatchlistPublic[]>([])
    const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Load all watchlists from API
    const loadWatchlists = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await WatchlistService.getUserWatchlists()
            setWatchlists(data)

            // Auto-select default watchlist or first watchlist
            if (data.length > 0) {
                const savedId = localStorage.getItem(SELECTED_WATCHLIST_KEY)
                const savedExists = savedId && data.some(w => w.id === savedId)

                if (savedExists) {
                    setSelectedWatchlistId(savedId)
                } else {
                    // Find default watchlist or use first one
                    const defaultWatchlist = data.find(w => w.is_default) || data[0]
                    setSelectedWatchlistId(defaultWatchlist.id)
                    localStorage.setItem(SELECTED_WATCHLIST_KEY, defaultWatchlist.id)
                }
            }
        } catch (err) {
            console.error('Error loading watchlists:', err)
            setError('Failed to load watchlists')
        } finally {
            setLoading(false)
        }
    }, [])

    // Migrate from old localStorage format
    const migrateFromLocalStorage = useCallback(async () => {
        const oldData = localStorage.getItem(OLD_WATCHLIST_KEY)
        if (!oldData || watchlists.length > 0) {
            // Already migrated or no old data
            return
        }

        try {
            const symbols = JSON.parse(oldData) as string[]
            if (!Array.isArray(symbols) || symbols.length === 0) return

            // Create a new watchlist with migrated data
            const newWatchlist = await WatchlistService.createWatchlist({
                requestBody: {
                    name: 'My Watchlist',
                    description: 'Migrated from previous version',
                    is_default: true,
                    is_active: true
                }
            })

            // Add symbols to the new watchlist
            await WatchlistService.addMultipleBySymbols({
                watchlistId: newWatchlist.id,
                requestBody: { symbols }
            })

            // Refresh watchlists
            await loadWatchlists()

            // Clear old localStorage
            localStorage.removeItem(OLD_WATCHLIST_KEY)
        } catch (err) {
            console.error('Error migrating watchlist:', err)
        }
    }, [watchlists.length, loadWatchlists])

    // Load watchlists on mount
    useEffect(() => {
        loadWatchlists()
    }, [loadWatchlists])

    // Migration check after initial load
    useEffect(() => {
        if (!loading && watchlists.length === 0) {
            migrateFromLocalStorage()
        }
    }, [loading, watchlists.length, migrateFromLocalStorage])

    // Select a watchlist
    const selectWatchlist = useCallback((id: string) => {
        setSelectedWatchlistId(id)
        localStorage.setItem(SELECTED_WATCHLIST_KEY, id)
    }, [])

    // Create a new watchlist
    const createWatchlist = useCallback(async (data: WatchlistCreate): Promise<WatchlistPublic> => {
        try {
            const newWatchlist = await WatchlistService.createWatchlist({ requestBody: data })
            await loadWatchlists()

            // Auto-select the newly created watchlist
            selectWatchlist(newWatchlist.id)

            return newWatchlist
        } catch (err) {
            console.error('Error creating watchlist:', err)
            throw new Error('Failed to create watchlist')
        }
    }, [loadWatchlists, selectWatchlist])

    // Update a watchlist
    const updateWatchlist = useCallback(async (id: string, data: WatchlistUpdate): Promise<void> => {
        try {
            await WatchlistService.updateWatchlist({
                watchlistId: id,
                requestBody: data
            })
            await loadWatchlists()
        } catch (err) {
            console.error('Error updating watchlist:', err)
            throw new Error('Failed to update watchlist')
        }
    }, [loadWatchlists])

    // Delete a watchlist
    const deleteWatchlist = useCallback(async (id: string): Promise<void> => {
        try {
            await WatchlistService.deleteWatchlist({ watchlistId: id })

            // If deleted watchlist was selected, select another one
            if (selectedWatchlistId === id) {
                const remaining = watchlists.filter(w => w.id !== id)
                if (remaining.length > 0) {
                    selectWatchlist(remaining[0].id)
                } else {
                    setSelectedWatchlistId(null)
                    localStorage.removeItem(SELECTED_WATCHLIST_KEY)
                }
            }

            await loadWatchlists()
        } catch (err) {
            console.error('Error deleting watchlist:', err)
            throw new Error('Failed to delete watchlist')
        }
    }, [selectedWatchlistId, watchlists, selectWatchlist, loadWatchlists])

    // Set a watchlist as default
    const setDefaultWatchlist = useCallback(async (id: string): Promise<void> => {
        try {
            // First, unset all other defaults
            await Promise.all(
                watchlists
                    .filter(w => w.is_default && w.id !== id)
                    .map(w => WatchlistService.updateWatchlist({
                        watchlistId: w.id,
                        requestBody: { is_default: false }
                    }))
            )

            // Set the selected one as default
            await WatchlistService.updateWatchlist({
                watchlistId: id,
                requestBody: { is_default: true }
            })

            await loadWatchlists()
        } catch (err) {
            console.error('Error setting default watchlist:', err)
            throw new Error('Failed to set default watchlist')
        }
    }, [watchlists, loadWatchlists])

    return {
        watchlists,
        selectedWatchlistId,
        loading,
        error,
        selectWatchlist,
        createWatchlist,
        updateWatchlist,
        deleteWatchlist,
        setDefaultWatchlist,
        refreshWatchlists: loadWatchlists
    }
}
