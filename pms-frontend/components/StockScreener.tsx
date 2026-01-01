import { useState } from "react";
import { useWatchlist } from "../hooks/useWatchlist";
import { useScreenerFilters } from "../hooks/useScreenerFilters";
import { useScreenerSort } from "../hooks/useScreenerSort";
import { useStockScreener } from "../hooks/useStockScreener";
import { AddToWatchlistDialog } from "./AddToWatchlistDialog";
import { ScreenerActionButtons } from "./stock-screener/ScreenerActionButtons";
import { ScreenerFiltersPanel } from "./stock-screener/ScreenerFiltersPanel";
import { ScreenerSearchBar } from "./stock-screener/ScreenerSearchBar";
import { ScreenerResultsTable } from "./stock-screener/ScreenerResultsTable";
import { MarketService } from "../src/client";
import { toast } from "sonner";

interface StockScreenerProps {
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
}

export function StockScreener({ onQuickTrade, onChartStock, onAddToWatchlist }: StockScreenerProps) {
  // Custom hooks for state management
  const { filters, activeFilters, updateFilter, clearFilters } = useScreenerFilters();
  const { searchTerm, setSearchTerm, sortBy, setSortBy, sortOrder } = useScreenerSort();
  const {
    screenerResults,
    totalResults,
    isLoading,
    isFetching,
    isError,
    isEmptyState,
    isQueryDisabled,
    refetch,
  } = useStockScreener(filters, searchTerm, sortBy, sortOrder);

  const { watchlists, addStockToWatchlist, createWatchlist } = useWatchlist();

  // Local state for watchlist dialog
  const [addToWatchlistDialogOpen, setAddToWatchlistDialogOpen] = useState(false);
  const [selectedStockForWatchlist, setSelectedStockForWatchlist] = useState<{ symbol: string; companyName: string } | null>(null);

  // Handle adding stock to watchlist using dialog
  const handleAddToWatchlistClick = (symbol: string, companyName: string) => {
    setSelectedStockForWatchlist({ symbol, companyName });
    setAddToWatchlistDialogOpen(true);
  };

  const handleAddStockToWatchlist = async (watchlistId: string, notes?: string) => {
    if (!selectedStockForWatchlist) return;

    try {
      // Find stock ID from the symbol
      const stocks = (await MarketService.listStocks({ q: selectedStockForWatchlist.symbol, limit: 1 })) as any[];
      const stockId = stocks?.[0]?.id;

      if (!stockId) {
        toast.error(`Stock ${selectedStockForWatchlist.symbol} not found`);
        return;
      }

      const success = await addStockToWatchlist(watchlistId, stockId, notes);
      if (success) {
        toast.success(`Added ${selectedStockForWatchlist.symbol} to watchlist`);
      } else {
        toast.error('Failed to add stock to watchlist');
      }
    } catch (error) {
      toast.error('Error adding stock to watchlist');
    }
  };

  const handleCreateWatchlist = async (name: string, description?: string) => {
    const result = await createWatchlist({
      name,
      description,
      is_default: false,
    });

    if (result) {
      toast.success(`Watchlist "${name}" created`);
      return result.id;
    }

    toast.error('Failed to create watchlist');
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <ScreenerActionButtons
        onRefresh={refetch}
        isRefreshing={isFetching}
        isDisabled={isQueryDisabled}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <ScreenerFiltersPanel
            filters={filters}
            activeFilters={activeFilters}
            onUpdateFilter={updateFilter}
            onClearFilters={clearFilters}
          />
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          <ScreenerSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <ScreenerResultsTable
            results={screenerResults}
            totalResults={totalResults}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            isEmptyState={isEmptyState}
            isQueryDisabled={isQueryDisabled}
            onChartStock={onChartStock}
            // todo need to replace this with the add to my portfolio modal
            onQuickTrade={onQuickTrade}
            onAddToWatchlist={handleAddToWatchlistClick}
          />
        </div>
      </div>

      {/* Add to Watchlist Dialog */}
      {selectedStockForWatchlist && (
        <AddToWatchlistDialog
          open={addToWatchlistDialogOpen}
          onOpenChange={setAddToWatchlistDialogOpen}
          symbol={selectedStockForWatchlist.symbol}
          companyName={selectedStockForWatchlist.companyName}
          watchlists={watchlists}
          onAdd={handleAddStockToWatchlist}
          onCreateWatchlist={handleCreateWatchlist}
        />
      )}
    </div>
  );
}