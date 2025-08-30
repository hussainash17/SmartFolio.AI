import { useState, useEffect } from 'react';
import { WatchlistService, type WatchlistPublic, type WatchlistCreate, type WatchlistUpdate, type WatchlistItemPublic, type WatchlistItemCreate } from '../src/client';
import { useAuth } from './useAuth';

export interface WatchlistItemWithStock {
  id: string;
  added_at: string;
  notes: string | null;
  stock: {
    id: string;
    symbol: string;
    company_name: string;
    sector: string;
    industry: string;
  };
}

export interface StockSearchResult {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
}

export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  const [watchlists, setWatchlists] = useState<WatchlistPublic[]>([]);
  const [currentWatchlist, setCurrentWatchlist] = useState<WatchlistPublic | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItemWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user watchlists
  const loadWatchlists = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await WatchlistService.getUserWatchlists();
      setWatchlists(response);
      
      // Set default watchlist as current if none selected
      if (!currentWatchlist && response.length > 0) {
        const defaultWatchlist = response.find(w => w.is_default) || response[0];
        setCurrentWatchlist(defaultWatchlist);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlists');
    } finally {
      setIsLoading(false);
    }
  };

  // Load watchlist items with stock details
  const loadWatchlistItems = async (watchlistId: string) => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await WatchlistService.getWatchlistItemsWithDetails({
        watchlistId
      });
      setWatchlistItems(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist items');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new watchlist
  const createWatchlist = async (data: WatchlistCreate): Promise<WatchlistPublic | null> => {
    if (!isAuthenticated) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      const newWatchlist = await WatchlistService.createWatchlist({
        requestBody: data
      });
      await loadWatchlists(); // Refresh the list
      return newWatchlist;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create watchlist');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Update watchlist
  const updateWatchlist = async (watchlistId: string, data: WatchlistUpdate): Promise<WatchlistPublic | null> => {
    if (!isAuthenticated) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      const updatedWatchlist = await WatchlistService.updateWatchlist({
        watchlistId,
        requestBody: data
      });
      await loadWatchlists(); // Refresh the list
      return updatedWatchlist;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update watchlist');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete watchlist
  const deleteWatchlist = async (watchlistId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      await WatchlistService.deleteWatchlist({ watchlistId });
      await loadWatchlists(); // Refresh the list
      
      // If deleted watchlist was current, switch to another
      if (currentWatchlist?.id === watchlistId) {
        const remaining = watchlists.filter(w => w.id !== watchlistId);
        setCurrentWatchlist(remaining.length > 0 ? remaining[0] : null);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete watchlist');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add stock to watchlist
  const addStockToWatchlist = async (watchlistId: string, stockId: string, notes?: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      await WatchlistService.addWatchlistItem({
        watchlistId,
        requestBody: { stock_id: stockId, notes }
      });
      
      // Refresh items if this is the current watchlist
      if (currentWatchlist?.id === watchlistId) {
        await loadWatchlistItems(watchlistId);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock to watchlist');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove stock from watchlist
  const removeStockFromWatchlist = async (watchlistId: string, itemId: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      await WatchlistService.removeWatchlistItem({
        watchlistId,
        itemId
      });
      
      // Refresh items if this is the current watchlist
      if (currentWatchlist?.id === watchlistId) {
        await loadWatchlistItems(watchlistId);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stock from watchlist');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Update watchlist item notes
  const updateWatchlistItemNotes = async (watchlistId: string, itemId: string, notes: string): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    try {
      setIsLoading(true);
      setError(null);
      await WatchlistService.updateWatchlistItem({
        watchlistId,
        itemId,
        notes
      });
      
      // Refresh items if this is the current watchlist
      if (currentWatchlist?.id === watchlistId) {
        await loadWatchlistItems(watchlistId);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Search stocks
  const searchStocks = async (query: string, limit: number = 10): Promise<StockSearchResult[]> => {
    if (!isAuthenticated || query.length < 2) return [];
    
    try {
      const results = await WatchlistService.searchStocks({
        query,
        limit
      });
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search stocks');
      return [];
    }
  };

  // Add multiple stocks by symbols
  const addMultipleStocksBySymbols = async (watchlistId: string, symbols: string[]): Promise<{ added: number; skipped: string[] } | null> => {
    if (!isAuthenticated) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await WatchlistService.addMultipleBySymbols({
        watchlistId,
        requestBody: { symbols }
      });
      
      // Refresh items if this is the current watchlist
      if (currentWatchlist?.id === watchlistId) {
        await loadWatchlistItems(watchlistId);
      }
      
      return {
        added: response.added_count,
        skipped: response.skipped
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add multiple stocks');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load watchlists on auth change
  useEffect(() => {
    if (isAuthenticated) {
      loadWatchlists();
    } else {
      setWatchlists([]);
      setCurrentWatchlist(null);
      setWatchlistItems([]);
    }
  }, [isAuthenticated]);

  // Load watchlist items when current watchlist changes
  useEffect(() => {
    if (currentWatchlist) {
      loadWatchlistItems(currentWatchlist.id);
    } else {
      setWatchlistItems([]);
    }
  }, [currentWatchlist]);

  const clearError = () => setError(null);

  return {
    // State
    watchlists,
    currentWatchlist,
    watchlistItems,
    isLoading,
    error,
    
    // Actions
    loadWatchlists,
    loadWatchlistItems,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    addStockToWatchlist,
    removeStockFromWatchlist,
    updateWatchlistItemNotes,
    searchStocks,
    addMultipleStocksBySymbols,
    setCurrentWatchlist,
    clearError
  };
}
