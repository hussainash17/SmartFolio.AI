import { useMemo, useState } from "react";
import { usePortfolioHistory } from "../hooks/usePortfolioHistory";
import { ArrowLeft, Plus, Minus, Upload, Search, TrendingUp, TrendingDown, AlertTriangle, PieChart as PieChartIcon, Activity } from "lucide-react";
import { Portfolio, Stock } from "../types/portfolio";
import { MarketData } from "../types/trading";
import { formatCurrency, formatPercent, formatNumber, getChangeColor } from "../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { UploadPortfolioDialog } from "./UploadPortfolioDialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface PortfolioDetailProps {
  portfolio: Portfolio;
  onBack: () => void;
  onAddStock: () => void;
  onEditStock: (stock: Stock) => void;
  onDeleteStock: (stockId: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  marketData?: MarketData[];
}

export function PortfolioDetail({
  portfolio,
  onBack,
  onAddStock,
  onEditStock,
  onDeleteStock,
  onQuickTrade,
  onChartStock,
  marketData = []
}: PortfolioDetailProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showOnlyNegative, setShowOnlyNegative] = useState(false);

  // Create a map of market data for O(1) lookup
  const marketDataMap = useMemo(() => {
    return new Map(marketData.map(data => [data.symbol, data]));
  }, [marketData]);

  // Enrich stocks with live market data and calculate metrics
  const enrichedPortfolio = useMemo(() => {
    const stocks = portfolio.stocks.map(stock => {
      const marketInfo = marketDataMap.get(stock.symbol);
      const currentPrice = marketInfo?.currentPrice ?? stock.currentPrice;
      const previousClose = currentPrice - (marketInfo?.change ?? 0); // Estimate prev close if change is available

      const marketValue = stock.quantity * currentPrice;
      const costBasis = stock.quantity * stock.purchasePrice;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
      const dailyChange = stock.quantity * (marketInfo?.change ?? 0);

      return {
        ...stock,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPercent,
        dailyChange,
        sector: marketInfo?.sector || stock.sector || 'Unknown',
        name: marketInfo?.companyName || stock.companyName
      };
    });

    const totalStockValue = stocks.reduce((sum, s) => sum + s.marketValue, 0);
    const totalCost = stocks.reduce((sum, s) => sum + s.costBasis, 0);
    const totalValue = totalStockValue + portfolio.cash;
    const totalUnrealizedPnL = totalStockValue - totalCost;
    const totalDailyChange = stocks.reduce((sum, s) => sum + s.dailyChange, 0);

    return {
      stocks,
      totalValue,
      totalCost,
      totalStockValue,
      totalUnrealizedPnL,
      totalDailyChange,
      cash: portfolio.cash
    };
  }, [portfolio, marketDataMap]);

  // Filter stocks based on search query and negative PnL filter
  const filteredStocks = useMemo(() => {
    return enrichedPortfolio.stocks.filter(stock => {
      if (showOnlyNegative && stock.unrealizedPnL >= 0) return false;

      if (!query) return true;
      const q = query.toLowerCase();
      return (
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        stock.sector.toLowerCase().includes(q)
      );
    });
  }, [enrichedPortfolio.stocks, query, showOnlyNegative]);

  // Calculate sector allocation for Pie Chart
  const sectorAllocation = useMemo(() => {
    const allocation: Record<string, number> = {};
    enrichedPortfolio.stocks.forEach(stock => {
      allocation[stock.sector] = (allocation[stock.sector] || 0) + stock.marketValue;
    });

    return Object.entries(allocation)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedPortfolio.stocks]);

  // Fetch portfolio history
  const { data: historyData, isLoading: historyLoading } = usePortfolioHistory(portfolio.id);

  const performanceData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];

    return historyData.map(item => ({
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.date)),
      value: item.total_value
    }));
  }, [historyData]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06B6D4', '#EC4899', '#6366F1'];

  return (
    <div className="space-y-6">
      <UploadPortfolioDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{portfolio.name}</h1>
            <p className="text-sm text-muted-foreground">
              {portfolio.description || "A clear, actionable view of your investments"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Portfolio
          </Button>
          <Button onClick={onAddStock} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Portfolio Value</div>
            <div className="mt-2 flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(enrichedPortfolio.totalValue)}
                </div>
                <div className="text-sm text-muted-foreground">As of today</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getChangeColor(enrichedPortfolio.totalDailyChange)}`}>
                  {enrichedPortfolio.totalDailyChange >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(enrichedPortfolio.totalDailyChange))}
                </div>
                <div className="text-xs text-muted-foreground">Daily change</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cost</div>
            <div className="mt-2">
              <div className="text-xl font-semibold text-foreground">
                {formatCurrency(enrichedPortfolio.totalCost)}
              </div>
              <div className="text-xs text-muted-foreground">Cost basis (all holdings)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unrealized PnL</div>
            <div className="mt-2 flex items-center gap-4">
              <div className={`text-xl font-semibold ${getChangeColor(enrichedPortfolio.totalUnrealizedPnL)}`}>
                {enrichedPortfolio.totalUnrealizedPnL >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(enrichedPortfolio.totalUnrealizedPnL))}
              </div>
              <Badge variant={enrichedPortfolio.totalUnrealizedPnL >= 0 ? "default" : "destructive"} className="text-xs">
                {enrichedPortfolio.totalCost > 0
                  ? formatPercent((enrichedPortfolio.totalUnrealizedPnL / enrichedPortfolio.totalCost) * 100)
                  : "0%"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash</div>
            <div className="mt-2">
              <div className="text-xl font-semibold text-foreground">
                {formatCurrency(enrichedPortfolio.cash)}
              </div>
              <div className="text-xs text-muted-foreground">
                {enrichedPortfolio.totalValue > 0
                  ? (enrichedPortfolio.cash / enrichedPortfolio.totalValue * 100).toFixed(1)
                  : "0"}% of portfolio
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Holdings & Chart */}
        <div className="lg:col-span-2 space-y-6">

          {/* Holdings Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Holdings</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {enrichedPortfolio.stocks.length} different stocks
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search symbol..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-negative"
                      checked={showOnlyNegative}
                      onCheckedChange={(checked) => setShowOnlyNegative(checked as boolean)}
                    />
                    <label
                      htmlFor="show-negative"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Losing only
                    </label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-3 pl-2 font-medium">Symbol</th>
                      <th className="pb-3 font-medium">Sector</th>
                      <th className="pb-3 text-right pr-4 font-medium">Qty</th>
                      <th className="pb-3 text-right pr-4 font-medium">Avg Cost</th>
                      <th className="pb-3 text-right pr-4 font-medium">Purchase Price</th>
                      <th className="pb-3 text-right pr-4 font-medium">Current Price</th>
                      <th className="pb-3 text-right pr-4 font-medium">Market Value</th>
                      <th className="pb-3 text-right pr-4 font-medium">Unrealized</th>
                      <th className="pb-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStocks.length > 0 ? (
                      filteredStocks.map((stock) => (
                        <tr key={stock.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pl-2 align-top">
                            <div className="font-semibold text-foreground">{stock.symbol}</div>
                          </td>
                          <td className="py-3 align-top text-muted-foreground">
                            <Badge variant="secondary" className="font-normal text-xs">
                              {stock.sector}
                            </Badge>
                          </td>
                          <td className="py-3 align-top text-right pr-4">{stock.quantity}</td>
                          <td className="py-3 align-top text-right pr-4 text-muted-foreground">{formatCurrency(stock.purchasePrice)}</td>
                          <td className="py-3 align-top text-right pr-4 text-muted-foreground">{formatCurrency(stock.costBasis)}</td>
                          <td className="py-3 align-top text-right pr-4 font-medium">{formatCurrency(stock.currentPrice)}</td>
                          <td className="py-3 align-top text-right pr-4 font-medium">{formatCurrency(stock.marketValue)}</td>
                          <td className="py-3 align-top text-right pr-4">
                            <div className={`font-medium ${getChangeColor(stock.unrealizedPnL)}`}>
                              {stock.unrealizedPnL >= 0 ? "+" : ""}
                              {formatCurrency(Math.abs(stock.unrealizedPnL))}
                            </div>
                            <div className={`text-xs ${getChangeColor(stock.unrealizedPnLPercent)}`}>
                              {formatPercent(stock.unrealizedPnLPercent)}
                            </div>
                          </td>
                          <td className="py-3 align-top text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => onChartStock(stock.symbol)}
                                title="View Chart"
                              >
                                <Activity className="h-4 w-4" />
                              </Button>
                              <div className="w-px h-4 bg-border mx-1" />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => onQuickTrade(stock.symbol, 'buy')}
                                title="Buy / Add"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => onQuickTrade(stock.symbol, 'sell')}
                                title="Sell / Reduce"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-muted-foreground">
                          No holdings found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div>Showing {filteredStocks.length} of {enrichedPortfolio.stocks.length} holdings</div>
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
                  <span className="font-medium text-primary">Total Market Value:</span>
                  <span className="font-bold text-base text-primary">{formatCurrency(enrichedPortfolio.totalStockValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Performance</CardTitle>
                  <p className="text-sm text-muted-foreground">Portfolio value over time</p>
                </div>
                <Badge variant="outline">6 Months</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      hide={true}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Value']}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          {/* Portfolio Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-xs text-muted-foreground mb-2">Diversification Score</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${Math.min(100, enrichedPortfolio.stocks.length * 10)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{Math.min(100, enrichedPortfolio.stocks.length * 10)}%</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">Top 3 Positions</div>
                <div className="space-y-3">
                  {enrichedPortfolio.stocks
                    .sort((a, b) => b.marketValue - a.marketValue)
                    .slice(0, 3)
                    .map(stock => (
                      <div key={stock.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                            {stock.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.companyName}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {enrichedPortfolio.totalStockValue > 0
                              ? ((stock.marketValue / enrichedPortfolio.totalStockValue) * 100).toFixed(1)
                              : "0"}%
                          </div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(stock.marketValue)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sector Allocation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sector Allocation</CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorAllocation}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {sectorAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-sm font-bold text-foreground">
                      {formatNumber(enrichedPortfolio.totalStockValue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {sectorAllocation.slice(0, 5).map((sector, index) => (
                  <div key={sector.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground truncate max-w-[120px]" title={sector.name}>
                        {sector.name}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {enrichedPortfolio.totalStockValue > 0
                        ? ((sector.value / enrichedPortfolio.totalStockValue) * 100).toFixed(1)
                        : "0"}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">Quick Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-medium text-amber-800 dark:text-amber-400">Earnings Coming Up</div>
                  <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">2 stocks in your portfolio have earnings this week.</div>
                </div>
                <Button variant="outline" className="w-full text-xs h-8">
                  Manage Alerts
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground pb-6">
        Data is updated in real-time. Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}