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
    exportToCSV
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
            {/* Top Control Bar */}
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
                                variant={viewMode === 'detail' ? 'default' : 'outline'}
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

            {/* Detail View - Original Detailed Analysis */}
            {viewMode === 'detail' && selectedSymbol && (
                <div className="space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewMode('grid')}
                    >
                        ← Back to Grid
                    </Button>

                    {/* Hero Section */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                        {companyInfo?.company_name || 'Fundamental Analysis'}
                                        <Badge variant="outline" className="text-sm h-6">
                                            {selectedSymbol}
                                        </Badge>
                                    </CardTitle>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {companyInfo?.sector} • {companyInfo?.category || 'N/A'}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {marketSummary?.market_cap && (
                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">Market Cap</div>
                                            <div className="font-medium">{formatNumber(marketSummary.market_cap as any)}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Score and Insights Row */}
                    {selectedStockScore && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <FundamentalScoreCard
                                overallScore={selectedStockScore.score}
                                breakdown={selectedStockScore.breakdown}
                                explanation="Based on valuation, dividend yield, financial health, profitability, and market strength"
                            />
                            <QuickInsightsPanel insights={selectedStockScore.insights} />
                        </div>
                    )}

                    {/* Key Metrics Grid */}
                    {(() => {
                        const selectedStock = displayedStocks.find(s => s.symbol === selectedSymbol);
                        if (!selectedStock) return null;
                        
                        return (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <MetricCard
                                    label="P/E Ratio"
                                    value={formatNumber(selectedStock.pe)}
                                    status={selectedStock.pe && selectedStock.pe > 0 && selectedStock.pe < 15 ? 'good' : selectedStock.pe && selectedStock.pe < 25 ? 'fair' : 'poor'}
                                    description="Price-to-Earnings ratio indicates valuation"
                                />
                                <MetricCard
                                    label="Dividend Yield"
                                    value={formatPct(selectedStock.dividendYield)}
                                    status={selectedStock.dividendYield && selectedStock.dividendYield > 3 ? 'good' : selectedStock.dividendYield && selectedStock.dividendYield > 1 ? 'fair' : 'poor'}
                                    description="Annual dividend as percentage of price"
                                />
                                <MetricCard
                                    label="Market Cap"
                                    value={`${formatNumber(selectedStock.marketCap)}M`}
                                    description="Total market value of the company"
                                />
                                <MetricCard
                                    label="NAV/Share"
                                    value={formatNumber(selectedStock.navPerShare)}
                                    description="Net Asset Value per share"
                                />
                            </div>
                        );
                    })()}

                    {/* Detailed Tabs */}
                    <Tabs defaultValue="overview">
                        <TabsList className="flex flex-wrap gap-2">
                            <TabsTrigger value="overview"><Building2 className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
                            <TabsTrigger value="earnings"><TrendingUp className="h-4 w-4 mr-1" /> Earnings</TabsTrigger>
                            <TabsTrigger value="financial-health"><Activity className="h-4 w-4 mr-1" /> Financial Health</TabsTrigger>
                            <TabsTrigger value="shareholding"><Users className="h-4 w-4 mr-1" /> Shareholding</TabsTrigger>
                            <TabsTrigger value="dividends"><Percent className="h-4 w-4 mr-1" /> Dividends</TabsTrigger>
                            <TabsTrigger value="ratios"><BarChart3 className="h-4 w-4 mr-1" /> Historical Ratios</TabsTrigger>
                            <TabsTrigger value="chart"><LineChart className="h-4 w-4 mr-1" /> Price Chart</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Company Profile & Listing</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        <div><div className="text-muted-foreground">Trading Code</div><div className="font-medium">{companyInfo?.trading_code || selectedSymbol || "-"}</div></div>
                                        <div><div className="text-muted-foreground">Company Name</div><div className="font-medium">{companyInfo?.company_name || "-"}</div></div>
                                        <div><div className="text-muted-foreground">Sector</div><div className="font-medium">{companyInfo?.sector || "-"}</div></div>
                                        <div><div className="text-muted-foreground">Category</div><div className="font-medium">{companyInfo?.category || "-"}</div></div>
                                        <div><div className="text-muted-foreground">Listing Year</div><div className="font-medium">{companyInfo?.listing_year || "-"}</div></div>
                                        <div><div className="text-muted-foreground">Website</div><div className="font-medium text-blue-600 dark:text-blue-400">{companyInfo?.website || "-"}</div></div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Market Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-muted-foreground">Last Price (LTP)</div>
                                            <div className="font-bold text-lg">{marketSummary?.ltp}</div>
                                        </div>
                                        <div><div className="text-muted-foreground">Current P/E</div><div className="font-medium">{formatNumber(marketSummary?.current_pe)}</div></div>
                                        <div><div className="text-muted-foreground">Dividend Yield</div><div className="font-medium">{formatPct(marketSummary?.dividend_yield)}</div></div>
                                        <div><div className="text-muted-foreground">NAV</div><div className="font-medium">{formatTk(marketSummary?.nav)}</div></div>
                                        <div><div className="text-muted-foreground">Market Cap</div><div className="font-medium">{formatTk(marketSummary?.market_cap)}M</div></div>
                                        <div><div className="text-muted-foreground">52W Low</div><div className="font-medium">{formatTk(marketSummary?.week_52_range?.low)}</div></div>
                                        <div><div className="text-muted-foreground">52W High</div><div className="font-medium">{formatTk(marketSummary?.week_52_range?.high)}</div></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Earnings Tab */}
                        <TabsContent value="earnings" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Earnings & Profitability</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {earnings ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Revenue</div>
                                                    <div className="text-lg font-semibold">{formatNumber((earnings as any).revenue)}M</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Net Profit</div>
                                                    <div className="text-lg font-semibold">{formatNumber((earnings as any).net_profit)}M</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">EPS</div>
                                                    <div className="text-lg font-semibold">{formatNumber((earnings as any).eps)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">ROE</div>
                                                    <div className="text-lg font-semibold">{formatPct((earnings as any).roe)}</div>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                <div><span className="text-muted-foreground">Operating Profit:</span> <span className="font-medium">{formatNumber((earnings as any).operating_profit)}M</span></div>
                                                <div><span className="text-muted-foreground">Profit Margin:</span> <span className="font-medium">{formatPct((earnings as any).profit_margin)}</span></div>
                                                <div><span className="text-muted-foreground">ROA:</span> <span className="font-medium">{formatPct((earnings as any).roa)}</span></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">No earnings data available</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Financial Health Tab */}
                        <TabsContent value="financial-health" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Financial Health</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {financialHealth ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Total Assets</div>
                                                    <div className="text-lg font-semibold">{formatNumber((financialHealth as any).total_assets)}M</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Total Liabilities</div>
                                                    <div className="text-lg font-semibold">{formatNumber((financialHealth as any).total_liabilities)}M</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Total Equity</div>
                                                    <div className="text-lg font-semibold">{formatNumber(financialHealth.reserve_and_surplus)}M</div>
                                                </div>
                                            </div>
                                            <Separator />
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div><span className="text-muted-foreground">Total Loan:</span> <span className="font-medium">{formatNumber(financialHealth.total_loan)}M</span></div>
                                                <div><span className="text-muted-foreground">Current Assets:</span> <span className="font-medium">{formatNumber((financialHealth as any).current_assets)}M</span></div>
                                                <div><span className="text-muted-foreground">Current Liabilities:</span> <span className="font-medium">{formatNumber((financialHealth as any).current_liabilities)}M</span></div>
                                                <div>
                                                    <span className="text-muted-foreground">Current Ratio:</span>
                                                    <span className="font-medium ml-1">
                                                        {formatNumber(Number((financialHealth as any).current_assets) / Math.max(1, Number((financialHealth as any).current_liabilities)))}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">No financial health data available</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Shareholding Tab */}
                        <TabsContent value="shareholding" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Shareholding Pattern</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {shareholding ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Sponsor/Directors</div>
                                                    <div className="text-lg font-semibold">{formatPct((shareholding as any).sponsor_director)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Public shareholding</div>
                                                    <div className="text-lg font-semibold">{formatPct((shareholding as any).public_shareholding)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Institutional</div>
                                                    <div className="text-lg font-semibold">{formatPct((shareholding as any).institutional)}</div>
                                                </div>
                                            </div>
                                            {(shareholding as any).sponsor_director && (shareholding as any).public_shareholding && (
                                                <ShareholdingChart
                                                    data={[
                                                        { name: 'Sponsor/Directors', value: Number((shareholding as any).sponsor_director), color: '#0088FE' },
                                                        { name: 'Public', value: Number((shareholding as any).public_shareholding), color: '#00C49F' },
                                                        { name: 'Institutional', value: Number((shareholding as any).institutional) || 0, color: '#FFBB28' },
                                                        { name: 'Government', value: Number((shareholding as any).government) || 0, color: '#FF8042' },
                                                        { name: 'Foreign', value: Number((shareholding as any).foreign) || 0, color: '#8884d8' },
                                                    ].filter(item => item.value > 0)}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">No shareholding data available</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Dividends Tab */}
                        <TabsContent value="dividends" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dividend History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {dividends && Array.isArray(dividends) && dividends.length > 0 ? (
                                        <div className="space-y-6">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Year</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Cash Dividend</TableHead>
                                                        <TableHead>Stock Dividend</TableHead>
                                                        <TableHead>Record Date</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {dividends.map((div: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{div.year || '-'}</TableCell>
                                                            <TableCell>{div.dividend_type || '-'}</TableCell>
                                                            <TableCell>{div.cash_dividend ? `${div.cash_dividend}%` : '-'}</TableCell>
                                                            <TableCell>{div.stock_dividend ? `${div.stock_dividend}%` : '-'}</TableCell>
                                                            <TableCell>{div.record_date || '-'}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <DividendsChart data={dividends as any} />
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">No dividend history available</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Historical Ratios Tab */}
                        <TabsContent value="ratios" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historical Financial Ratios</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {historicalRatios && Array.isArray(historicalRatios) && historicalRatios.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Year</TableHead>
                                                    <TableHead>P/E Ratio</TableHead>
                                                    <TableHead>ROE (%)</TableHead>
                                                    <TableHead>ROA (%)</TableHead>
                                                    <TableHead>Debt/Equity</TableHead>
                                                    <TableHead>EPS</TableHead>
                                                    <TableHead>NAV</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {historicalRatios.map((ratio: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{ratio.year || '-'}</TableCell>
                                                        <TableCell>{formatNumber(ratio.pe_ratio)}</TableCell>
                                                        <TableCell>{formatNumber(ratio.roe)}</TableCell>
                                                        <TableCell>{formatNumber(ratio.roa)}</TableCell>
                                                        <TableCell>{formatNumber(ratio.debt_to_equity)}</TableCell>
                                                        <TableCell>{formatNumber(ratio.eps)}</TableCell>
                                                        <TableCell>{formatNumber(ratio.nav)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">No historical ratio data available</div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="chart">
                            <Card>
                                <CardHeader>
                                    <CardTitle>5-Year Price History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {chartLoading ? (
                                        <div className="flex items-center justify-center h-96">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                                        </div>
                                    ) : Array.isArray(chart) && chart.length > 0 ? (
                                        <div className="h-[500px] w-full">
                                            <PriceChart
                                                data={chart.map(c => ({
                                                    time: c.date,
                                                    open: c.open,
                                                    high: c.high,
                                                    low: c.low,
                                                    close: c.close,
                                                    volume: c.volume || 0
                                                }))}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-96 text-muted-foreground">
                                            No chart data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
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
