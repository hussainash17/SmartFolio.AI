import {useEffect, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "./ui/card";
import {Button} from "./ui/button";
import {Input} from "./ui/input";
import {Badge} from "./ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "./ui/table";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./ui/tabs";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "./ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import {Label} from "./ui/label";
import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Plus,
    Search,
    ShoppingCart,
    Star,
    TrendingDown,
    TrendingUp,
    Volume2
} from "lucide-react";
import {MarketData as MarketDataType, NewsItem, Watchlist} from "../types/trading";
import {useQuery} from "@tanstack/react-query";
import {MarketService, OpenAPI} from "../src/client";
import {queryKeys} from "../hooks/queryKeys";
import {useWatchlist} from "../hooks/useWatchlist";
import {AddToWatchlistDialog} from "./AddToWatchlistDialog";
import {toast} from "sonner";
import { formatCurrency, formatPercent } from "../lib/utils";

interface MarketDataProps {
    marketData: MarketDataType[];
    watchlists: Watchlist[];
    news: NewsItem[];
    onAddToWatchlist: (symbol: string) => void;
    onRemoveFromWatchlist: (watchlistId: string, symbol: string) => void;
    onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
    onChartStock: (symbol: string) => void;
    heldSymbols?: Set<string>;
    onUpdateWatchlistNote?: (watchlistId: string, symbol: string, notes: string) => void;
}

export function MarketData({
                               marketData,
                               watchlists,
                               news,
                               onAddToWatchlist,
                               onRemoveFromWatchlist,
                               onQuickTrade,
                               onChartStock,
                               heldSymbols,
                               onUpdateWatchlistNote
                           }: MarketDataProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'volume'>('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | undefined>(
        (watchlists.find(w => w.isDefault)?.id) || (watchlists[0]?.id)
    );
    const [watchlistStocksWithPrices, setWatchlistStocksWithPrices] = useState<MarketDataType[]>([]);

    // Pagination state for All Stocks tab
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Watchlist dialog state
    const [addToWatchlistDialogOpen, setAddToWatchlistDialogOpen] = useState(false);
    const [selectedStockForWatchlist, setSelectedStockForWatchlist] = useState<{
        symbol: string;
        companyName: string
    } | null>(null);
    
    // Create watchlist dialog state
    const [createWatchlistDialogOpen, setCreateWatchlistDialogOpen] = useState(false);
    const [newWatchlistName, setNewWatchlistName] = useState("");
    const [newWatchlistDescription, setNewWatchlistDescription] = useState("");
    const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);

    // Use watchlist hook
    const {
        watchlists: watchlistsFromHook,
        currentWatchlist,
        watchlistItems,
        isLoading: isLoadingWatchlist,
        addStockToWatchlist,
        createWatchlist,
        setCurrentWatchlist,
        removeStockFromWatchlist,
        updateWatchlistItemNotes,
    } = useWatchlist();

    // Reset pagination when search term changes
    useEffect(() => {
        if (searchTerm) {
            setCurrentPage(1);
        }
    }, [searchTerm]);

    // Fetch paginated stocks for All Stocks tab (when not searching)
    const {data: paginatedStocksResponse, isLoading: isLoadingPaginatedStocks} = useQuery({
        queryKey: queryKeys.marketList(pageSize, (currentPage - 1) * pageSize),
        enabled: !!(OpenAPI as any).TOKEN && !searchTerm.trim(),
        queryFn: async () => {
            const list = (await MarketService.listStocks({
                limit: pageSize,
                offset: (currentPage - 1) * pageSize
            })) as any[];
            return list || [];
        },
        staleTime: 30 * 1000,
    });

    // Fetch search results (when searching)
    const {data: searchStocksResponse, isLoading: isLoadingSearchStocks} = useQuery({
        queryKey: ['marketSearch', searchTerm.trim()],
        enabled: !!(OpenAPI as any).TOKEN && !!searchTerm.trim(),
        queryFn: async () => {
            const list = (await MarketService.listStocks({
                q: searchTerm.trim(),
                limit: 500, // Backend max limit is 500
                offset: 0
            })) as any[];
            return list || [];
        },
        staleTime: 30 * 1000,
    });

    // Map paginated stocks to MarketData format
    const paginatedStocks: MarketDataType[] = (paginatedStocksResponse || []).map((it: any) => {
        const lastPrice = Number(it.ltp || it.last || 0);
        const totalSecurities = Number(it.total_outstanding_securities || 0);
        // Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
        // 1 crore = 10,000,000
        const calculatedMarketCap = lastPrice > 0 && totalSecurities > 0 
            ? (lastPrice * totalSecurities) / 10_000_000 
            : Number(it.market_cap || 0);
        
        return {
            symbol: it.symbol,
            companyName: it.company_name,
            currentPrice: lastPrice,
            change: Number(it.change || 0),
            changePercent: Number(it.change_percent || 0),
            volume: Number(it.volume || 0),
            high52Week: 0,
            low52Week: 0,
            marketCap: calculatedMarketCap,
            peRatio: undefined,
            dividend: undefined,
            dividendYield: undefined,
            sector: it.sector || 'Unknown',
            industry: it.industry || 'Unknown',
            lastUpdated: it.timestamp || new Date().toISOString(),
        };
    });

    // Map search results to MarketData format
    const searchStocks: MarketDataType[] = (searchStocksResponse || []).map((it: any) => {
        const lastPrice = Number(it.ltp || it.last || 0);
        const totalSecurities = Number(it.total_outstanding_securities || 0);
        // Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
        // 1 crore = 10,000,000
        const calculatedMarketCap = lastPrice > 0 && totalSecurities > 0 
            ? (lastPrice * totalSecurities) / 10_000_000 
            : Number(it.market_cap || 0);
        
        return {
            symbol: it.symbol,
            companyName: it.company_name,
            currentPrice: lastPrice,
            change: Number(it.change || 0),
            changePercent: Number(it.change_percent || 0),
            volume: Number(it.volume || 0),
            high52Week: 0,
            low52Week: 0,
            marketCap: calculatedMarketCap,
            peRatio: undefined,
            dividend: undefined,
            dividendYield: undefined,
            sector: it.sector || 'Unknown',
            industry: it.industry || 'Unknown',
            lastUpdated: it.timestamp || new Date().toISOString(),
        };
    });

    // Set default watchlist when watchlists load
    useEffect(() => {
        if (watchlistsFromHook.length > 0 && !currentWatchlist) {
            const defaultWatchlist = watchlistsFromHook.find(w => w.is_default) || watchlistsFromHook[0];
            setCurrentWatchlist(defaultWatchlist);
        }
    }, [watchlistsFromHook, currentWatchlist, setCurrentWatchlist]);

    // Fetch market data for watchlist stocks
    useEffect(() => {
        const fetchWatchlistStockPrices = async () => {
            if (!watchlistItems || watchlistItems.length === 0) {
                setWatchlistStocksWithPrices([]);
                return;
            }

            try {
                const stocksWithPrices = await Promise.all(
                    watchlistItems.map(async (item) => {
                        try {
                            const stockData = await MarketService.getStock({symbol: item.stock.symbol});
                            const lastPrice = Number((stockData as any).data?.last_trade_price || (stockData as any).last || 0);
                            const totalSecurities = Number((stockData as any).total_outstanding_securities || 0);
                            // Calculate market cap: last_trade_price × total_outstanding_securities (in crores)
                            // 1 crore = 10,000,000
                            const calculatedMarketCap = lastPrice > 0 && totalSecurities > 0 
                                ? (lastPrice * totalSecurities) / 10_000_000 
                                : Number((stockData as any).market_cap || 0);
                            
                            return {
                                symbol: item.stock.symbol,
                                companyName: item.stock.company_name,
                                currentPrice: lastPrice,
                                change: Number((stockData as any).data?.change || (stockData as any).change || 0),
                                changePercent: Number((stockData as any).data?.change_percent || (stockData as any).change_percent || 0),
                                volume: Number((stockData as any).data?.volume || (stockData as any).volume || 0),
                                high52Week: 0,
                                low52Week: 0,
                                marketCap: calculatedMarketCap,
                                peRatio: undefined,
                                dividend: undefined,
                                dividendYield: undefined,
                                sector: item.stock.sector || 'Unknown',
                                industry: item.stock.industry || 'Unknown',
                                lastUpdated: (stockData as any).data?.timestamp || (stockData as any).timestamp || new Date().toISOString(),
                            } as MarketDataType;
                        } catch (error) {
                            // Return basic data if price fetch fails
                            return {
                                symbol: item.stock.symbol,
                                companyName: item.stock.company_name,
                                currentPrice: 0,
                                change: 0,
                                changePercent: 0,
                                volume: 0,
                                high52Week: 0,
                                low52Week: 0,
                                marketCap: 0,
                                peRatio: undefined,
                                dividend: undefined,
                                dividendYield: undefined,
                                sector: item.stock.sector || 'Unknown',
                                industry: item.stock.industry || 'Unknown',
                                lastUpdated: new Date().toISOString(),
                            } as MarketDataType;
                        }
                    })
                );
                setWatchlistStocksWithPrices(stocksWithPrices);
            } catch (error) {
                console.error('Error fetching watchlist stock prices:', error);
            }
        };

        fetchWatchlistStockPrices();
    }, [watchlistItems]);

    // Handle adding stock to watchlist using dialog
    const handleAddToWatchlistClick = (symbol: string, companyName: string) => {
        setSelectedStockForWatchlist({symbol, companyName});
        setAddToWatchlistDialogOpen(true);
    };

    const handleAddStockToWatchlist = async (watchlistId: string, notes?: string) => {
        if (!selectedStockForWatchlist) return;

        try {
            // Find stock ID from the symbol
            const stocks = (await MarketService.listStocks({q: selectedStockForWatchlist.symbol, limit: 1})) as any[];
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

    const handleCreateWatchlistSubmit = async () => {
        if (!newWatchlistName.trim()) {
            toast.error('Please enter a watchlist name');
            return;
        }

        setIsCreatingWatchlist(true);
        try {
            const result = await createWatchlist({
                name: newWatchlistName.trim(),
                description: newWatchlistDescription.trim() || undefined,
                is_default: watchlistsFromHook.length === 0, // Make first watchlist default
            });

            if (result) {
                toast.success(`Watchlist "${newWatchlistName}" created`);
                setCreateWatchlistDialogOpen(false);
                setNewWatchlistName("");
                setNewWatchlistDescription("");
                // The watchlist will be automatically selected since it's the only one
            } else {
                toast.error('Failed to create watchlist');
            }
        } catch (error) {
            console.error('Error creating watchlist:', error);
            toast.error('Failed to create watchlist');
        } finally {
            setIsCreatingWatchlist(false);
        }
    };
    const formatNumber = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toString();
    };

    const formatMarketCap = (marketCap: number) => {
        if (marketCap === 0 || !marketCap) return 'N/A';
        // Market cap is already in crores, format with Cr suffix
        return `৳${marketCap.toFixed(2)} Cr`;
    };

    // For All Stocks tab, use search results if searching, otherwise use paginated data
    const stocksToDisplay = searchTerm.trim() ? searchStocks : paginatedStocks;
    const isLoadingStocks = searchTerm.trim() ? isLoadingSearchStocks : isLoadingPaginatedStocks;
    
    const filteredAndSortedData = stocksToDisplay
        .sort((a, b) => {
            let aVal: number | string, bVal: number | string;

            switch (sortBy) {
                case 'symbol':
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case 'price':
                    aVal = a.currentPrice;
                    bVal = b.currentPrice;
                    break;
                case 'change':
                    aVal = a.changePercent;
                    bVal = b.changePercent;
                    break;
                case 'volume':
                    aVal = a.volume;
                    bVal = b.volume;
                    break;
                default:
                    aVal = a.symbol;
                    bVal = b.symbol;
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }

            return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

    // Removed old watchlist filtering code - now using useWatchlist hook with watchlistStocksWithPrices

    const topGainers = marketData
        .filter(stock => stock.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 5);

    const topLosers = marketData
        .filter(stock => stock.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 5);

    const mostActive = marketData
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Market Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Top Gainer</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600"/>
                    </CardHeader>
                    <CardContent>
                        {topGainers[0] && (
                            <div>
                                <div className="text-2xl font-bold">{topGainers[0].symbol}</div>
                                <p className="text-xs text-muted-foreground">{topGainers[0].companyName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-medium">{formatCurrency(topGainers[0].currentPrice)}</span>
                                    <span className="text-green-600">{formatPercent(topGainers[0].changePercent)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Top Loser</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600"/>
                    </CardHeader>
                    <CardContent>
                        {topLosers[0] && (
                            <div>
                                <div className="text-2xl font-bold">{topLosers[0].symbol}</div>
                                <p className="text-xs text-muted-foreground">{topLosers[0].companyName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-medium">{formatCurrency(topLosers[0].currentPrice)}</span>
                                    <span className="text-red-600">{formatPercent(topLosers[0].changePercent)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Most Active</CardTitle>
                        <Volume2 className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        {mostActive[0] && (
                            <div>
                                <div className="text-2xl font-bold">{mostActive[0].symbol}</div>
                                <p className="text-xs text-muted-foreground">{mostActive[0].companyName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="font-medium">{formatCurrency(mostActive[0].currentPrice)}</span>
                                    <span
                                        className="text-muted-foreground">Vol: {formatNumber(mostActive[0].volume)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all-stocks" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all-stocks">All Stocks</TabsTrigger>
                    <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                    <TabsTrigger value="movers">Top Movers</TabsTrigger>
                    <TabsTrigger value="news">Market News</TabsTrigger>
                </TabsList>

                <TabsContent value="all-stocks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Market Data</CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        placeholder="Search stocks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-64"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingStocks ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-center">
                                        <div
                                            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"/>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {searchTerm.trim() ? 'Searching stocks...' : 'Loading stocks...'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    <Button variant="ghost" onClick={() => handleSort('symbol')}
                                                            className="p-0 h-auto font-medium">
                                                        Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                </TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead className="text-right">
                                                    <Button variant="ghost" onClick={() => handleSort('price')}
                                                            className="p-0 h-auto font-medium">
                                                        Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <Button variant="ghost" onClick={() => handleSort('change')}
                                                            className="p-0 h-auto font-medium">
                                                        Change {sortBy === 'change' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    <Button variant="ghost" onClick={() => handleSort('volume')}
                                                            className="p-0 h-auto font-medium">
                                                        Volume {sortBy === 'volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                </TableHead>
                                                <TableHead className="text-right">Market Cap</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAndSortedData.length > 0 ? (
                                                filteredAndSortedData.map((stock) => (
                                                    <TableRow key={stock.symbol}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{stock.symbol}</span>
                                                                <Badge variant="outline"
                                                                       className="text-xs">{stock.sector}</Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px]">
                                                                <p className="truncate">{stock.companyName}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(stock.currentPrice)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {stock.change >= 0 ? (
                                                                    <TrendingUp className="h-3 w-3 text-green-600"/>
                                                                ) : (
                                                                    <TrendingDown className="h-3 w-3 text-red-600"/>
                                                                )}
                                                                <div
                                                                    className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    <div>{formatCurrency(stock.change)}</div>
                                                                    <div
                                                                        className="text-xs">{formatPercent(stock.changePercent)}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-right">{formatNumber(stock.volume)}</TableCell>
                                                        <TableCell
                                                            className="text-right">{formatMarketCap(stock.marketCap)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => onChartStock(stock.symbol)}
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <BarChart3 className="h-3 w-3"/>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => onQuickTrade(stock.symbol)}
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <ShoppingCart className="h-3 w-3"/>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleAddToWatchlistClick(stock.symbol, stock.companyName)}
                                                                    className="h-8 w-8 p-0"
                                                                >
                                                                    <Star className="h-3 w-3"/>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7}
                                                               className="text-center py-8 text-muted-foreground">
                                                        No stocks found
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination Controls - Only show when not searching */}
                                    {!searchTerm.trim() && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">Rows per page:</span>
                                            <Select
                                                value={pageSize.toString()}
                                                onValueChange={(value) => {
                                                    setPageSize(Number(value));
                                                    setCurrentPage(1); // Reset to first page when changing page size
                                                }}
                                            >
                                                <SelectTrigger className="w-20">
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="100">100</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} - Showing {filteredAndSortedData.length} stocks
                  </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1 || isLoadingPaginatedStocks}
                                                >
                                                    <ChevronLeft className="h-4 w-4"/>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => p + 1)}
                                                    disabled={filteredAndSortedData.length < pageSize || isLoadingPaginatedStocks}
                                                >
                                                    <ChevronRight className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                    {/* Search Results Summary */}
                                    {searchTerm.trim() && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Found {filteredAndSortedData.length} {filteredAndSortedData.length === 1 ? 'stock' : 'stocks'} matching "{searchTerm}"
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="watchlist" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>My Watchlist</CardTitle>
                                <div className="flex items-center gap-2">
                                    {watchlistsFromHook.length > 0 && (
                                        <div className="w-56">
                                            <Select
                                                value={currentWatchlist?.id}
                                                onValueChange={(value) => {
                                                    const selected = watchlistsFromHook.find(w => w.id === value);
                                                    if (selected) setCurrentWatchlist(selected);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select watchlist"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {watchlistsFromHook.map(w => (
                                                        <SelectItem key={w.id} value={w.id}>
                                                            {w.name} {w.is_default && "(Default)"}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                        <Input
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-64"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingWatchlist ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                                </div>
                            ) : !currentWatchlist ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No watchlists available</p>
                                    <p className="text-sm text-muted-foreground mt-2">Create a watchlist to start
                                        tracking stocks</p>
                                    <Button
                                        onClick={() => setCreateWatchlistDialogOpen(true)}
                                        className="mt-4"
                                        variant="default"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create Watchlist
                                    </Button>
                                </div>
                            ) : watchlistStocksWithPrices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Sector</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Change</TableHead>
                                            <TableHead className="text-right">Volume</TableHead>
                                            <TableHead className="text-right">Market Cap</TableHead>
                                            <TableHead className="text-right">Notes</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {watchlistStocksWithPrices
                                            .filter(stock =>
                                                stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                stock.companyName.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                            .map((stock) => {
                                                const item = watchlistItems.find(i => i.stock.symbol === stock.symbol);
                                                return (
                                                    <TableRow key={`${currentWatchlist.id}-${stock.symbol}`}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{stock.symbol}</span>
                                                                {heldSymbols?.has(stock.symbol) && (
                                                                    <Badge variant="secondary"
                                                                           className="text-xs">Held</Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px]">
                                                                <p className="truncate">{stock.companyName}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline"
                                                                   className="text-xs">{stock.sector}</Badge>
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-right font-medium">{formatCurrency(stock.currentPrice)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {stock.change >= 0 ? (
                                                                    <TrendingUp className="h-3 w-3 text-green-600"/>
                                                                ) : (
                                                                    <TrendingDown className="h-3 w-3 text-red-600"/>
                                                                )}
                                                                <div
                                                                    className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                    <div>{formatCurrency(stock.change)}</div>
                                                                    <div
                                                                        className="text-xs">{formatPercent(stock.changePercent)}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-right">{formatNumber(stock.volume)}</TableCell>
                                                        <TableCell
                                                            className="text-right">{formatMarketCap(stock.marketCap)}</TableCell>
                                                        <TableCell className="text-right max-w-[150px]">
                                                            <Input
                                                                value={item?.notes || ""}
                                                                onChange={(e) => {
                                                                    if (item) {
                                                                        updateWatchlistItemNotes(currentWatchlist.id, item.id, e.target.value);
                                                                    }
                                                                }}
                                                                placeholder="Add notes..."
                                                                className="h-8 text-xs"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center gap-1 justify-end">
                                                                <Button variant="ghost" size="sm"
                                                                        onClick={() => onChartStock(stock.symbol)}
                                                                        className="h-8 w-8 p-0">
                                                                    <BarChart3 className="h-3 w-3"/>
                                                                </Button>
                                                                <Button variant="ghost" size="sm"
                                                                        onClick={() => onQuickTrade(stock.symbol)}
                                                                        className="h-8 w-8 p-0">
                                                                    <ShoppingCart className="h-3 w-3"/>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={async () => {
                                                                        if (item) {
                                                                            const success = await removeStockFromWatchlist(currentWatchlist.id, item.id);
                                                                            if (success) {
                                                                                toast.success(`Removed ${stock.symbol} from watchlist`);
                                                                            } else {
                                                                                toast.error('Failed to remove stock');
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="h-8 w-8 p-0 text-destructive"
                                                                >
                                                                    <Star className="h-3 w-3 fill-current"/>
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No stocks in this watchlist</p>
                                    <p className="text-sm text-muted-foreground mt-2">Add stocks from the "All Stocks"
                                        tab</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="movers" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-green-600">Top Gainers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topGainers.map((stock) => (
                                        <div key={stock.symbol} className="flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium">{stock.symbol}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                    {stock.companyName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                                                    <p className="text-xs text-green-600">{formatPercent(stock.changePercent)}</p>
                                                </div>
                                                <div
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onChartStock(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <BarChart3 className="h-3 w-3"/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onQuickTrade(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ShoppingCart className="h-3 w-3"/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleAddToWatchlistClick(stock.symbol, stock.companyName)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <Star className="h-3 w-3"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-red-600">Top Losers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topLosers.map((stock) => (
                                        <div key={stock.symbol} className="flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium">{stock.symbol}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                    {stock.companyName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                                                    <p className="text-xs text-red-600">{formatPercent(stock.changePercent)}</p>
                                                </div>
                                                <div
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onChartStock(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <BarChart3 className="h-3 w-3"/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onQuickTrade(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ShoppingCart className="h-3 w-3"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Most Active</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {mostActive.map((stock) => (
                                        <div key={stock.symbol} className="flex items-center justify-between group">
                                            <div>
                                                <p className="font-medium">{stock.symbol}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                    {stock.companyName}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-right">
                                                    <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                                                    <p className="text-xs text-muted-foreground">Vol: {formatNumber(stock.volume)}</p>
                                                </div>
                                                <div
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onChartStock(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <BarChart3 className="h-3 w-3"/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onQuickTrade(stock.symbol)}
                                                        className="h-6 w-6 p-0"
                                                    >
                                                        <ShoppingCart className="h-3 w-3"/>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="news" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Market News</CardTitle>
                                {watchlists.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-muted-foreground">Filter by watchlist</div>
                                        <div className="w-56">
                                            <Select value={selectedWatchlistId} onValueChange={setSelectedWatchlistId}>
                                                <SelectTrigger>
                                                    <SelectValue/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {watchlists.map(w => (
                                                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(selectedWatchlistId
                                        ? news.filter(a => !a.symbols || a.symbols.some(s => (watchlists.find(w => w.id === selectedWatchlistId)?.symbols || []).includes(s)))
                                        : news
                                ).map((article) => (
                                    <div key={article.id} className="border-b border-border pb-4 last:border-b-0">
                                        <h3 className="font-medium mb-2">{article.title}</h3>
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {article.summary}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">{article.source}</span>
                                                {article.symbols && article.symbols.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {article.symbols.map((symbol) => (
                                                            <Badge key={symbol} variant="outline" className="text-xs">
                                                                {symbol}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                        {new Date(article.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                      </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Add to Watchlist Dialog */}
            {selectedStockForWatchlist && (
                <AddToWatchlistDialog
                    open={addToWatchlistDialogOpen}
                    onOpenChange={setAddToWatchlistDialogOpen}
                    symbol={selectedStockForWatchlist.symbol}
                    companyName={selectedStockForWatchlist.companyName}
                    watchlists={watchlistsFromHook}
                    onAdd={handleAddStockToWatchlist}
                    onCreateWatchlist={handleCreateWatchlist}
                />
            )}
            
            {/* Create Watchlist Dialog */}
            <Dialog open={createWatchlistDialogOpen} onOpenChange={setCreateWatchlistDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Watchlist</DialogTitle>
                        <DialogDescription>
                            Create a new watchlist to track your favorite stocks
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="watchlist-name">Watchlist Name *</Label>
                            <Input
                                id="watchlist-name"
                                value={newWatchlistName}
                                onChange={(e) => setNewWatchlistName(e.target.value)}
                                placeholder="My Watchlist"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newWatchlistName.trim()) {
                                        handleCreateWatchlistSubmit();
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="watchlist-description">Description (optional)</Label>
                            <Input
                                id="watchlist-description"
                                value={newWatchlistDescription}
                                onChange={(e) => setNewWatchlistDescription(e.target.value)}
                                placeholder="Description..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newWatchlistName.trim()) {
                                        handleCreateWatchlistSubmit();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCreateWatchlistDialogOpen(false);
                                setNewWatchlistName("");
                                setNewWatchlistDescription("");
                            }}
                            disabled={isCreatingWatchlist}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateWatchlistSubmit}
                            disabled={isCreatingWatchlist || !newWatchlistName.trim()}
                        >
                            {isCreatingWatchlist ? 'Creating...' : 'Create Watchlist'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}