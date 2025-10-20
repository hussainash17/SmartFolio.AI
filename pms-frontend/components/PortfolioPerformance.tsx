import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  TrendingUp, 
  TrendingDown, 
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Info,
  Calendar,
  Target,
  DollarSign,
  Percent,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  FileText,
  Briefcase
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  ReferenceLine
} from "recharts";
import { usePortfolios } from "../hooks/usePortfolios";

interface PortfolioPerformanceProps {
  portfolioId?: string;
  portfolioName?: string;
}

// Enhanced dummy data for comprehensive performance analytics
const PERFORMANCE_DATA = {
  summary: {
    totalValue: 1250000,
    totalCost: 1125000,
    cumulativeReturn: 125000,
    cumulativeReturnPercent: 11.11,
    timeWeightedReturn: 12.5,
    moneyWeightedReturn: 11.8,
    annualizedReturn: 15.2,
    bestMonth: { period: "Mar 2024", return: 8.5 },
    worstMonth: { period: "Sep 2024", return: -3.2 },
    bestQuarter: { period: "Q1 2024", return: 17.2 },
    worstQuarter: { period: "Q3 2024", return: -1.8 },
    netContributions: 50000,
    netWithdrawals: 25000,
    inceptionDate: "2023-01-01"
  },
  
  // Portfolio value over time with benchmark
  valueOverTime: [
    { date: "Jan 23", portfolio: 1000000, benchmark: 1000000, portfolioReturn: 0, benchmarkReturn: 0 },
    { date: "Feb 23", portfolio: 1050000, benchmark: 1020000, portfolioReturn: 5.0, benchmarkReturn: 2.0 },
    { date: "Mar 23", portfolio: 1139250, benchmark: 1050000, portfolioReturn: 13.9, benchmarkReturn: 5.0 },
    { date: "Apr 23", portfolio: 1150000, benchmark: 1080000, portfolioReturn: 15.0, benchmarkReturn: 8.0 },
    { date: "May 23", portfolio: 1180000, benchmark: 1100000, portfolioReturn: 18.0, benchmarkReturn: 10.0 },
    { date: "Jun 23", portfolio: 1200000, benchmark: 1120000, portfolioReturn: 20.0, benchmarkReturn: 12.0 },
    { date: "Jul 23", portfolio: 1220000, benchmark: 1150000, portfolioReturn: 22.0, benchmarkReturn: 15.0 },
    { date: "Aug 23", portfolio: 1210000, benchmark: 1140000, portfolioReturn: 21.0, benchmarkReturn: 14.0 },
    { date: "Sep 23", portfolio: 1171280, benchmark: 1120000, portfolioReturn: 17.1, benchmarkReturn: 12.0 },
    { date: "Oct 23", portfolio: 1250000, benchmark: 1180000, portfolioReturn: 25.0, benchmarkReturn: 18.0 }
  ],

  // Benchmark comparison table
  benchmarkComparison: [
    { period: "1W", portfolio: 1.2, benchmark: 0.9, relative: 0.3, alpha: 0.3 },
    { period: "1M", portfolio: 2.3, benchmark: 1.9, relative: 0.4, alpha: 0.4 },
    { period: "3M", portfolio: 5.4, benchmark: 4.9, relative: 0.5, alpha: 0.5 },
    { period: "6M", portfolio: 8.7, benchmark: 7.2, relative: 1.5, alpha: 1.5 },
    { period: "YTD", portfolio: 12.5, benchmark: 10.8, relative: 1.7, alpha: 1.7 },
    { period: "1Y", portfolio: 15.2, benchmark: 12.3, relative: 2.9, alpha: 2.9 },
    { period: "3Y", portfolio: 42.5, benchmark: 35.2, relative: 7.3, alpha: 7.3 },
    { period: "5Y", portfolio: 78.3, benchmark: 65.8, relative: 12.5, alpha: 12.5 }
  ],

  // Asset class attribution
  assetAttribution: [
    { 
      assetClass: "Equities", 
      weight: 60, 
      return: 9.2, 
      contribution: 5.5,
      allocationEffect: 0.8,
      selectionEffect: 1.2,
      interactionEffect: 0.1
    },
    { 
      assetClass: "Fixed Income", 
      weight: 30, 
      return: 2.4, 
      contribution: 0.7,
      allocationEffect: 0.2,
      selectionEffect: 0.1,
      interactionEffect: 0.0
    },
    { 
      assetClass: "Cash", 
      weight: 10, 
      return: 0.5, 
      contribution: 0.05,
      allocationEffect: 0.0,
      selectionEffect: 0.0,
      interactionEffect: 0.0
    }
  ],

  // Sector attribution (for equities)
  sectorAttribution: [
    { 
      sector: "Technology", 
      weight: 25, 
      benchmarkWeight: 22,
      return: 15.2, 
      benchmarkReturn: 12.8,
      contribution: 3.8,
      allocationEffect: 0.5,
      selectionEffect: 0.8
    },
    { 
      sector: "Healthcare", 
      weight: 15, 
      benchmarkWeight: 14,
      return: 8.5, 
      benchmarkReturn: 7.2,
      contribution: 1.28,
      allocationEffect: 0.1,
      selectionEffect: 0.2
    },
    { 
      sector: "Financials", 
      weight: 20, 
      benchmarkWeight: 18,
      return: 6.2, 
      benchmarkReturn: 5.8,
      contribution: 1.24,
      allocationEffect: 0.2,
      selectionEffect: 0.1
    },
    { 
      sector: "Consumer", 
      weight: 12, 
      benchmarkWeight: 15,
      return: 4.8, 
      benchmarkReturn: 5.2,
      contribution: 0.58,
      allocationEffect: -0.2,
      selectionEffect: -0.1
    },
    { 
      sector: "Industrials", 
      weight: 10, 
      benchmarkWeight: 12,
      return: 7.1, 
      benchmarkReturn: 6.5,
      contribution: 0.71,
      allocationEffect: -0.1,
      selectionEffect: 0.1
    },
    { 
      sector: "Energy", 
      weight: 8, 
      benchmarkWeight: 10,
      return: -2.5, 
      benchmarkReturn: -1.8,
      contribution: -0.2,
      allocationEffect: -0.1,
      selectionEffect: -0.1
    }
  ],

  // Top contributors and detractors
  topContributors: [
    { symbol: "AAPL", name: "Apple Inc.", contribution: 2.5, return: 25.3, weight: 8.5 },
    { symbol: "MSFT", name: "Microsoft Corp.", contribution: 2.1, return: 22.8, weight: 7.2 },
    { symbol: "GOOGL", name: "Alphabet Inc.", contribution: 1.8, return: 18.5, weight: 6.5 },
    { symbol: "NVDA", name: "NVIDIA Corp.", contribution: 1.6, return: 45.2, weight: 3.8 },
    { symbol: "AMZN", name: "Amazon.com Inc.", contribution: 1.3, return: 15.7, weight: 5.2 },
    { symbol: "META", name: "Meta Platforms", contribution: 1.1, return: 28.4, weight: 3.5 },
    { symbol: "TSLA", name: "Tesla Inc.", contribution: 0.9, return: 32.1, weight: 2.8 },
    { symbol: "JPM", name: "JPMorgan Chase", contribution: 0.8, return: 12.5, weight: 4.2 },
    { symbol: "V", name: "Visa Inc.", contribution: 0.7, return: 18.2, weight: 3.1 },
    { symbol: "JNJ", name: "Johnson & Johnson", contribution: 0.6, return: 8.9, weight: 4.8 }
  ],
  
  topDetractors: [
    { symbol: "XOM", name: "Exxon Mobil Corp.", contribution: -0.8, return: -8.5, weight: 5.2 },
    { symbol: "CVX", name: "Chevron Corp.", contribution: -0.6, return: -7.2, weight: 4.1 },
    { symbol: "BA", name: "Boeing Co.", contribution: -0.5, return: -12.3, weight: 3.2 },
    { symbol: "DIS", name: "Walt Disney Co.", contribution: -0.4, return: -6.8, weight: 3.8 },
    { symbol: "INTC", name: "Intel Corp.", contribution: -0.3, return: -15.2, weight: 2.1 }
  ],

  // Return decomposition
  returnDecomposition: {
    dividends: 2.5,
    interest: 0.8,
    capitalGains: 9.2,
    realized: 6.8,
    unrealized: 5.7,
    currencyEffect: 0.2
  },

  // Monthly returns heatmap
  monthlyReturns: [
    { month: "Jan", return: 2.1 },
    { month: "Feb", return: 5.0 },
    { month: "Mar", return: 8.5 },
    { month: "Apr", return: 0.9 },
    { month: "May", return: 2.6 },
    { month: "Jun", return: 1.7 },
    { month: "Jul", return: 1.7 },
    { month: "Aug", return: -0.8 },
    { month: "Sep", return: -3.2 },
    { month: "Oct", return: 6.7 },
    { month: "Nov", return: 3.2 },
    { month: "Dec", return: 4.1 }
  ],

  // Rolling returns
  rollingReturns: [
    { period: "Jan-Mar", rolling3M: 5.4, rolling6M: 8.7, rolling12M: 15.2 },
    { period: "Feb-Apr", rolling3M: 4.8, rolling6M: 8.2, rolling12M: 14.8 },
    { period: "Mar-May", rolling3M: 5.2, rolling6M: 8.5, rolling12M: 15.0 },
    { period: "Apr-Jun", rolling3M: 4.1, rolling6M: 7.8, rolling12M: 14.2 },
    { period: "May-Jul", rolling3M: 4.5, rolling6M: 8.1, rolling12M: 14.5 },
    { period: "Jun-Aug", rolling3M: 3.8, rolling6M: 7.5, rolling12M: 13.8 },
    { period: "Jul-Sep", rolling3M: 2.9, rolling6M: 6.8, rolling12M: 12.9 },
    { period: "Aug-Oct", rolling3M: 5.4, rolling6M: 8.7, rolling12M: 15.2 }
  ]
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const AVAILABLE_BENCHMARKS = [
  { id: "sp500", name: "S&P 500", ticker: "^GSPC" },
  { id: "nasdaq", name: "NASDAQ Composite", ticker: "^IXIC" },
  { id: "dow", name: "Dow Jones", ticker: "^DJI" },
  { id: "msci", name: "MSCI World", ticker: "URTH" },
  { id: "russell", name: "Russell 2000", ticker: "^RUT" },
  { id: "bonds", name: "US Aggregate Bonds", ticker: "AGG" }
];

export function PortfolioPerformance({ portfolioId: initialPortfolioId, portfolioName: initialPortfolioName }: PortfolioPerformanceProps) {
  const { portfolios, loading: portfoliosLoading } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(initialPortfolioId || null);
  const [selectedPeriod, setSelectedPeriod] = useState("YTD");
  const [selectedBenchmark, setSelectedBenchmark] = useState("sp500");
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

  // TODO: Replace PERFORMANCE_DATA with API calls based on selectedPortfolio
  // When implementing:
  // 1. Fetch historical price data for all stocks in selectedPortfolio.stocks
  // 2. Calculate time-weighted and money-weighted returns from trade history
  // 3. Compute attribution based on actual sector/stock weights
  // 4. Generate return decomposition from dividends and capital gains
  // 5. Compare against selected benchmark data
  // Example API structure:
  // const { data: performanceData } = useQuery({
  //   queryKey: ['portfolio-performance', selectedPortfolioId, selectedPeriod],
  //   queryFn: () => PerformanceService.getPortfolioPerformance({
  //     portfolioId: selectedPortfolioId,
  //     period: selectedPeriod,
  //     benchmark: selectedBenchmark
  //   })
  // });

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
          <Activity className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no portfolios
  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedPortfolioId || undefined} 
              onValueChange={setSelectedPortfolioId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Portfolio" />
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
              <SelectValue />
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
            <Download className="h-4 w-4" />
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
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold">{selectedPortfolio.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedPortfolio.stocks.length} holdings • Created {selectedPortfolio.createdDate}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(PERFORMANCE_DATA.summary.totalValue)}</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              <TrendingUp className={`h-3 w-3 ${getReturnColor(PERFORMANCE_DATA.summary.cumulativeReturnPercent)}`} />
              <span className={getReturnColor(PERFORMANCE_DATA.summary.cumulativeReturnPercent)}>
                {formatCurrency(PERFORMANCE_DATA.summary.cumulativeReturn)} ({formatPercent(PERFORMANCE_DATA.summary.cumulativeReturnPercent)})
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Since inception</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Time-Weighted Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReturnColor(PERFORMANCE_DATA.summary.timeWeightedReturn)}`}>
              {formatPercent(PERFORMANCE_DATA.summary.timeWeightedReturn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Neutralizes cash flows</p>
            <Badge variant="outline" className="mt-2 text-xs">TWR</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Money-Weighted Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReturnColor(PERFORMANCE_DATA.summary.moneyWeightedReturn)}`}>
              {formatPercent(PERFORMANCE_DATA.summary.moneyWeightedReturn)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Investor experience (IRR)</p>
            <Badge variant="outline" className="mt-2 text-xs">MWR</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Annualized Return
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getReturnColor(PERFORMANCE_DATA.summary.annualizedReturn)}`}>
              {formatPercent(PERFORMANCE_DATA.summary.annualizedReturn)}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                Best: {formatPercent(PERFORMANCE_DATA.summary.bestMonth.return)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Worst: {formatPercent(PERFORMANCE_DATA.summary.worstMonth.return)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmarking</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="decomposition">Decomposition</TabsTrigger>
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
                <AreaChart data={PERFORMANCE_DATA.valueOverTime}>
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
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
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
                    name="Benchmark (S&P 500)"
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
                    <div className="font-medium text-green-600">{formatPercent(PERFORMANCE_DATA.summary.bestMonth.return)}</div>
                    <div className="text-xs text-muted-foreground">{PERFORMANCE_DATA.summary.bestMonth.period}</div>
            </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Worst Month:</span>
              <div className="text-right">
                    <div className="font-medium text-red-600">{formatPercent(PERFORMANCE_DATA.summary.worstMonth.return)}</div>
                    <div className="text-xs text-muted-foreground">{PERFORMANCE_DATA.summary.worstMonth.period}</div>
                </div>
              </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Best Quarter:</span>
                  <div className="text-right">
                    <div className="font-medium text-green-600">{formatPercent(PERFORMANCE_DATA.summary.bestQuarter.return)}</div>
                    <div className="text-xs text-muted-foreground">{PERFORMANCE_DATA.summary.bestQuarter.period}</div>
            </div>
          </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Worst Quarter:</span>
                  <div className="text-right">
                    <div className="font-medium text-red-600">{formatPercent(PERFORMANCE_DATA.summary.worstQuarter.return)}</div>
                    <div className="text-xs text-muted-foreground">{PERFORMANCE_DATA.summary.worstQuarter.period}</div>
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
                    <Plus className="h-3 w-3" />
                    Net Contributions:
                  </span>
                  <span className="font-medium text-green-600">{formatCurrency(PERFORMANCE_DATA.summary.netContributions)}</span>
          </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Minus className="h-3 w-3" />
                    Net Withdrawals:
                  </span>
                  <span className="font-medium text-red-600">{formatCurrency(PERFORMANCE_DATA.summary.netWithdrawals)}</span>
        </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Net Cash Flow:</span>
                  <span className="font-bold">
                    {formatCurrency(PERFORMANCE_DATA.summary.netContributions - PERFORMANCE_DATA.summary.netWithdrawals)}
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
                    <Calendar className="h-3 w-3" />
                    Inception Date:
                  </span>
                  <span className="font-medium">{PERFORMANCE_DATA.summary.inceptionDate}</span>
              </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Cost:</span>
                  <span className="font-medium">{formatCurrency(PERFORMANCE_DATA.summary.totalCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Value:</span>
                  <span className="font-medium">{formatCurrency(PERFORMANCE_DATA.summary.totalValue)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Total Gain/Loss:</span>
                  <span className={`font-bold ${getReturnColor(PERFORMANCE_DATA.summary.cumulativeReturn)}`}>
                    {formatCurrency(PERFORMANCE_DATA.summary.cumulativeReturn)}
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
                <BarChart data={PERFORMANCE_DATA.monthlyReturns}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Bar dataKey="return" name="Monthly Return">
                    {PERFORMANCE_DATA.monthlyReturns.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#10b981' : '#ef4444'} />
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                      {AVAILABLE_BENCHMARKS.map((bm) => (
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
                  <p className="text-sm text-muted-foreground">Mix multiple benchmarks to create your ideal comparison</p>
                  <div className="grid grid-cols-2 gap-3">
                    {AVAILABLE_BENCHMARKS.slice(0, 4).map((bm) => (
                      <div key={bm.id} className="flex items-center gap-2">
                        <Label className="flex-1 text-sm">{bm.name}:</Label>
                        <Input type="number" placeholder="0" className="w-20" />
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
                <LineChart data={PERFORMANCE_DATA.valueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Legend />
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
                    name="S&P 500"
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
                  {PERFORMANCE_DATA.benchmarkComparison.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(row.portfolio)}`}>
                        {formatPercent(row.portfolio)}
                      </TableCell>
                      <TableCell className={`text-right ${getReturnColor(row.benchmark)}`}>
                        {formatPercent(row.benchmark)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(row.relative)}`}>
                        {formatPercent(row.relative)}
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
                <AreaChart data={PERFORMANCE_DATA.valueOverTime.map(d => ({
                  date: d.date,
                  alpha: d.portfolioReturn - d.benchmarkReturn
                }))}>
            <defs>
                    <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value)}%`} />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
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
                      {PERFORMANCE_DATA.assetAttribution.map((asset) => (
                        <TableRow key={asset.assetClass}>
                          <TableCell className="font-medium">{asset.assetClass}</TableCell>
                          <TableCell className="text-right">{asset.weight}%</TableCell>
                          <TableCell className={`text-right ${getReturnColor(asset.return)}`}>
                            {formatPercent(asset.return)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${getReturnColor(asset.contribution)}`}>
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
                        data={PERFORMANCE_DATA.assetAttribution}
                        dataKey="contribution"
                        nameKey="assetClass"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ assetClass, contribution }) => `${assetClass}: ${formatPercent(contribution)}`}
                      >
                        {PERFORMANCE_DATA.assetAttribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPercent(value)} />
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
                  {PERFORMANCE_DATA.sectorAttribution.map((sector) => (
                    <TableRow key={sector.sector}>
                      <TableCell className="font-medium">{sector.sector}</TableCell>
                      <TableCell className="text-right">{sector.weight}%</TableCell>
                      <TableCell className="text-right text-muted-foreground">{sector.benchmarkWeight}%</TableCell>
                      <TableCell className={`text-right ${getReturnColor(sector.return)}`}>
                        {formatPercent(sector.return)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPercent(sector.benchmarkReturn)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(sector.contribution)}`}>
                        {formatPercent(sector.contribution)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={PERFORMANCE_DATA.sectorAttribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="sector" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: number) => formatPercent(value)} />
                    <Legend />
                    <Bar dataKey="contribution" name="Contribution" fill="#3b82f6" />
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
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Allocation Effect:</strong> Impact of overweighting/underweighting sectors vs. benchmark</p>
                      <p className="mt-1"><strong>Selection Effect:</strong> Impact of stock-picking skill within sectors</p>
                      <p className="mt-1"><strong>Interaction Effect:</strong> Combined impact of allocation and selection decisions</p>
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
                    {PERFORMANCE_DATA.sectorAttribution.map((sector) => (
                      <TableRow key={sector.sector}>
                        <TableCell className="font-medium">{sector.sector}</TableCell>
                        <TableCell className={`text-right ${getReturnColor(sector.allocationEffect)}`}>
                          {formatPercent(sector.allocationEffect)}
                        </TableCell>
                        <TableCell className={`text-right ${getReturnColor(sector.selectionEffect)}`}>
                          {formatPercent(sector.selectionEffect)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatPercent(sector.allocationEffect + sector.selectionEffect - sector.contribution)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getReturnColor(sector.contribution)}`}>
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
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
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
                    {PERFORMANCE_DATA.topContributors.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
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
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
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
                    {PERFORMANCE_DATA.topDetractors.map((stock) => (
                      <TableRow key={stock.symbol}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
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
                      {formatPercent(PERFORMANCE_DATA.returnDecomposition.dividends)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="font-medium">Interest Income</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatPercent(PERFORMANCE_DATA.returnDecomposition.interest)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="font-medium">Capital Gains</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatPercent(PERFORMANCE_DATA.returnDecomposition.capitalGains)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border-2 border-primary">
                    <span className="font-bold">Total Return</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPercent(
                        PERFORMANCE_DATA.returnDecomposition.dividends +
                        PERFORMANCE_DATA.returnDecomposition.interest +
                        PERFORMANCE_DATA.returnDecomposition.capitalGains
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
                        { name: 'Dividends', value: PERFORMANCE_DATA.returnDecomposition.dividends },
                        { name: 'Interest', value: PERFORMANCE_DATA.returnDecomposition.interest },
                        { name: 'Capital Gains', value: PERFORMANCE_DATA.returnDecomposition.capitalGains }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${formatPercent(value)}`}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPercent(value)} />
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
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <div className="text-sm text-muted-foreground">Realized Gains</div>
                        <div className="text-xs text-muted-foreground mt-1">Locked in through sales</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatPercent(PERFORMANCE_DATA.returnDecomposition.realized)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <div className="text-sm text-muted-foreground">Unrealized Gains</div>
                        <div className="text-xs text-muted-foreground mt-1">Paper gains (current holdings)</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {formatPercent(PERFORMANCE_DATA.returnDecomposition.unrealized)}
                      </div>
                    </div>
                    {PERFORMANCE_DATA.returnDecomposition.currencyEffect !== 0 && (
                      <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div>
                          <div className="text-sm text-muted-foreground">Currency Effect</div>
                          <div className="text-xs text-muted-foreground mt-1">FX impact on returns</div>
                        </div>
                        <div className="text-2xl font-bold text-amber-600">
                          {formatPercent(PERFORMANCE_DATA.returnDecomposition.currencyEffect)}
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
                          Realized: PERFORMANCE_DATA.returnDecomposition.realized,
                          Unrealized: PERFORMANCE_DATA.returnDecomposition.unrealized
                        }
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" />
                      <Tooltip formatter={(value: number) => formatPercent(value)} />
                      <Legend />
                      <Bar dataKey="Realized" fill="#10b981" />
                      <Bar dataKey="Unrealized" fill="#3b82f6" />
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
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Detailed income tracking and forecasting will be available once API integration is complete.
                </p>
              </div>
            </CardContent>
          </Card>
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
                  {PERFORMANCE_DATA.benchmarkComparison.map((row) => (
                    <TableRow key={row.period}>
                      <TableCell className="font-medium">{row.period}</TableCell>
                      <TableCell className={`text-right font-bold ${getReturnColor(row.portfolio)}`}>
                        {formatPercent(row.portfolio)}
                      </TableCell>
                      <TableCell className={`text-right ${getReturnColor(row.benchmark)}`}>
                        {formatPercent(row.benchmark)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${getReturnColor(row.relative)}`}>
                        {formatPercent(row.relative)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.relative >= 0 ? (
                          <Badge variant="default" className="bg-green-600">Outperforming</Badge>
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
                <LineChart data={PERFORMANCE_DATA.rollingReturns}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: number) => formatPercent(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="rolling3M" stroke="#3b82f6" name="3 Month Rolling" strokeWidth={2} />
                  <Line type="monotone" dataKey="rolling6M" stroke="#10b981" name="6 Month Rolling" strokeWidth={2} />
                  <Line type="monotone" dataKey="rolling12M" stroke="#8b5cf6" name="12 Month Rolling" strokeWidth={2} />
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
                  <Input type="date" className="mt-1" />
          </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" className="mt-1" />
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
                  <div className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
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

                  <div className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
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

                  <div className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
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

                  <div className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
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
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <div className="font-medium text-sm">Monthly Summary</div>
                        <div className="text-xs text-muted-foreground">Every 1st of the month</div>
                      </div>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-background rounded border">
                      <div>
                        <div className="font-medium text-sm">Quarterly Review</div>
                        <div className="text-xs text-muted-foreground">Every quarter end</div>
                      </div>
                      <Badge variant="outline">Inactive</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
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
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Quarterly Review</TableCell>
                      <TableCell>Q3 2024</TableCell>
                      <TableCell>Oct 1, 2024</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Monthly Performance</TableCell>
                      <TableCell>Sep 2024</TableCell>
                      <TableCell>Oct 1, 2024</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
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
