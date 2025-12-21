import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
    Search, Grid3x3, List, ArrowUpDown, Download, X,
    TrendingUp, Building2, DollarSign, Activity, Users,
    Percent, BarChart3, LineChart, Sparkles, ArrowUp, ArrowDown
} from "lucide-react";
import { MarketService } from "../src/client";
import { useFundamentals } from "../hooks/useFundamentals";
import { useFundamentalsData } from "../hooks/useFundamentalsData";
import { useMarketData } from "../hooks/useMarketData";
import { useTrading } from "../hooks/useTrading";
import { usePortfolios } from "../hooks/usePortfolios";
import {
    StockCard,
    FilterPanel,
    FilterCriteria,
    ComparisonTable,
    FundamentalScoreCard,
    QuickInsightsPanel,
    MetricCard,
    calculateFundamentalScore,
    generateInsights,
    exportToCSV,
    StockDetails
} from "./fundamentals/index";
import { QuickTradeDialog } from "./QuickTradeDialog";
import { ShareholdingChart } from "./charts/ShareholdingChart";
import { DividendsChart } from "./charts/DividendsChart";
import { PriceChart } from "./charts/PriceChart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Separator } from "./ui/separator";

interface FundamentalsProps {
    defaultSymbol?: string;
}

type ViewMode = 'grid' | 'detail' | 'comparison';
type SortField = 'symbol' | 'companyName' | 'score' | 'pe' | 'dividendYield' | 'marketCap';
type SortOrder = 'asc' | 'desc';

function formatNumber(n?: number | string | null) {
    if (n === undefined || n === null) return "-";
    const num = typeof n === "string" ? Number(n) : n;
    if (!isFinite(num)) return "-";
    if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTk(n?: number | string | null) {
    if (n === undefined || n === null) return "-";
    const num = typeof n === "string" ? Number(n) : n;
    if (!isFinite(num)) return "-";
    return `${formatNumber(num)}`;
}

function formatPct(n?: number | string | null) {
    if (n === undefined || n === null) return "-";
    const num = typeof n === "string" ? Number(n) : n;
    if (!isFinite(num)) return "-";
    return `${num.toFixed(2)}%`;
}

export function Fundamentals({ defaultSymbol }: FundamentalsProps) {
    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(defaultSymbol);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filters, setFilters] = useState<FilterCriteria>({});
    const [sortField, setSortField] = useState<SortField>('score');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [comparisonBasket, setComparisonBasket] = useState<string[]>([]);

    // Trade dialog state
    const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
    const [tradeSymbol, setTradeSymbol] = useState<string | undefined>();
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell' | undefined>();

    // Get trading data
    const { placeOrder, marketData: tradingMarketData = [] } = useTrading();
    const { portfolios = [] } = usePortfolios();

    // Pagination state
    const [page, setPage] = useState(0);
    const STOCKS_PER_PAGE = 20;

    // Update selected symbol if defaultSymbol changes
    useEffect(() => {
        if (defaultSymbol) {
            setSelectedSymbol(defaultSymbol);
            setViewMode('detail');
        }
    }, [defaultSymbol]);

    // Debounce search query to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(0); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [filters, sortField, sortOrder]);

    // Map filter criteria to API parameters
    const apiFilters = useMemo(() => ({
        sector: filters.sector,
        minPE: filters.minPE,
        maxPE: filters.maxPE,
        minDivYield: filters.minDivYield,
        maxDivYield: filters.maxDivYield,
        minScore: filters.minScore,
        minMarketCap: filters.minMarketCap,
        maxMarketCap: filters.maxMarketCap,
    }), [filters]);

    // Map sort field to API field name
    const apiSortBy = useMemo(() => {
        const sortMap: Record<SortField, string> = {
            'score': 'score',
            'pe': 'pe',
            'dividendYield': 'dividend_yield',
            'marketCap': 'market_cap',
            'symbol': 'symbol',
            'companyName': 'company_name',
        };
        return sortMap[sortField];
    }, [sortField]);

    // Fetch fundamentals data using dedicated hook with filters and sorting
    const { data: fundamentalsData = [], isFetching, isLoading: isLoadingStocks } = useFundamentalsData({
        searchQuery: debouncedSearchQuery,
        ...apiFilters,
        sortBy: apiSortBy,
        sortOrder: sortOrder,
        limit: STOCKS_PER_PAGE,
        offset: page * STOCKS_PER_PAGE
    });

    // Map fundamentals data to display format
    const displayedStocks = useMemo(() => {
        return fundamentalsData.map(stock => {
            const marketInfo = tradingMarketData.find(m => m.symbol === stock.symbol);
            return {
                ...stock,
                currentPrice: marketInfo?.currentPrice || 0,
                priceChange: marketInfo?.change || 0,
                priceChangePercent: marketInfo?.changePercent || 0,
                fundamentalScore: stock.score || 0,
            };
        });
    }, [fundamentalsData, tradingMarketData]);

    // Get unique sectors for filter (fetch separately or from displayed stocks)
    const sectors = useMemo(() => {
        return Array.from(new Set(displayedStocks.map(s => s.sector))).filter(Boolean).sort();
    }, [displayedStocks]);

    // Single stock detail data (for detail view)
    const {
        companyInfo,
        marketSummary,
        shareholding,
        earnings,
        financialHealth,
        dividends,
        historicalRatios,
        isLoading,
    } = useFundamentals(selectedSymbol);

    // Get score and insights for selected stock (uses API score and breakdown when available)
    const selectedStockScore = useMemo(() => {
        const stock = displayedStocks.find(s => s.symbol === selectedSymbol);
        if (!stock || !marketSummary || !financialHealth) return null;

        // Use API score to match list view
        const apiScore = stock.fundamentalScore || 0;

        // Use API breakdown if available, otherwise calculate locally
        let breakdown;
        if (stock.scoreBreakdown) {
            // Convert API breakdown format to component format
            const apiBreakdown = stock.scoreBreakdown;
            breakdown = [
                {
                    category: 'Base Score',
                    score: apiBreakdown.base_score || 50,
                    maxScore: 50,
                    description: 'Starting score for all stocks'
                },
                {
                    category: 'P/E Ratio',
                    score: apiBreakdown.pe_contribution || 0,
                    maxScore: 20,
                    description: 'Valuation metric - lower P/E is better'
                },
                {
                    category: 'Dividend Yield',
                    score: apiBreakdown.dividend_yield_contribution || 0,
                    maxScore: 15,
                    description: 'Annual dividend return percentage'
                },
                {
                    category: 'Debt-to-Equity',
                    score: apiBreakdown.debt_to_equity_contribution || 0,
                    maxScore: 15,
                    description: 'Financial leverage - lower is better'
                },
                {
                    category: 'ROE',
                    score: apiBreakdown.roe_contribution || 0,
                    maxScore: 10,
                    description: 'Return on equity - profitability metric'
                }
            ];
        } else {
            // Fallback: Calculate breakdown from detail view data
            const result = calculateFundamentalScore({
                pe: Number(marketSummary.current_pe),
                dividendYield: Number(marketSummary.dividend_yield),
                debtToEquity: Number(financialHealth.total_loan) / Math.max(1, Number(financialHealth.reserve_and_surplus) || 1),
                marketCap: Number(marketSummary.market_cap),
            });

            // Scale breakdown to match API score (so breakdown sums to overall score)
            const calculatedTotal = Object.values(result.breakdown).reduce((sum, item) => sum + item.score, 0);
            const scaleFactor = calculatedTotal > 0 ? apiScore / calculatedTotal : 1;

            breakdown = Object.values(
                Object.fromEntries(
                    Object.entries(result.breakdown).map(([key, value]) => [
                        key,
                        {
                            ...value,
                            score: Math.round(value.score * scaleFactor)
                        }
                    ])
                )
            );
        }

        const insights = generateInsights({
            pe: Number(marketSummary.current_pe),
            dividendYield: Number(marketSummary.dividend_yield),
            debtToEquity: Number(financialHealth.total_loan) / Math.max(1, Number(financialHealth.reserve_and_surplus) || 1),
            score: apiScore,
        });

        return { score: apiScore, breakdown, insights };
    }, [displayedStocks, selectedSymbol, marketSummary, financialHealth]);

    // Comparison data
    const comparisonData = useMemo(() => {
        return comparisonBasket.map(symbol => {
            const stock = displayedStocks.find(s => s.symbol === symbol);
            return stock ? {
                symbol: stock.symbol,
                companyName: stock.companyName,
                ltp: stock.currentPrice,
                pe: stock.pe,
                dividendYield: stock.dividendYield,
                roe: stock.roe,
                debtToEquity: stock.debtToEquity,
                marketCap: stock.marketCap,
                eps: stock.eps,
                navPerShare: stock.navPerShare,
            } : null;
        }).filter(Boolean) as any[];
    }, [comparisonBasket, displayedStocks]);

    // Chart data for detail view
    const { data: chart, isLoading: chartLoading } = useQuery({
        enabled: !!selectedSymbol && viewMode === 'detail',
        queryKey: ["market", "chart", selectedSymbol, "5Y"],
        queryFn: async () => {
            const resp = await MarketService.getChartData({ symbol: selectedSymbol as string, timeframe: "5Y" });
            return resp as any;
        }
    });

    // Handlers
    const handleViewDetails = (symbol: string) => {
        setSelectedSymbol(symbol);
        setViewMode('detail');
    };

    const handleAddToComparison = (symbol: string) => {
        if (comparisonBasket.includes(symbol)) {
            setComparisonBasket(comparisonBasket.filter(s => s !== symbol));
        } else {
            if (comparisonBasket.length >= 5) {
                alert('Maximum 5 stocks can be compared at once');
                return;
            }
            setComparisonBasket([...comparisonBasket, symbol]);
        }
    };

    const handleRemoveFromComparison = (symbol: string) => {
        setComparisonBasket(comparisonBasket.filter(s => s !== symbol));
    };

    const handleExportComparison = () => {
        exportToCSV(comparisonData, `stock-comparison-${Date.now()}`);
    };

    const handleTrade = (symbol: string, side?: 'buy' | 'sell') => {
        setTradeSymbol(symbol);
        setTradeSide(side);
        setIsTradeDialogOpen(true);
    };

    const handlePlaceOrder = async (order: any) => {
        try {
            await placeOrder(order);
            setIsTradeDialogOpen(false);
        } catch (error) {
            console.error('Failed to place order:', error);
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Control Bar - Hidden in Detail View */}
            {viewMode !== 'detail' && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search stocks by symbol or company name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* View Toggle */}
                            <div className="flex gap-2">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid3x3 className="h-4 w-4 mr-2" />
                                    Grid
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selectedSymbol && setViewMode('detail')}
                                    disabled={!selectedSymbol}
                                >
                                    <List className="h-4 w-4 mr-2" />
                                    Detail
                                </Button>
                                {comparisonBasket.length > 0 && (
                                    <Button
                                        variant={viewMode === 'comparison' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setViewMode('comparison')}
                                    >
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        Compare ({comparisonBasket.length})
                                    </Button>
                                )}
                            </div>
                        </div>

                        {viewMode === 'grid' && (
                            <div className="mt-4">
                                <FilterPanel
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    sectors={sectors}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <>
                    {/* Sorting Controls */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {isFetching && page === 0 ? (
                                'Loading stocks...'
                            ) : (
                                <>
                                    Showing {displayedStocks.length} stock{displayedStocks.length !== 1 ? 's' : ''}
                                    {debouncedSearchQuery && ` matching "${debouncedSearchQuery}"`}
                                    {fundamentalsData.length === STOCKS_PER_PAGE && ' (load more available)'}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Sort by:</span>
                            <Button
                                variant={sortField === 'score' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleSort('score')}
                                className="flex items-center gap-1"
                            >
                                Score
                                {sortField === 'score' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </Button>
                            <Button
                                variant={sortField === 'companyName' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleSort('companyName')}
                                className="flex items-center gap-1"
                            >
                                Company
                                {sortField === 'companyName' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </Button>
                            <Button
                                variant={sortField === 'pe' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleSort('pe')}
                                className="flex items-center gap-1"
                            >
                                P/E
                                {sortField === 'pe' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </Button>
                            <Button
                                variant={sortField === 'dividendYield' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => toggleSort('dividendYield')}
                                className="flex items-center gap-1"
                            >
                                Div Yield
                                {sortField === 'dividendYield' && (sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                            </Button>
                        </div>
                    </div>

                    {/* Stock Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {displayedStocks.map((stock) => (
                            <StockCard
                                key={stock.symbol}
                                symbol={stock.symbol}
                                companyName={stock.companyName}
                                sector={stock.sector}
                                currentPrice={stock.currentPrice}
                                priceChange={stock.priceChange}
                                priceChangePercent={stock.priceChangePercent}
                                pe={stock.pe}
                                dividendYield={stock.dividendYield}
                                roe={stock.roe}
                                debtToEquity={stock.debtToEquity}
                                fundamentalScore={stock.fundamentalScore}
                                onViewDetails={() => handleViewDetails(stock.symbol)}
                                onCompare={() => handleAddToComparison(stock.symbol)}
                                onTrade={() => handleTrade(stock.symbol)}
                                onAddToWatchlist={() => {/* TODO: Implement watchlist */ }}
                                isSelected={comparisonBasket.includes(stock.symbol)}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    {fundamentalsData.length === STOCKS_PER_PAGE && (
                        <div className="flex justify-center mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={isFetching}
                            >
                                {isFetching ? 'Loading...' : 'Load More Stocks'}
                            </Button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isFetching && displayedStocks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="text-muted-foreground mb-4">
                                {debouncedSearchQuery ? (
                                    <>No stocks found matching "{debouncedSearchQuery}"</>
                                ) : (
                                    <>No stocks available. Try adjusting your filters.</>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Comparison View */}
            {viewMode === 'comparison' && (
                <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode('grid')}
                    >
                        ← Back to Grid
                    </Button>

                    {/* Comparison Header */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-2xl font-bold">
                                    Stock Comparison
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleExportComparison}
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setComparisonBasket([]);
                                            setViewMode('grid');
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Comparison Table */}
                    <ComparisonTable
                        stocks={comparisonData}
                        onRemove={handleRemoveFromComparison}
                        onExport={handleExportComparison}
                    />

                    {/* Action Hint */}
                    {comparisonBasket.length < 5 && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center text-sm text-muted-foreground">
                                    <p>You can add up to {5 - comparisonBasket.length} more stock{5 - comparisonBasket.length !== 1 ? 's' : ''} for comparison.</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => setViewMode('grid')}
                                        className="mt-2"
                                    >
                                        Go back to grid to add more stocks
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Detail View - New Redesigned View */}
            {viewMode === 'detail' && selectedSymbol && (
                <StockDetails
                    symbol={selectedSymbol}
                    data={displayedStocks.find(s => s.symbol === selectedSymbol)}
                    onBack={() => setViewMode('grid')}
                />
            )}

            {/* Quick Trade Dialog */}
            <QuickTradeDialog
                open={isTradeDialogOpen}
                onOpenChange={setIsTradeDialogOpen}
                onPlaceOrder={handlePlaceOrder}
                marketData={tradingMarketData}
                initialSymbol={tradeSymbol}
                initialSide={tradeSide}
                portfolios={portfolios}
                selectedPortfolioId={portfolios.length > 0 ? portfolios[0].id : undefined}
            />
        </div>
    );
}
