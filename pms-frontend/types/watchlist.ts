export interface WatchlistStock {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  current_price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
  market_cap?: number;
}

export interface WatchlistItemWithDetails {
  id: string;
  watchlist_id: string;
  stock_id: string;
  added_at: string;
  notes: string | null;
  stock: WatchlistStock;
}

export interface CreateWatchlistForm {
  name: string;
  description?: string;
  is_default?: boolean;
}

export interface UpdateWatchlistForm {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export interface AddStockForm {
  stock_id: string;
  notes?: string;
}

export interface BulkAddStocksForm {
  symbols: string[];
}

export interface WatchlistFilters {
  sector?: string;
  industry?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  changeRange?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'symbol' | 'name' | 'price' | 'change' | 'volume' | 'added_at';
  sortOrder?: 'asc' | 'desc';
}

export interface WatchlistStats {
  total_items: number;
  sectors: { [key: string]: number };
  industries: { [key: string]: number };
  avg_change: number;
  total_value?: number;
}

export type WatchlistView = 'list' | 'grid' | 'compact';

export interface WatchlistSettings {
  view: WatchlistView;
  showNotes: boolean;
  showSectorInfo: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
}
