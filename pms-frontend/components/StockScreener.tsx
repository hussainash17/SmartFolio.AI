import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ShoppingCart,
  Star,
  RefreshCw,
  Download,
  Bookmark
} from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";
import { AddToWatchlistDialog } from "./AddToWatchlistDialog";
import { MarketService, OpenAPI, ResearchService } from "../src/client";
import type { ResearchStockScreenerData, ResearchStockScreenerResponse } from "../src/client";
import { toast } from "sonner";

interface StockScreenerProps {
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
}

interface ScreenerFilters {
  // Basic filters
  sector: string;
  industry: string;
  marketCap: [number, number];
  
  // Fundamental filters
  peRatio: [number, number];
  priceToBook: [number, number];
  debtToEquity: [number, number];
  returnOnEquity: [number, number];
  revenueGrowth: [number, number];
  earningsGrowth: [number, number];
  dividendYield: [number, number];
  
  // Technical filters
  priceRange: [number, number];
  volume: [number, number];
  rsi: [number, number];
  movingAverage: string;
  priceChange: [number, number];
  
  // Additional filters
  country: string;
  exchange: string;
}

interface ScreenerResult {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  peRatio: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

const createDefaultFilters = (): ScreenerFilters => ({
  sector: 'all',
  industry: 'all',
  marketCap: [0, 1000000],
  peRatio: [0, 100],
  priceToBook: [0, 10],
  debtToEquity: [0, 200],
  returnOnEquity: [0, 100],
  revenueGrowth: [-50, 100],
  earningsGrowth: [-100, 200],
  dividendYield: [0, 10],
  priceRange: [0, 1000],
  volume: [0, 100000000],
  rsi: [0, 100],
  movingAverage: 'all',
  priceChange: [-20, 20],
  country: 'all',
  exchange: 'all',
});

const isRangeEqual = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

const calculateActiveFilters = (current: ScreenerFilters): number => {
  const defaults = createDefaultFilters();
  let count = 0;

  if (current.sector !== defaults.sector) count++;
  if (current.industry !== defaults.industry) count++;
  if (!isRangeEqual(current.marketCap, defaults.marketCap)) count++;
  if (!isRangeEqual(current.peRatio, defaults.peRatio)) count++;
  if (!isRangeEqual(current.priceToBook, defaults.priceToBook)) count++;
  if (!isRangeEqual(current.debtToEquity, defaults.debtToEquity)) count++;
  if (!isRangeEqual(current.returnOnEquity, defaults.returnOnEquity)) count++;
  if (!isRangeEqual(current.revenueGrowth, defaults.revenueGrowth)) count++;
  if (!isRangeEqual(current.earningsGrowth, defaults.earningsGrowth)) count++;
  if (!isRangeEqual(current.dividendYield, defaults.dividendYield)) count++;
  if (!isRangeEqual(current.priceRange, defaults.priceRange)) count++;
  if (!isRangeEqual(current.volume, defaults.volume)) count++;
  if (!isRangeEqual(current.rsi, defaults.rsi)) count++;
  if (current.movingAverage !== defaults.movingAverage) count++;
  if (!isRangeEqual(current.priceChange, defaults.priceChange)) count++;
  if (current.country !== defaults.country) count++;
  if (current.exchange !== defaults.exchange) count++;

  return count;
};

export function StockScreener({ onQuickTrade, onChartStock, onAddToWatchlist }: StockScreenerProps) {
  const [filters, setFilters] = useState<ScreenerFilters>(() => createDefaultFilters());

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Watchlist dialog state
  const [addToWatchlistDialogOpen, setAddToWatchlistDialogOpen] = useState(false);
  const [selectedStockForWatchlist, setSelectedStockForWatchlist] = useState<{ symbol: string; companyName: string } | null>(null);
  
  // Use watchlist hook
  const {
    watchlists,
    addStockToWatchlist,
    createWatchlist,
  } = useWatchlist();
  const [activeFilters, setActiveFilters] = useState(0);

  const defaultFilterSnapshot = useMemo(() => createDefaultFilters(), []);
  const PAGE_SIZE = 20;

  const queryVariables = useMemo<ResearchStockScreenerData>(() => {
    const payload: ResearchStockScreenerData = {
      limit: PAGE_SIZE,
    };

    const defaults = defaultFilterSnapshot;

    const [minMarketCap, maxMarketCap] = filters.marketCap;
    if (minMarketCap > defaults.marketCap[0]) payload.minMarketCap = minMarketCap;
    if (maxMarketCap < defaults.marketCap[1]) payload.maxMarketCap = maxMarketCap;

    const [minPe, maxPe] = filters.peRatio;
    if (minPe > defaults.peRatio[0]) payload.minPeRatio = minPe;
    if (maxPe < defaults.peRatio[1]) payload.maxPeRatio = maxPe;

    const [minPtb, maxPtb] = filters.priceToBook;
    if (minPtb > defaults.priceToBook[0]) payload.minPriceToBook = minPtb;
    if (maxPtb < defaults.priceToBook[1]) payload.maxPriceToBook = maxPtb;

    const [minDividend, maxDividend] = filters.dividendYield;
    if (minDividend > defaults.dividendYield[0]) payload.minDividendYield = minDividend;
    if (maxDividend < defaults.dividendYield[1]) payload.maxDividendYield = maxDividend;

    const [minPriceValue, maxPriceValue] = filters.priceRange;
    if (minPriceValue > defaults.priceRange[0]) payload.minPrice = minPriceValue;
    if (maxPriceValue < defaults.priceRange[1]) payload.maxPrice = maxPriceValue;

    if (filters.volume[0] > defaults.volume[0]) {
      payload.minVolume = filters.volume[0];
    }

    const [minRsi, maxRsi] = filters.rsi;
    if (minRsi > defaults.rsi[0]) payload.minRsi = minRsi;
    if (maxRsi < defaults.rsi[1]) payload.maxRsi = maxRsi;

    const [minPriceChange, maxPriceChange] = filters.priceChange;
    if (minPriceChange > defaults.priceChange[0]) payload.minPriceChange = minPriceChange;
    if (maxPriceChange < defaults.priceChange[1]) payload.maxPriceChange = maxPriceChange;

    if (filters.sector !== 'all') payload.sector = filters.sector;
    if (filters.industry !== 'all') payload.industry = filters.industry;
    if (filters.movingAverage !== 'all') payload.movingAverage = filters.movingAverage;

    return payload;
  }, [defaultFilterSnapshot, filters]);

  const isAuthenticated = Boolean((OpenAPI as any).TOKEN);
  const isQueryDisabled = !isAuthenticated;

  const {
    data: screenerData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery<ResearchStockScreenerResponse>({
    queryKey: ['stock-screener', queryVariables],
    queryFn: async () => {
      const response = await ResearchService.stockScreener(queryVariables);
      return response as ResearchStockScreenerResponse;
    },
    enabled: !isQueryDisabled,
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const getSortValue = useCallback((item: ScreenerResult) => {
    switch (sortBy) {
      case 'marketCap':
        return item.marketCap ?? null;
      case 'price':
        return item.price ?? null;
      case 'changePercent':
        return item.changePercent ?? null;
      case 'volume':
        return item.volume ?? null;
      case 'peRatio':
        return item.peRatio ?? null;
      case 'dividendYield':
        return item.dividendYield ?? null;
      case 'rsi':
        return item.rsi ?? null;
      default:
        return null;
    }
  }, [sortBy]);

  const screenerResults = useMemo<ScreenerResult[]>(() => {
    const stocks = screenerData?.stocks ?? [];

    const mapped: ScreenerResult[] = stocks.map((stock) => ({
      symbol: stock.symbol,
      companyName: stock.name ?? stock.symbol,
      sector: stock.sector ?? null,
      industry: stock.industry ?? null,
      marketCap: stock.market_cap ?? null,
      price: stock.current_price ?? null,
      change: stock.change ?? null,
      changePercent: stock.change_percent ?? null,
      volume: stock.volume ?? null,
      peRatio: stock.pe_ratio ?? null,
      priceToBook: stock.pb_ratio ?? null,
      dividendYield: stock.dividend_yield ?? null,
      rsi: stock.rsi ?? null,
      sma20: stock.sma_20 ?? null,
      sma50: stock.sma_50 ?? null,
      rating: (stock.rating as ScreenerResult['rating']) ?? 'Hold',
    }));

    const trimmedSearch = searchTerm.trim().toLowerCase();
    const filtered = trimmedSearch
      ? mapped.filter((item) =>
          item.symbol.toLowerCase().includes(trimmedSearch) ||
          item.companyName.toLowerCase().includes(trimmedSearch)
        )
      : mapped;

    const sorted = [...filtered].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      const fallback = sortOrder === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const aNumber = aValue ?? fallback;
      const bNumber = bValue ?? fallback;

      if (aNumber === bNumber) {
        return a.symbol.localeCompare(b.symbol);
      }

      return sortOrder === 'asc' ? aNumber - bNumber : bNumber - aNumber;
    });

    return sorted;
  }, [getSortValue, screenerData, searchTerm, sortOrder]);

  const totalResults = screenerData?.total_results ?? screenerResults.length;
  const isEmptyState = !isQueryDisabled && !isLoading && !isFetching && !isError && screenerResults.length === 0;

  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Discretionary',
    'Communication Services', 'Industrials', 'Consumer Staples', 'Energy',
    'Utilities', 'Real Estate', 'Materials'
  ];

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

  const formatCurrency = (amount?: number | null) => {
    if (amount === null || amount === undefined || Number.isNaN(amount)) {
      return '-';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num?: number | null) => {
    if (num === null || num === undefined || Number.isNaN(num)) {
      return '-';
    }
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (percent?: number | null) => {
    if (percent === null || percent === undefined || Number.isNaN(percent)) {
      return '-';
    }
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatMarketCap = (marketCap?: number | null) => {
    if (marketCap === null || marketCap === undefined || Number.isNaN(marketCap) || marketCap === 0) {
      return 'N/A';
    }
    // Market cap is already in crores, format with Cr suffix
    return `৳${marketCap.toFixed(2)} Cr`;
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Strong Buy': return 'text-green-700 bg-green-100 border-green-200';
      case 'Buy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Hold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Sell': return 'text-red-600 bg-red-50 border-red-200';
      case 'Strong Sell': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const updateFilter = useCallback(<K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      setActiveFilters(calculateActiveFilters(next));
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    const reset = createDefaultFilters();
    setFilters(reset);
    setActiveFilters(0);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex gap-2">
          <Button variant="outline">
            <Bookmark className="h-4 w-4 mr-2" />
            Save Screen
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button onClick={() => refetch()} disabled={isFetching || isQueryDisabled}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filters</CardTitle>
                <div className="flex items-center gap-2">
                  {activeFilters > 0 && (
                    <Badge variant="secondary">{activeFilters}</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="fundamental" className="space-y-4">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="fundamental">Fundamental</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                </TabsList>

                <TabsContent value="fundamental" className="space-y-4">
                  {/* Sector Filter */}
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={filters.sector} onValueChange={(value) => updateFilter('sector', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sectors</SelectItem>
                        {sectors.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Market Cap */}
                  <div className="space-y-2">
                    <Label>Market Cap (Cr)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.marketCap}
                        onValueChange={(value) => updateFilter('marketCap', value)}
                        max={1000000}
                        step={1000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>৳{formatNumber(filters.marketCap[0] / 10)} Cr</span>
                        <span>৳{formatNumber(filters.marketCap[1] / 10)} Cr</span>
                      </div>
                    </div>
                  </div>

                  {/* P/E Ratio */}
                  <div className="space-y-2">
                    <Label>P/E Ratio</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.peRatio}
                        onValueChange={(value) => updateFilter('peRatio', value)}
                        max={100}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.peRatio[0]}</span>
                        <span>{filters.peRatio[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dividend Yield */}
                  <div className="space-y-2">
                    <Label>Dividend Yield (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.dividendYield}
                        onValueChange={(value) => updateFilter('dividendYield', value)}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.dividendYield[0]}%</span>
                        <span>{filters.dividendYield[1]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Growth */}
                  <div className="space-y-2">
                    <Label>Revenue Growth (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.revenueGrowth}
                        onValueChange={(value) => updateFilter('revenueGrowth', value)}
                        min={-50}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.revenueGrowth[0]}%</span>
                        <span>{filters.revenueGrowth[1]}%</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="technical" className="space-y-4">
                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range ($)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => updateFilter('priceRange', value)}
                        max={1000}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${filters.priceRange[0]}</span>
                        <span>${filters.priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* RSI */}
                  <div className="space-y-2">
                    <Label>RSI</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.rsi}
                        onValueChange={(value) => updateFilter('rsi', value)}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.rsi[0]}</span>
                        <span>{filters.rsi[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Change */}
                  <div className="space-y-2">
                    <Label>Price Change (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.priceChange}
                        onValueChange={(value) => updateFilter('priceChange', value)}
                        min={-20}
                        max={20}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.priceChange[0]}%</span>
                        <span>{filters.priceChange[1]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Moving Average */}
                  <div className="space-y-2">
                    <Label>Moving Average Position</Label>
                    <Select value={filters.movingAverage} onValueChange={(value) => updateFilter('movingAverage', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="above_20">Above 20-day MA</SelectItem>
                        <SelectItem value="above_50">Above 50-day MA</SelectItem>
                        <SelectItem value="below_20">Below 20-day MA</SelectItem>
                        <SelectItem value="below_50">Below 50-day MA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Sort */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by symbol or company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketCap">Market Cap</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="changePercent">Change %</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="peRatio">P/E Ratio</SelectItem>
                      <SelectItem value="dividendYield">Dividend Yield</SelectItem>
                      <SelectItem value="rsi">RSI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Screening Results</CardTitle>
                <Badge variant="secondary">
                  {isQueryDisabled ? 'Sign in required' : isFetching ? 'Updating…' : `${totalResults} stocks found`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Market Cap</TableHead>
                      <TableHead className="text-right">P/E</TableHead>
                      <TableHead className="text-right">Div Yield</TableHead>
                      <TableHead className="text-right">RSI</TableHead>
                      <TableHead className="text-right">20D MA</TableHead>
                      <TableHead className="text-right">50D MA</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isQueryDisabled ? (
                      <TableRow>
                        <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                          Sign in to run the stock screener and view results.
                        </TableCell>
                      </TableRow>
                    ) : isLoading || isFetching ? (
                      <TableRow>
                        <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                          Loading screener data...
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell colSpan={13} className="py-8 text-center text-sm text-destructive">
                          Unable to load screening results. Please try refreshing.
                        </TableCell>
                      </TableRow>
                    ) : isEmptyState ? (
                      <TableRow>
                        <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                          No stocks match the selected filters. Adjust your filters or clear them to see more results.
                        </TableCell>
                      </TableRow>
                    ) : (
                      screenerResults.map((stock) => {
                        const hasChange = stock.changePercent !== null && stock.changePercent !== undefined;
                        const isGain = (stock.changePercent ?? 0) >= 0;
                        return (
                          <TableRow key={stock.symbol} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="font-medium">{stock.symbol}</div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-48 truncate font-medium">{stock.companyName}</div>
                              {stock.industry && (
                                <div className="text-xs text-muted-foreground truncate max-w-48">{stock.industry}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {stock.sector ? (
                                <Badge variant="outline" className="text-xs">
                                  {stock.sector}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(stock.price)}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasChange ? (
                                <div className="flex items-center justify-end gap-1">
                                  {isGain ? (
                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                  )}
                                  <span className={isGain ? 'text-green-600' : 'text-red-600'}>
                                    {formatPercent(stock.changePercent)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMarketCap(stock.marketCap)}
                            </TableCell>
                            <TableCell className="text-right">
                              {stock.peRatio !== null && stock.peRatio !== undefined ? stock.peRatio.toFixed(1) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {stock.dividendYield !== null && stock.dividendYield !== undefined ? `${stock.dividendYield.toFixed(2)}%` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {stock.rsi !== null && stock.rsi !== undefined ? stock.rsi.toFixed(0) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stock.sma20)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(stock.sma50)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getRatingColor(stock.rating)}>
                                {stock.rating}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onChartStock(stock.symbol)}
                                  className="h-8 w-8 p-0"
                                >
                                  <BarChart3 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onQuickTrade(stock.symbol)}
                                  className="h-8 w-8 p-0"
                                >
                                  <ShoppingCart className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddToWatchlistClick(stock.symbol, stock.companyName)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Star className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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