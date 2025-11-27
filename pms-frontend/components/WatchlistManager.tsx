import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Plus,
  Search,
  Star,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  BarChart3,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";
import type { WatchlistPublic } from "../src/client";
import { MarketService } from "../src/client";
import { formatCurrency, formatPercent } from "../lib/utils";

interface WatchlistManagerProps {
  onQuickTrade?: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock?: (symbol: string) => void;
}

export function WatchlistManager({ onQuickTrade, onChartStock }: WatchlistManagerProps) {
  const {
    watchlists,
    currentWatchlist,
    watchlistItems,
    isLoading,
    error,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    addStockToWatchlist,
    removeStockFromWatchlist,
    updateWatchlistItemNotes,
    searchStocks,
    setCurrentWatchlist,
    clearError,
  } = useWatchlist();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<WatchlistPublic | null>(null);
  
  // Form states
  const [watchlistName, setWatchlistName] = useState("");
  const [watchlistDesc, setWatchlistDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Local state for notes to prevent refresh on every keystroke
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Search for stocks
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchStocks(searchQuery, 10);
          setSearchResults(results);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateWatchlist = async () => {
    if (!watchlistName.trim()) return;
    const result = await createWatchlist({
      name: watchlistName,
      description: watchlistDesc || undefined,
      is_default: watchlists.length === 0,
    });
    
    if (result) {
      setWatchlistName("");
      setWatchlistDesc("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleUpdateWatchlist = async () => {
    if (!editingWatchlist || !watchlistName.trim()) return;
    const result = await updateWatchlist(editingWatchlist.id, {
      name: watchlistName,
      description: watchlistDesc || undefined,
    });
    
    if (result) {
      setEditingWatchlist(null);
      setWatchlistName("");
      setWatchlistDesc("");
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteWatchlist = async (watchlistId: string) => {
    if (confirm("Are you sure you want to delete this watchlist?")) {
      await deleteWatchlist(watchlistId);
    }
  };

  const handleSetDefault = async (watchlist: WatchlistPublic) => {
    await updateWatchlist(watchlist.id, { is_default: true });
  };

  const handleDuplicateWatchlist = async (watchlist: WatchlistPublic) => {
    const newWatchlist = await createWatchlist({
      name: `${watchlist.name} (Copy)`,
      description: watchlist.description || undefined,
      is_default: false,
    });
    
    if (newWatchlist && currentWatchlist?.id === watchlist.id) {
      // Copy all items from current watchlist
      for (const item of watchlistItems) {
        await addStockToWatchlist(newWatchlist.id, item.stock.id, item.notes || undefined);
      }
    }
  };

  const openEditDialog = (watchlist: WatchlistPublic) => {
    setEditingWatchlist(watchlist);
    setWatchlistName(watchlist.name);
    setWatchlistDesc(watchlist.description || "");
    setIsEditDialogOpen(true);
  };

  const handleAddStock = async (stockId: string) => {
    if (!currentWatchlist) return;
    const success = await addStockToWatchlist(currentWatchlist.id, stockId);
    if (success) {
      setSearchQuery("");
      setSearchResults([]);
      setIsAddStockDialogOpen(false);
    }
  };

  const handleRemoveStock = async (itemId: string) => {
    if (!currentWatchlist) return;
    await removeStockFromWatchlist(currentWatchlist.id, itemId);
  };

  // Initialize local notes from watchlistItems when they change
  useEffect(() => {
    const notesMap: Record<string, string> = {};
    watchlistItems.forEach((item) => {
      notesMap[item.id] = item.notes || "";
    });
    setLocalNotes(notesMap);
  }, [watchlistItems]);

  const handleUpdateNotes = (itemId: string, notes: string) => {
    // Update local state immediately for responsive UI
    setLocalNotes((prev) => ({
      ...prev,
      [itemId]: notes,
    }));

    // Clear existing timer for this item
    if (debounceTimers.current[itemId]) {
      clearTimeout(debounceTimers.current[itemId]);
    }

    // Set new timer to save after user stops typing (500ms)
    debounceTimers.current[itemId] = setTimeout(async () => {
      if (!currentWatchlist) return;
      await updateWatchlistItemNotes(currentWatchlist.id, itemId, notes);
      // Clean up timer reference
      delete debounceTimers.current[itemId];
    }, 500);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);
  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Watchlists Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">My Watchlists</h2>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Watchlist
          </Button>
        </div>

        {isLoading && watchlists.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ) : watchlists.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No watchlists yet</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Watchlist
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlists.map((watchlist) => (
              <Card
                key={watchlist.id}
                className={`cursor-pointer transition-all ${
                  currentWatchlist?.id === watchlist.id
                    ? "ring-2 ring-primary"
                    : "hover:border-primary"
                }`}
                onClick={() => setCurrentWatchlist(watchlist)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    {watchlist.name}
                    {watchlist.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(watchlist);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!watchlist.is_default && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(watchlist);
                        }}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateWatchlist(watchlist);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWatchlist(watchlist.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {watchlist.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Current Watchlist Details */}
      {currentWatchlist && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {currentWatchlist.name}
                <Badge variant="outline">
                  {watchlistItems.length} {watchlistItems.length === 1 ? "stock" : "stocks"}
                </Badge>
              </CardTitle>
              <Button onClick={() => setIsAddStockDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : watchlistItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No stocks in this watchlist</p>
                <Button onClick={() => setIsAddStockDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Stock
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlistItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.stock.symbol}</TableCell>
                      <TableCell>{item.stock.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.stock.sector}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={localNotes[item.id] ?? item.notes ?? ""}
                          onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                          onBlur={(e) => {
                            // Save immediately on blur if there's a pending timer
                            if (debounceTimers.current[item.id]) {
                              clearTimeout(debounceTimers.current[item.id]);
                              if (currentWatchlist) {
                                updateWatchlistItemNotes(currentWatchlist.id, item.id, e.target.value);
                              }
                              delete debounceTimers.current[item.id];
                            }
                          }}
                          placeholder="Add notes..."
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onChartStock && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onChartStock(item.stock.symbol)}
                              className="h-8 w-8 p-0"
                            >
                              <BarChart3 className="h-3 w-3" />
                            </Button>
                          )}
                          {onQuickTrade && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onQuickTrade(item.stock.symbol)}
                              className="h-8 w-8 p-0"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStock(item.id)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Watchlist Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Watchlist</DialogTitle>
            <DialogDescription>
              Create a new watchlist to organize your stocks
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Watchlist Name</Label>
              <Input
                id="name"
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                placeholder="My Watchlist"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={watchlistDesc}
                onChange={(e) => setWatchlistDesc(e.target.value)}
                placeholder="Description of this watchlist..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWatchlist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Watchlist Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Watchlist</DialogTitle>
            <DialogDescription>
              Update your watchlist details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Watchlist Name</Label>
              <Input
                id="edit-name"
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                placeholder="My Watchlist"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={watchlistDesc}
                onChange={(e) => setWatchlistDesc(e.target.value)}
                placeholder="Description of this watchlist..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateWatchlist}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Stock to {currentWatchlist?.name}</DialogTitle>
            <DialogDescription>
              Search for stocks to add to your watchlist
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="search">Search Stocks</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by symbol or company name..."
                  className="pl-10"
                />
              </div>
            </div>
            
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {searchResults.map((stock) => (
                  <div
                    key={stock.id}
                    className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                    onClick={() => handleAddStock(stock.id)}
                  >
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-sm text-muted-foreground">{stock.company_name}</div>
                    </div>
                    <Badge variant="outline">{stock.sector}</Badge>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No stocks found
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

