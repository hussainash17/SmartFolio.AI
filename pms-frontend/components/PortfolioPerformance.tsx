import {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "./ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "./ui/tabs";
import {Button} from "./ui/button";
import {Badge} from "./ui/badge";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "./ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "./ui/table";
import {Input} from "./ui/input";
import {Label} from "./ui/label";
import {
    Activity,
    AlertCircle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    Briefcase,
    Calendar,
    DollarSign,
    Download,
    FileText,
    Info,
    Minus,
    Percent,
    Plus,
    Receipt,
    TrendingUp,
    TrendingUp as TrendingUpIcon
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import {usePortfolios} from "../hooks/usePortfolios";
import {
    useAvailableBenchmarks,
    useBenchmarkComparison,
    useBestWorstPeriods,
    useCashFlows,
    useCostBasisAnalysis,
    useCurrentValue,
    useDividendAnalysis,
    useMonthlyReturns,
    usePerformanceReturns,
    usePerformanceRiskMetrics,
    useSectorAttribution,
    useSecurityAttribution,
    useValueHistory,
} from "../hooks/usePerformance";

interface PortfolioPerformanceProps {
    portfolioId?: string;
    portfolioName?: string;
}

// Mock data for features not yet implemented via API
const MOCK_ASSET_ATTRIBUTION = [
    {
        assetClass: "Equities",
        weight: 100,
        return: 0,
        contribution: 0,
        allocationEffect: 0,
        selectionEffect: 0,
        interactionEffect: 0
    }
];

const MOCK_RETURN_DECOMPOSITION = {
    dividends: 0,
    interest: 0,
    capitalGains: 0,
    realized: 0,
    unrealized: 0,
    currencyEffect: 0
};

const MOCK_ROLLING_RETURNS: any[] = [];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function PortfolioPerformance({
                                         portfolioId: initialPortfolioId,
                                         portfolioName: initialPortfolioName
                                     }: PortfolioPerformanceProps = {}) {
    const {portfolios, loading: portfoliosLoading} = usePortfolios();
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(initialPortfolioId || null);
    const [selectedPeriod, setSelectedPeriod] = useState("1W");
    const [selectedBenchmark, setSelectedBenchmark] = useState("DSEX");
    const [showCustomBenchmark, setShowCustomBenchmark] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");

    // Set default portfolio when portfolios load
    useEffect(() => {
        if (!selectedPortfolioId && portfolios.length > 0) {
            setSelectedPortfolioId(portfolios[0].id);
        }
    }, [portfolios, selectedPortfolioId]);

    // Get the selected portfolio details
    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const currentPortfolioName = selectedPortfolio?.name || initialPortfolioName || "Select Portfolio";

    // Only fetch performance data if we have a selected portfolio
    const shouldFetchData = !!selectedPortfolioId;

    // Fetch performance data from NEW OPTIMIZED SPLIT APIs
    const {data: currentValue, isLoading: valueLoading} = useCurrentValue(selectedPortfolioId, {
        enabled: shouldFetchData
    });
    const {data: returns, isLoading: returnsLoading} = usePerformanceReturns(selectedPortfolioId, selectedPeriod, {
        enabled: shouldFetchData
    });
    const {data: riskMetrics, isLoading: riskLoading} = usePerformanceRiskMetrics(selectedPortfolioId, selectedPeriod);
    const {data: bestWorst, isLoading: bestWorstLoading} = useBestWorstPeriods(selectedPortfolioId, selectedPeriod);
    const {data: cashFlows, isLoading: cashFlowsLoading} = useCashFlows(selectedPortfolioId, selectedPeriod);

    // Fetch other performance data
    const {
        data: valueHistory,
        isLoading: valueHistoryLoading
    } = useValueHistory(
        selectedPortfolioId,
        selectedPeriod,
        selectedBenchmark,
        'daily',
        { enabled: shouldFetchData }
    );
    const {
        data: benchmarkComparison,
        isLoading: benchmarkLoading
    } = useBenchmarkComparison(selectedPortfolioId, selectedBenchmark, {
        enabled: shouldFetchData
    });
    const {data: availableBenchmarks} = useAvailableBenchmarks({
        enabled: shouldFetchData
    });
    const {data: monthlyReturns, isLoading: monthlyLoading} = useMonthlyReturns(selectedPortfolioId, undefined, {
        enabled: shouldFetchData
    });
    const {
        data: securityAttribution,
        isLoading: securityLoading
    } = useSecurityAttribution(selectedPortfolioId, selectedPeriod, 10, {
        enabled: shouldFetchData
    });
    const {
        data: sectorAttribution,
        isLoading: sectorLoading
    } = useSectorAttribution(selectedPortfolioId, selectedPeriod, selectedBenchmark, {
        enabled: shouldFetchData
    });

    // Analytics APIs for Dividend and Cost Basis
    const {
        data: dividendAnalysis,
        isLoading: dividendLoading,
        error: dividendError
    } = useDividendAnalysis(selectedPortfolioId);
    const {
        data: costBasisAnalysis,
        isLoading: costBasisLoading,
        error: costBasisError
    } = useCostBasisAnalysis(selectedPortfolioId);

    // Check if any critical data is loading (for initial page load)
    const isLoadingCriticalData = valueLoading || returnsLoading;

    // Check if any data is loading
    const isLoadingPerformanceData = valueLoading || returnsLoading || riskLoading || bestWorstLoading ||
        cashFlowsLoading || valueHistoryLoading || benchmarkLoading || monthlyLoading || securityLoading || sectorLoading;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatPercent = (percent: number) => {
        return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    };

    const formatNumber = (num: number, decimals = 2) => {
        return num.toFixed(decimals);
    };

    const getReturnColor = (value: number) => {
        return value >= 0 ? 'text-green-600' : 'text-red-600';
    };

    const getReturnBgColor = (value: number) => {
        if (value >= 5) return 'bg-green-100 text-green-800';
        if (value >= 2) return 'bg-green-50 text-green-700';
        if (value > -2) return 'bg-gray-100 text-gray-700';
        if (value > -5) return 'bg-red-50 text-red-700';
        return 'bg-red-100 text-red-800';
    };

    // Export performance report
    const handleExportReport = () => {
        // TODO: Implement PDF/Excel export
        alert('Performance report export will be implemented with backend API');
    };

    // Show loading state
    if (portfoliosLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Activity className="h-12 w-12 animate-pulse text-primary mx-auto mb-4"/>
                    <p className="text-muted-foreground">Loading portfolios...</p>
                </div>
            </div>
        );
    }

    // Show empty state if no portfolios
    if (portfolios.length === 0) {
        return (
            <div className="text-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                <h3 className="text-lg font-medium mb-2">No Portfolios Found</h3>
                <p className="text-muted-foreground">Create a portfolio to view performance analytics.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground mb-2">Performance Analytics</h1>
                    <p className="text-muted-foreground text-lg">Comprehensive portfolio performance tracking</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Portfolio Selector */}
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground"/>
                        <Select
                            value={selectedPortfolioId || ''}
                            onValueChange={setSelectedPortfolioId}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select Portfolio"/>
                            </SelectTrigger>
                            <SelectContent>
                                {portfolios.map((portfolio) => (
                                    <SelectItem key={portfolio.id} value={portfolio.id}>
                                        {portfolio.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Period Selector */}
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1W">1 Week</SelectItem>
                            <SelectItem value="1M">1 Month</SelectItem>
                            <SelectItem value="3M">3 Months</SelectItem>
                            <SelectItem value="6M">6 Months</SelectItem>
                            <SelectItem value="YTD">Year to Date</SelectItem>
                            <SelectItem value="1Y">1 Year</SelectItem>
                            <SelectItem value="3Y">3 Years</SelectItem>
                            <SelectItem value="5Y">5 Years</SelectItem>
                            <SelectItem value="ALL">Since Inception</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExportReport} className="flex items-center gap-2">
                        <Download className="h-4 w-4"/>
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Selected Portfolio Info Badge */}
            {selectedPortfolio && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-primary"/>
                                <div>
                                    <h3 className="font-semibold">{selectedPortfolio.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedPortfolio.stocks.length} holdings •
                                        Created {selectedPortfolio.createdDate}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Current Value</div>
                                <div className="text-xl font-bold">{formatCurrency(selectedPortfolio.totalValue)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Performance Summary Cards */}
            {isLoadingCriticalData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="py-8">
                                <div className="animate-pulse space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4"></div>
                                    <div className="h-8 bg-muted rounded w-1/2"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : currentValue && returns ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4"/>
                                Total Portfolio Value
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(currentValue.current_value)}</div>
                            <div className="flex items-center gap-1 text-sm mt-1">
                                <TrendingUp className={`h-3 w-3 ${getReturnColor(returns.time_weighted_return)}`}/>
                                <span className={getReturnColor(returns.time_weighted_return)}>
                  {formatPercent(returns.time_weighted_return)}
                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Since inception</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4"/>
                                Time-Weighted Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getReturnColor(returns.time_weighted_return)}`}>
                                {formatPercent(returns.time_weighted_return)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Neutralizes cash flows</p>
                            <Badge variant="outline" className="mt-2 text-xs">TWR</Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Percent className="h-4 w-4"/>
                                Money-Weighted Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getReturnColor(returns.money_weighted_return)}`}>
                                {formatPercent(returns.money_weighted_return)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Investor experience (IRR)</p>
                            <Badge variant="outline" className="mt-2 text-xs">MWR</Badge>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4"/>
                                Annualized Return
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getReturnColor(returns.annualized_return)}`}>
                                {formatPercent(returns.annualized_return)}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                    Best: {bestWorst ? formatPercent(bestWorst.best_month.return) : 'N/A'}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    Worst: {bestWorst ? formatPercent(bestWorst.worst_month.return) : 'N/A'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground">
                    No performance data available
                </div>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-8">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="benchmark">Benchmarking</TabsTrigger>
                    <TabsTrigger value="attribution">Attribution</TabsTrigger>
                    <TabsTrigger value="decomposition">Decomposition</TabsTrigger>
                    <TabsTrigger value="dividends">Dividends</TabsTrigger>
                    <TabsTrigger value="cost-basis">Cost Basis</TabsTrigger>
                    <TabsTrigger value="periods">Periods</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Portfolio Value Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio Value Over Time</CardTitle>
                            <CardDescription>Track your portfolio growth compared to benchmark</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={valueHistory?.data.map(d => ({
                                    date: new Date(d.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        year: '2-digit'
                                    }),
                                    portfolio: d.portfolio_value,
                                    benchmark: d.benchmark_value || 0,
                                    portfolioReturn: d.portfolio_cumulative_return,
                                    benchmarkReturn: d.benchmark_cumulative_return || 0
                                })) || []}>
                                    <defs>
                                        <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                    <XAxis dataKey="date"/>
                                    <YAxis tickFormatter={(value) => formatCurrency(value)}/>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        labelStyle={{color: '#000'}}
                                    />
                                    <Legend/>
                                    <Area
                                        type="monotone"
                                        dataKey="portfolio"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorPortfolio)"
                                        name="Portfolio Value"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="benchmark"
                                        stroke="#10b981"
                                        fillOpacity={1}
                                        fill="url(#colorBenchmark)"
                                        name={`Benchmark (${valueHistory?.benchmark_name || 'DSEX'})`}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Best & Worst Periods</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Best Month:</span>
                                    <div className="text-right">
                                        <div
                                            className="font-medium text-green-600">{formatPercent(bestWorst?.best_month.return || 0)}</div>
                                        <div
                                            className="text-xs text-muted-foreground">{bestWorst?.best_month.period || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Worst Month:</span>
                                    <div className="text-right">
                                        <div
                                            className="font-medium text-red-600">{formatPercent(bestWorst?.worst_month.return || 0)}</div>
                                        <div
                                            className="text-xs text-muted-foreground">{bestWorst?.worst_month.period || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Best Quarter:</span>
                                    <div className="text-right">
                                        <div className="font-medium text-green-600">N/A</div>
                                        <div className="text-xs text-muted-foreground">Coming soon</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Worst Quarter:</span>
                                    <div className="text-right">
                                        <div className="font-medium text-red-600">N/A</div>
                                        <div className="text-xs text-muted-foreground">Coming soon</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Cash Flows</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Plus className="h-3 w-3"/>
                    Net Contributions:
                  </span>
                                    <span
                                        className="font-medium text-green-600">{formatCurrency(cashFlows?.net_contributions || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Minus className="h-3 w-3"/>
                    Net Withdrawals:
                  </span>
                                    <span
                                        className="font-medium text-red-600">{formatCurrency(cashFlows?.net_withdrawals || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Net Cash Flow:</span>
                                    <span className="font-bold">
                    {formatCurrency(cashFlows?.net_flow || 0)}
                  </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Portfolio Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3"/>
                    Inception Date:
                  </span>
                                    <span className="font-medium">{currentValue?.as_of_date || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Cost:</span>
                                    <span className="font-medium">N/A</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Current Value:</span>
                                    <span
                                        className="font-medium">{formatCurrency(currentValue?.current_value || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Total Gain/Loss:</span>
                                    <span className={`font-bold ${getReturnColor(returns?.time_weighted_return || 0)}`}>
                    {formatPercent(returns?.time_weighted_return || 0)}
                  </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Monthly Returns Heatmap */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Returns</CardTitle>
                            <CardDescription>Visual representation of month-by-month performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyReturns?.monthly_returns.map(m => ({
                                    month: m.month,
                                    return: m.return_value
                                })) || []}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                    <XAxis dataKey="month"/>
                                    <YAxis tickFormatter={(value) => `${value}%`}/>
                                    <Tooltip formatter={(value: number) => `${value}%`}/>
                                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3"/>
                                    <Bar dataKey="return" name="Monthly Return">
                                        {(monthlyReturns?.monthly_returns || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`}
                                                  fill={entry.return_value >= 0 ? '#10b981' : '#ef4444'}/>
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Benchmarking Tab */}
                <TabsContent value="benchmark" className="space-y-6">
                    {/* Benchmark Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Benchmark Configuration</CardTitle>
                            <CardDescription>Select or create a custom benchmark for comparison</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Label>Primary Benchmark</Label>
                                    <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
                                        <SelectTrigger>
                                            <SelectValue/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(availableBenchmarks?.benchmarks || []).map((bm) => (
                                                <SelectItem key={bm.id} value={bm.id}>
                                                    {bm.name} ({bm.ticker})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCustomBenchmark(!showCustomBenchmark)}
                                    className="mt-6"
                                >
                                    {showCustomBenchmark ? 'Use Standard' : 'Create Custom'}
                                </Button>
                            </div>

                            {showCustomBenchmark && (
                                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                    <h4 className="font-medium">Custom Benchmark Builder</h4>
                                    <p className="text-sm text-muted-foreground">Mix multiple benchmarks to create your
                                        ideal comparison</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(availableBenchmarks?.benchmarks || []).slice(0, 4).map((bm) => (
                                            <div key={bm.id} className="flex items-center gap-2">
                                                <Label className="flex-1 text-sm">{bm.name}:</Label>
                                                <Input type="number" placeholder="0" className="w-20"/>
                                                <span className="text-sm text-muted-foreground">%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <Button size="sm" className="w-full">Apply Custom Benchmark</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Comparison Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Portfolio vs. Benchmark Returns</CardTitle>
                            <CardDescription>Cumulative return comparison over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={valueHistory?.data.map(d => ({
                                    date: new Date(d.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        year: '2-digit'
                                    }),
                                    portfolioReturn: d.portfolio_cumulative_return,
                                    benchmarkReturn: d.benchmark_cumulative_return || 0
                                })) || []}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                    <XAxis dataKey="date"/>
                                    <YAxis tickFormatter={(value) => `${value}%`}/>
                                    <Tooltip formatter={(value: number) => `${value}%`}/>
                                    <Legend/>
                                    <Line
                                        type="monotone"
                                        dataKey="portfolioReturn"
                                        stroke="#3b82f6"
                                        name="Portfolio"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="benchmarkReturn"
                                        stroke="#10b981"
                                        name={benchmarkComparison?.benchmark_name || 'DSEX'}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Benchmark Comparison Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Comparison</CardTitle>
                            <CardDescription>Detailed breakdown across different time periods</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead className="text-right">Portfolio</TableHead>
                                        <TableHead className="text-right">Benchmark</TableHead>
                                        <TableHead className="text-right">Relative</TableHead>
                                        <TableHead className="text-right">Alpha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(benchmarkComparison?.comparison || []).map((row) => (
                                        <TableRow key={row.period}>
                                            <TableCell className="font-medium">{row.period}</TableCell>
                                            <TableCell
                                                className={`text-right font-medium ${getReturnColor(row.portfolio_return)}`}>
                                                {formatPercent(row.portfolio_return)}
                                            </TableCell>
                                            <TableCell className={`text-right ${getReturnColor(row.benchmark_return)}`}>
                                                {formatPercent(row.benchmark_return)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium ${getReturnColor(row.relative_return)}`}>
                                                {formatPercent(row.relative_return)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={row.alpha >= 0 ? "default" : "destructive"}>
                                                    {formatPercent(row.alpha)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Alpha Over Time */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rolling Alpha (3M)</CardTitle>
                            <CardDescription>Excess return relative to benchmark over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={valueHistory?.data.map(d => ({
                                    date: new Date(d.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        year: '2-digit'
                                    }),
                                    alpha: (d.portfolio_cumulative_return || 0) - (d.benchmark_cumulative_return || 0)
                                })) || []}>
                                    <defs>
                                        <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                    <XAxis dataKey="date"/>
                                    <YAxis tickFormatter={(value) => `${value}%`}/>
                                    <Tooltip formatter={(value: number) => `${formatNumber(value)}%`}/>
                                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3"/>
                                    <Area
                                        type="monotone"
                                        dataKey="alpha"
                                        stroke="#8b5cf6"
                                        fillOpacity={1}
                                        fill="url(#colorAlpha)"
                                        name="Alpha"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Attribution Tab */}
                <TabsContent value="attribution" className="space-y-6">
                    {/* Asset Class Attribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Class Attribution</CardTitle>
                            <CardDescription>Performance contribution by asset class</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Asset Class</TableHead>
                                                <TableHead className="text-right">Weight</TableHead>
                                                <TableHead className="text-right">Return</TableHead>
                                                <TableHead className="text-right">Contribution</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {MOCK_ASSET_ATTRIBUTION.map((asset) => (
                                                <TableRow key={asset.assetClass}>
                                                    <TableCell className="font-medium">{asset.assetClass}</TableCell>
                                                    <TableCell className="text-right">{asset.weight}%</TableCell>
                                                    <TableCell className={`text-right ${getReturnColor(asset.return)}`}>
                                                        {formatPercent(asset.return)}
                                                    </TableCell>
                                                    <TableCell
                                                        className={`text-right font-medium ${getReturnColor(asset.contribution)}`}>
                                                        {formatPercent(asset.contribution)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={MOCK_ASSET_ATTRIBUTION}
                                                dataKey="contribution"
                                                nameKey="assetClass"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({
                                                            assetClass,
                                                            contribution
                                                        }) => `${assetClass}: ${formatPercent(contribution)}`}
                                            >
                                                {MOCK_ASSET_ATTRIBUTION.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value: number) => formatPercent(value)}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sector Attribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sector Attribution</CardTitle>
                            <CardDescription>Performance breakdown by sector within equities</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sector</TableHead>
                                        <TableHead className="text-right">Weight</TableHead>
                                        <TableHead className="text-right">Benchmark</TableHead>
                                        <TableHead className="text-right">Return</TableHead>
                                        <TableHead className="text-right">BM Return</TableHead>
                                        <TableHead className="text-right">Contribution</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(sectorAttribution?.attribution || []).map((sector) => (
                                        <TableRow key={sector.sector}>
                                            <TableCell className="font-medium">{sector.sector}</TableCell>
                                            <TableCell className="text-right">{sector.weight}%</TableCell>
                                            <TableCell
                                                className="text-right text-muted-foreground">{sector.benchmark_weight}%</TableCell>
                                            <TableCell className={`text-right ${getReturnColor(sector.return)}`}>
                                                {formatPercent(sector.return)}
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatPercent(sector.benchmark_return)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium ${getReturnColor(sector.contribution)}`}>
                                                {formatPercent(sector.contribution)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-6">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={sectorAttribution?.attribution || []}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                        <XAxis dataKey="sector" angle={-45} textAnchor="end" height={100}/>
                                        <YAxis tickFormatter={(value) => `${value}%`}/>
                                        <Tooltip formatter={(value: number) => formatPercent(value)}/>
                                        <Legend/>
                                        <Bar dataKey="contribution" name="Contribution" fill="#3b82f6"/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attribution Effects */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Attribution Analysis</CardTitle>
                            <CardDescription>Allocation effect vs. Selection effect vs. Interaction</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="border rounded-lg p-4 bg-muted/30">
                                    <div className="flex items-start gap-2 mb-2">
                                        <Info className="h-4 w-4 text-muted-foreground mt-0.5"/>
                                        <div className="text-sm text-muted-foreground">
                                            <p><strong>Allocation Effect:</strong> Impact of
                                                overweighting/underweighting sectors vs. benchmark</p>
                                            <p className="mt-1"><strong>Selection Effect:</strong> Impact of
                                                stock-picking skill within sectors</p>
                                            <p className="mt-1"><strong>Interaction Effect:</strong> Combined impact of
                                                allocation and selection decisions</p>
                                        </div>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Sector</TableHead>
                                            <TableHead className="text-right">Allocation</TableHead>
                                            <TableHead className="text-right">Selection</TableHead>
                                            <TableHead className="text-right">Interaction</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(sectorAttribution?.attribution || []).map((sector) => (
                                            <TableRow key={sector.sector}>
                                                <TableCell className="font-medium">{sector.sector}</TableCell>
                                                <TableCell
                                                    className={`text-right ${getReturnColor(sector.allocation_effect)}`}>
                                                    {formatPercent(sector.allocation_effect)}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right ${getReturnColor(sector.selection_effect)}`}>
                                                    {formatPercent(sector.selection_effect)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatPercent(sector.allocation_effect + sector.selection_effect - sector.contribution)}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-medium ${getReturnColor(sector.contribution)}`}>
                                                    {formatPercent(sector.contribution)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Contributors & Detractors */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowUpRight className="h-5 w-5 text-green-600"/>
                                    Top Contributors
                                </CardTitle>
                                <CardDescription>Securities that added the most value</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">Return</TableHead>
                                            <TableHead className="text-right">Contribution</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(securityAttribution?.top_contributors || []).map((stock) => (
                                            <TableRow key={stock.symbol}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{stock.symbol}</div>
                                                        <div
                                                            className="text-xs text-muted-foreground">{stock.name}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatPercent(stock.return)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {formatPercent(stock.contribution)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowDownRight className="h-5 w-5 text-red-600"/>
                                    Top Detractors
                                </CardTitle>
                                <CardDescription>Securities that reduced portfolio value</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">Return</TableHead>
                                            <TableHead className="text-right">Impact</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(securityAttribution?.top_detractors || []).map((stock) => (
                                            <TableRow key={stock.symbol}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{stock.symbol}</div>
                                                        <div
                                                            className="text-xs text-muted-foreground">{stock.name}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-red-600">
                                                    {formatPercent(stock.return)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-red-600">
                                                    {formatPercent(stock.contribution)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Decomposition Tab */}
                <TabsContent value="decomposition" className="space-y-6">
                    {/* Return Sources */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Return Sources</CardTitle>
                                <CardDescription>Breakdown of income vs. capital gains</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Dividends</span>
                                        <span className="text-lg font-bold text-green-600">
                      {formatPercent(MOCK_RETURN_DECOMPOSITION.dividends)}
                    </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Interest Income</span>
                                        <span className="text-lg font-bold text-green-600">
                      {formatPercent(MOCK_RETURN_DECOMPOSITION.interest)}
                    </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Capital Gains</span>
                                        <span className="text-lg font-bold text-blue-600">
                      {formatPercent(MOCK_RETURN_DECOMPOSITION.capitalGains)}
                    </span>
                                    </div>
                                    <div
                                        className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
                                        <span className="font-bold">Total Return</span>
                                        <span className="text-xl font-bold text-primary">
                      {formatPercent(
                          MOCK_RETURN_DECOMPOSITION.dividends +
                          MOCK_RETURN_DECOMPOSITION.interest +
                          MOCK_RETURN_DECOMPOSITION.capitalGains
                      )}
                    </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Return Composition</CardTitle>
                                <CardDescription>Visual breakdown of return sources</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                {name: 'Dividends', value: MOCK_RETURN_DECOMPOSITION.dividends},
                                                {name: 'Interest', value: MOCK_RETURN_DECOMPOSITION.interest},
                                                {name: 'Capital Gains', value: MOCK_RETURN_DECOMPOSITION.capitalGains}
                                            ]}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({name, value}) => `${name}: ${formatPercent(value)}`}
                                        >
                                            <Cell fill="#10b981"/>
                                            <Cell fill="#3b82f6"/>
                                            <Cell fill="#8b5cf6"/>
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatPercent(value)}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Realized vs Unrealized */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Realized vs. Unrealized Gains</CardTitle>
                            <CardDescription>Split between locked-in and paper gains</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="space-y-4">
                                        <div
                                            className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Realized Gains</div>
                                                <div className="text-xs text-muted-foreground mt-1">Locked in through
                                                    sales
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-green-600">
                                                {formatPercent(MOCK_RETURN_DECOMPOSITION.realized)}
                                            </div>
                                        </div>
                                        <div
                                            className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Unrealized Gains</div>
                                                <div className="text-xs text-muted-foreground mt-1">Paper gains (current
                                                    holdings)
                                                </div>
                                            </div>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {formatPercent(MOCK_RETURN_DECOMPOSITION.unrealized)}
                                            </div>
                                        </div>
                                        {MOCK_RETURN_DECOMPOSITION.currencyEffect !== 0 && (
                                            <div
                                                className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Currency Effect</div>
                                                    <div className="text-xs text-muted-foreground mt-1">FX impact on
                                                        returns
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-bold text-amber-600">
                                                    {formatPercent(MOCK_RETURN_DECOMPOSITION.currencyEffect)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart
                                            data={[
                                                {
                                                    name: 'Gains',
                                                    Realized: MOCK_RETURN_DECOMPOSITION.realized,
                                                    Unrealized: MOCK_RETURN_DECOMPOSITION.unrealized
                                                }
                                            ]}
                                            layout="vertical"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                            <XAxis type="number" tickFormatter={(value) => `${value}%`}/>
                                            <YAxis type="category" dataKey="name"/>
                                            <Tooltip formatter={(value: number) => formatPercent(value)}/>
                                            <Legend/>
                                            <Bar dataKey="Realized" fill="#10b981"/>
                                            <Bar dataKey="Unrealized" fill="#3b82f6"/>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Income Generation */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Income Generation</CardTitle>
                            <CardDescription>Track dividend and interest income over time</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                                <p className="text-muted-foreground">
                                    Detailed income tracking and forecasting will be available once API integration is
                                    complete.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Dividends Tab */}
                <TabsContent value="dividends" className="space-y-6">
                    {/* Dividend Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUpIcon className="h-4 w-4 text-green-600"/>
                                    Annual Dividends
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {dividendLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : dividendError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(dividendAnalysis?.total_annual_dividends || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Total annual income</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Percent className="h-4 w-4 text-blue-600"/>
                                    Dividend Yield
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {dividendLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : dividendError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatPercent(dividendAnalysis?.portfolio_dividend_yield || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Portfolio yield</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-purple-600"/>
                                    Quarterly Income
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {dividendLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : dividendError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(dividendAnalysis?.quarterly_income || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Expected per quarter</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-orange-600"/>
                                    Monthly Income
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {dividendLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : dividendError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(dividendAnalysis?.monthly_income || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Expected per month</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Dividend Stocks Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Dividend-Paying Holdings</CardTitle>
                            <CardDescription>Stocks in your portfolio that pay dividends</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {dividendLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Activity className="h-8 w-8 animate-spin text-muted-foreground"/>
                                </div>
                            ) : dividendError ? (
                                <div className="text-center py-12">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                                    <p className="text-muted-foreground">
                                        {dividendError?.status === 404
                                            ? "Portfolio not found. Please select a valid portfolio."
                                            : "Unable to load dividend analysis. Please try again."}
                                    </p>
                                </div>
                            ) : dividendAnalysis?.dividend_stocks && dividendAnalysis.dividend_stocks.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead>Sector</TableHead>
                                            <TableHead className="text-right">Position Value</TableHead>
                                            <TableHead className="text-right">Dividend Yield</TableHead>
                                            <TableHead className="text-right">Annual Dividend</TableHead>
                                            <TableHead className="text-right">Quarterly</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dividendAnalysis.dividend_stocks.map((stock: any) => (
                                            <TableRow key={stock.stock_id}>
                                                <TableCell className="font-medium">{stock.symbol}</TableCell>
                                                <TableCell>{stock.name}</TableCell>
                                                <TableCell>{stock.sector || 'N/A'}</TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(stock.position_value)}</TableCell>
                                                <TableCell
                                                    className="text-right">{formatPercent(stock.dividend_yield)}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {formatCurrency(stock.annual_dividend)}
                                                </TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(stock.quarterly_dividend)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12">
                                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                                    <p className="text-muted-foreground">No dividend-paying stocks in this portfolio</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dividend Growth Estimate */}
                    {dividendAnalysis && !dividendError && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Dividend Growth Estimate</CardTitle>
                                <CardDescription>Projected annual dividend growth rate</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl font-bold text-green-600">
                                        {formatPercent(dividendAnalysis.dividend_growth_estimate || 0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">
                                            Estimated annual dividend growth rate based on historical trends and sector
                                            analysis
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Cost Basis Tab */}
                <TabsContent value="cost-basis" className="space-y-6">
                    {/* Cost Basis Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-blue-600"/>
                                    Total Cost Basis
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {costBasisLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : costBasisError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(costBasisAnalysis?.total_cost_basis || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Total invested</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <TrendingUpIcon className="h-4 w-4 text-green-600"/>
                                    Current Value
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {costBasisLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : costBasisError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(costBasisAnalysis?.total_current_value || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Current market value</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-purple-600"/>
                                    Unrealized Gains
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`text-2xl font-bold ${(costBasisAnalysis?.total_unrealized_gains || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {costBasisLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : costBasisError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(costBasisAnalysis?.total_unrealized_gains || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Unrealized P&L</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-orange-600"/>
                                    Tax Liability
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">
                                    {costBasisLoading ? (
                                        <Activity className="h-5 w-5 animate-pulse"/>
                                    ) : costBasisError ? (
                                        <span className="text-muted-foreground">N/A</span>
                                    ) : (
                                        formatCurrency(costBasisAnalysis?.estimated_tax_liability || 0)
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Estimated (20% rate)</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Stock Analysis Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cost Basis by Stock</CardTitle>
                            <CardDescription>Detailed cost basis analysis for each holding</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {costBasisLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Activity className="h-8 w-8 animate-spin text-muted-foreground"/>
                                </div>
                            ) : costBasisError ? (
                                <div className="text-center py-12">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                                    <p className="text-muted-foreground">
                                        {costBasisError?.status === 404
                                            ? "Portfolio not found. Please select a valid portfolio."
                                            : "Unable to load cost basis analysis. Please try again."}
                                    </p>
                                </div>
                            ) : costBasisAnalysis?.stock_analysis && Object.keys(costBasisAnalysis.stock_analysis).length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Company</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Avg Cost</TableHead>
                                            <TableHead className="text-right">Total Cost</TableHead>
                                            <TableHead className="text-right">Current Value</TableHead>
                                            <TableHead className="text-right">Unrealized P&L</TableHead>
                                            <TableHead className="text-right">P&L %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.values(costBasisAnalysis.stock_analysis).map((stock: any) => (
                                            <TableRow key={stock.symbol}>
                                                <TableCell className="font-medium">{stock.symbol}</TableCell>
                                                <TableCell>{stock.name}</TableCell>
                                                <TableCell className="text-right">{stock.current_quantity}</TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(stock.average_cost)}</TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(stock.total_cost)}</TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(stock.current_value)}</TableCell>
                                                <TableCell
                                                    className={`text-right font-medium ${stock.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(stock.unrealized_pnl)}
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right ${stock.unrealized_pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatPercent(stock.unrealized_pnl_percent)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12">
                                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3"/>
                                    <p className="text-muted-foreground">No cost basis data available</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tax Loss Harvesting Opportunities */}
                    {costBasisAnalysis?.tax_loss_opportunities && costBasisAnalysis.tax_loss_opportunities.length > 0 && (
                        <Card className="border-orange-200 bg-orange-50/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-orange-600"/>
                                    Tax Loss Harvesting Opportunities
                                </CardTitle>
                                <CardDescription>Stocks with significant unrealized losses that could offset
                                    gains</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead className="text-right">Unrealized Loss</TableHead>
                                            <TableHead className="text-right">Current Value</TableHead>
                                            <TableHead className="text-right">Tax Savings Estimate</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {costBasisAnalysis.tax_loss_opportunities.map((opp: any) => (
                                            <TableRow key={opp.symbol}>
                                                <TableCell className="font-medium">{opp.symbol}</TableCell>
                                                <TableCell className="text-right text-red-600 font-medium">
                                                    {formatCurrency(opp.unrealized_loss)}
                                                </TableCell>
                                                <TableCell
                                                    className="text-right">{formatCurrency(opp.current_value)}</TableCell>
                                                <TableCell className="text-right font-medium text-green-600">
                                                    {formatCurrency(opp.tax_savings_estimate)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Periods Tab */}
                <TabsContent value="periods" className="space-y-6">
                    {/* Period Selection & Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance by Period</CardTitle>
                            <CardDescription>Analyze returns across different time horizons</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Period</TableHead>
                                        <TableHead className="text-right">Portfolio Return</TableHead>
                                        <TableHead className="text-right">Benchmark Return</TableHead>
                                        <TableHead className="text-right">Relative Return</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(benchmarkComparison?.comparison || []).map((row) => (
                                        <TableRow key={row.period}>
                                            <TableCell className="font-medium">{row.period}</TableCell>
                                            <TableCell
                                                className={`text-right font-bold ${getReturnColor(row.portfolio_return)}`}>
                                                {formatPercent(row.portfolio_return)}
                                            </TableCell>
                                            <TableCell className={`text-right ${getReturnColor(row.benchmark_return)}`}>
                                                {formatPercent(row.benchmark_return)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right font-medium ${getReturnColor(row.relative_return)}`}>
                                                {formatPercent(row.relative_return)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {row.relative_return >= 0 ? (
                                                    <Badge variant="default"
                                                           className="bg-green-600">Outperforming</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Underperforming</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Rolling Returns */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Rolling Returns Analysis</CardTitle>
                            <CardDescription>Track performance consistency over rolling time windows</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={MOCK_ROLLING_RETURNS}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3}/>
                                    <XAxis dataKey="period"/>
                                    <YAxis tickFormatter={(value) => `${value}%`}/>
                                    <Tooltip formatter={(value: number) => formatPercent(value)}/>
                                    <Legend/>
                                    <Line type="monotone" dataKey="rolling3M" stroke="#3b82f6" name="3 Month Rolling"
                                          strokeWidth={2}/>
                                    <Line type="monotone" dataKey="rolling6M" stroke="#10b981" name="6 Month Rolling"
                                          strokeWidth={2}/>
                                    <Line type="monotone" dataKey="rolling12M" stroke="#8b5cf6" name="12 Month Rolling"
                                          strokeWidth={2}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Custom Period Selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Period Analysis</CardTitle>
                            <CardDescription>Select any date range for detailed analysis</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Start Date</Label>
                                    <Input type="date" className="mt-1"/>
                                </div>
                                <div>
                                    <Label>End Date</Label>
                                    <Input type="date" className="mt-1"/>
                                </div>
                            </div>
                            <Button className="w-full mt-4">Analyze Custom Period</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Performance Reports</CardTitle>
                            <CardDescription>Generate and export comprehensive performance reports</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Report Templates */}
                            <div>
                                <h3 className="font-medium mb-3">Report Templates</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div
                                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-primary mt-0.5"/>
                                            <div className="flex-1">
                                                <h4 className="font-medium">Monthly Performance Summary</h4>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Overview, returns, attribution, and top holdings
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <Button size="sm" variant="outline">PDF</Button>
                                                    <Button size="sm" variant="outline">Excel</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-primary mt-0.5"/>
                                            <div className="flex-1">
                                                <h4 className="font-medium">Quarterly Review</h4>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Detailed quarterly analysis with benchmarking
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <Button size="sm" variant="outline">PDF</Button>
                                                    <Button size="sm" variant="outline">Excel</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-primary mt-0.5"/>
                                            <div className="flex-1">
                                                <h4 className="font-medium">Annual Performance Report</h4>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Comprehensive year-end review with tax summary
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <Button size="sm" variant="outline">PDF</Button>
                                                    <Button size="sm" variant="outline">Excel</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-primary mt-0.5"/>
                                            <div className="flex-1">
                                                <h4 className="font-medium">Attribution Analysis</h4>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Deep dive into what drove your returns
                                                </p>
                                                <div className="flex gap-2 mt-3">
                                                    <Button size="sm" variant="outline">PDF</Button>
                                                    <Button size="sm" variant="outline">Excel</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Scheduled Reports */}
                            <div>
                                <h3 className="font-medium mb-3">Scheduled Delivery</h3>
                                <div className="border rounded-lg p-4 bg-muted/30">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Set up automatic report delivery to your email
                                    </p>
                                    <div className="space-y-3">
                                        <div
                                            className="flex items-center justify-between p-3 bg-background rounded border">
                                            <div>
                                                <div className="font-medium text-sm">Monthly Summary</div>
                                                <div className="text-xs text-muted-foreground">Every 1st of the month
                                                </div>
                                            </div>
                                            <Badge variant="secondary">Active</Badge>
                                        </div>
                                        <div
                                            className="flex items-center justify-between p-3 bg-background rounded border">
                                            <div>
                                                <div className="font-medium text-sm">Quarterly Review</div>
                                                <div className="text-xs text-muted-foreground">Every quarter end</div>
                                            </div>
                                            <Badge variant="outline">Inactive</Badge>
                                        </div>
                                    </div>
                                    <Button variant="outline" className="w-full mt-4">
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Add Scheduled Report
                                    </Button>
                                </div>
                            </div>

                            {/* Report History */}
                            <div>
                                <h3 className="font-medium mb-3">Report History</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Report</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Generated</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Monthly Performance</TableCell>
                                            <TableCell>Oct 2024</TableCell>
                                            <TableCell>Nov 1, 2024</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost">
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Quarterly Review</TableCell>
                                            <TableCell>Q3 2024</TableCell>
                                            <TableCell>Oct 1, 2024</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost">
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Monthly Performance</TableCell>
                                            <TableCell>Sep 2024</TableCell>
                                            <TableCell>Oct 1, 2024</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="ghost">
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
