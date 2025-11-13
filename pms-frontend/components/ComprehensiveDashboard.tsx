import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  Shield,
  Award,
  Clock,
  Activity
} from "lucide-react";
import { AccountBalance, Order, Transaction, NewsItem, MarketData as MarketDataType } from "../types/trading";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsService, RiskManagementService, KycService, OpenAPI } from "../src/client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queryKeys";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { usePortfolios } from "../hooks/usePortfolios";
import {
  useCurrentValue,
  usePerformanceReturns,
  usePerformanceRiskMetrics,
  useBestWorstPeriods,
  useCashFlows,
} from "../hooks/usePerformance";

interface ComprehensiveDashboardProps {
  accountBalance: AccountBalance;
  recentOrders: Order[];
  recentTransactions: Transaction[];
  news: NewsItem[];
  marketData: MarketDataType[];
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
  selectedPortfolioId?: string;
}

export function ComprehensiveDashboard({ 
  accountBalance, 
  recentOrders, 
  recentTransactions, 
  news,
  marketData,
  onQuickTrade,
  onChartStock,
  onNavigate,
  selectedPortfolioId: initialPortfolioId,
}: ComprehensiveDashboardProps) {
  // Portfolio selection state
  const { portfolios } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | undefined>(initialPortfolioId);
  
  // Set default portfolio when portfolios load
  useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const { data: dashboardSummary = { total_portfolio_value: 0, ytd_return_percent: 0, risk_score: 0, risk_level: 'LOW', active_goals: 0 } } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: async () => {
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/dashboard/summary`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return { total_portfolio_value: 0, ytd_return_percent: 0, risk_score: 0, risk_level: 'LOW', active_goals: 0 };
      const data = await res.json();
      return {
        total_portfolio_value: Number(data.total_portfolio_value || 0),
        ytd_return_percent: Number(data.ytd_return_percent || 0),
        risk_score: Number(data.risk_score || 0),
        risk_level: String(data.risk_level || 'LOW'),
        active_goals: Number(data.active_goals || 0),
        day_change: Number(data.day_change || 0),
        day_change_percent: Number(data.day_change_percent || 0),
      };
    },
    staleTime: 60 * 1000,
  });

  // Use new optimized split APIs for performance data
  const { data: currentValue } = useCurrentValue(selectedPortfolioId);
  const { data: returnsYTD } = usePerformanceReturns(selectedPortfolioId, 'YTD');
  const { data: returns1Y } = usePerformanceReturns(selectedPortfolioId, '1Y');
  const { data: returns3Y } = usePerformanceReturns(selectedPortfolioId, '3Y');
  const { data: returnsAll } = usePerformanceReturns(selectedPortfolioId, 'ALL');
  const { data: riskMetrics1Y } = usePerformanceRiskMetrics(selectedPortfolioId, '1Y');
  const { data: bestWorstYTD } = useBestWorstPeriods(selectedPortfolioId, 'YTD');
  const { data: cashFlowsYTD } = useCashFlows(selectedPortfolioId, 'YTD');

  const { data: benchmarkYTD } = useQuery({
    queryKey: queryKeys.benchmarkComparison(selectedPortfolioId, 'dsex'),
    enabled: !!selectedPortfolioId,
    queryFn: () =>
      PerformanceService.getBenchmarkComparison({
        portfolioId: selectedPortfolioId!,
        benchmarkId: 'dsex',
      }),
  });

  // Aggregate performance data from split APIs
  const portfolioPerformance = useMemo(() => {
    const ytdData = benchmarkYTD?.comparison?.find(c => c.period === 'YTD');

    return {
      totalReturn: returnsAll?.time_weighted_return || 0,
      yearToDate: returnsYTD?.time_weighted_return || 0,
      oneYear: returns1Y?.annualized_return || 0,
      threeYear: returns3Y?.annualized_return || 0,
      sharpeRatio: riskMetrics1Y?.sharpe_ratio || 0,
      volatility: riskMetrics1Y?.volatility || 0,
      maxDrawdown: riskMetrics1Y?.max_drawdown || 0,
      alpha: ytdData?.alpha || 0,
      beta: ytdData?.beta || 0,
      benchmarkYTD: ytdData?.benchmark_return || 0,
    };
  }, [returnsAll, returnsYTD, returns1Y, returns3Y, riskMetrics1Y, benchmarkYTD]);

  const { data: assetAllocation = [] } = useQuery({
    queryKey: queryKeys.portfolioAllocation(selectedPortfolioId || 'none'),
    enabled: !!selectedPortfolioId,
    queryFn: async () => {
      if (!selectedPortfolioId) return [] as Array<{ type: string; value: number; percentage: number; color: string }>;
      try {
        const alloc = await AnalyticsService.getPortfolioAllocation({ portfolioId: selectedPortfolioId });
        const sectors = ((alloc as any).sector_wise_allocation || []) as Array<any>;
        
        // Ensure sectors is an array
        if (!Array.isArray(sectors)) {
          console.warn('[ComprehensiveDashboard] sector_wise_allocation is not an array:', sectors);
          return [] as Array<{ type: string; value: number; percentage: number; color: string }>;
        }
        
        const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280", "#8b5cf6", "#14b8a6", "#f97316"];
        return sectors.map((s, idx) => ({
          type: String(s.sector || 'Unknown'),
          value: Number(s.value || 0),
          percentage: Number(s.allocation_percent || 0),
          color: palette[idx % palette.length],
        }));
      } catch (error) {
        console.error('[ComprehensiveDashboard] Failed to fetch asset allocation:', error);
        return [] as Array<{ type: string; value: number; percentage: number; color: string }>;
      }
    },
  });

  const { data: investmentGoals = [] } = useQuery({
    queryKey: queryKeys.investmentGoals,
    queryFn: async () => {
      try {
        const goals = await KycService.getInvestmentGoals();
        return (goals as any[]).map((g) => ({
          id: String(g.id),
          name: String(g.goal_type || 'Goal'),
          target: Number(g.target_amount || 0),
          current: 0,
          progress: 0,
          timeframe: g.target_date ? new Date(g.target_date).toLocaleDateString() : '—',
          priority: (Number(g.priority || 1) <= 1 ? 'High' : Number(g.priority || 1) <= 2 ? 'Medium' : 'Low'),
          status: String(g.status || 'ACTIVE'),
        }));
      } catch (error) {
        console.error('[Dashboard] Failed to fetch investment goals:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: goalProgressMap = {} } = useQuery({
    queryKey: ['kyc', 'goals', 'progress', investmentGoals.map(g => g.id).join(',')],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const g of investmentGoals) {
        try {
          const contribs = await KycService.listGoalContributions({ goalId: g.id });
          const sum = (contribs as any[]).reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
          const target = Number(g.target || 0);
          result[g.id] = target > 0 ? Math.min(100, (sum / target) * 100) : 0;
        } catch (error) {
          console.error(`[Dashboard] Failed to fetch contributions for goal ${g.id}:`, error);
          result[g.id] = 0;
        }
      }
      return result;
    },
    enabled: investmentGoals.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: riskAlerts = [] } = useQuery({
    queryKey: queryKeys.riskAlerts(selectedPortfolioId),
    enabled: !!selectedPortfolioId,
    queryFn: async () => {
      if (!selectedPortfolioId) return [] as Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
      const alerts = await RiskManagementService.getRiskAlerts({ portfolioId: selectedPortfolioId });
      return (alerts as any[]).map((a) => ({
        type: String(a.alert_type || 'info'),
        message: String(a.message || ''),
        severity: String((a.severity || 'LOW')).toLowerCase() as 'low' | 'medium' | 'high',
      }));
    },
  });

  // Fetch user risk profile
  const { data: riskProfile } = useQuery({
    queryKey: ['risk', 'profile'],
    queryFn: async () => {
      try {
        const profile = await RiskManagementService.getUserRiskProfile();
        return profile as any;
      } catch (error) {
        // 404 means user hasn't created a risk profile yet - this is normal
        if ((error as any)?.status === 404) {
          return null;
        }
        console.error('[Dashboard] Failed to fetch risk profile:', error);
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry on 404
  });

  const dashboardSummaryMemo = useMemo(() => dashboardSummary, [dashboardSummary]);

  return (
    <div className="space-y-6">
      {/* Page Header with Portfolio Selector */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Comprehensive view of your investment portfolio and financial goals</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Portfolio Selector */}
          <div className="min-w-[250px]">
            <Select value={selectedPortfolioId || ''} onValueChange={setSelectedPortfolioId}>
              <SelectTrigger>
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
          <Button variant="outline" onClick={() => onNavigate('reports')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Report
          </Button>
          <Button onClick={() => onQuickTrade()}>
            <DollarSign className="h-4 w-4 mr-2" />
            Trade
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Total Portfolio Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardSummaryMemo.total_portfolio_value || accountBalance.totalValue)}</div>
            {dashboardSummaryMemo.day_change != null && (
              <div className="flex items-center gap-1 mt-1">
                {(dashboardSummaryMemo.day_change || 0) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={`${(dashboardSummaryMemo.day_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
                  {formatCurrency(Math.abs(dashboardSummaryMemo.day_change || 0))}
                </span>
                <span className={`${(dashboardSummaryMemo.day_change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
                  ({formatPercent(dashboardSummaryMemo.day_change_percent || 0)})
                </span>
                <span className="text-sm text-muted-foreground">today</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Year-to-Date Return</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardSummaryMemo.ytd_return_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(dashboardSummaryMemo.ytd_return_percent || 0)}
            </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm text-muted-foreground">vs DSEX:</span>
                <span className={`text-sm font-medium ${portfolioPerformance.benchmarkYTD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(portfolioPerformance.benchmarkYTD)}
                </span>
              </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(dashboardSummaryMemo?.risk_score ?? 0).toFixed(1)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {dashboardSummaryMemo.risk_level || 'Moderate'} Risk
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardSummaryMemo.active_goals}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-muted-foreground">Avg progress:</span>
              <span className="text-sm font-medium">
                {investmentGoals.length > 0 && Object.keys(goalProgressMap).length > 0
                  ? (Object.values(goalProgressMap).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) / investmentGoals.length).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Asset Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Asset Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(assetAllocation) && assetAllocation.length > 0 ? (
                    assetAllocation.map((asset) => (
                      <div key={asset.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: asset.color }}
                            />
                            <span className="text-sm">{asset.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{formatCurrency(asset.value)}</span>
                            <span className="text-sm text-muted-foreground">{asset.percentage}%</span>
                          </div>
                        </div>
                        <Progress value={asset.percentage} className="h-2" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No allocation data available
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => onNavigate('allocation')}
                >
                  View Detailed Allocation
                </Button>
              </CardContent>
            </Card>

            {/* Risk Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Alerts & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskAlerts.map((alert, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      alert.severity === 'high' ? 'bg-red-50 border-red-200' : alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`} />
                        <span className="text-sm font-medium">{alert.type.toUpperCase()}</span>
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                    </div>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => onNavigate('risk-analysis')}
                >
                  View Risk Analysis
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`${order.side === 'buy' ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                        {order.side.toUpperCase()}
                      </Badge>
                      <div>
                        <div className="font-medium">{order.symbol} · {order.orderType.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">Qty {order.quantity} · {order.status.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(order.totalValue)}</div>
                      <div className="text-sm text-muted-foreground">Fees: {formatCurrency(order.fees)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => onNavigate('orders')}
              >
                View All Orders
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Return</div>
                    <div className={`text-xl font-semibold ${portfolioPerformance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.totalReturn)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Year to Date</div>
                    <div className={`text-xl font-semibold ${portfolioPerformance.yearToDate >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.yearToDate)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">1Y Annualized</div>
                    <div className={`text-xl font-semibold ${portfolioPerformance.oneYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.oneYear)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">3Y CAGR</div>
                    <div className={`text-xl font-semibold ${portfolioPerformance.threeYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.threeYear)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk-Adjusted Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-xl font-semibold">{portfolioPerformance.sharpeRatio.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Volatility</div>
                    <div className="text-xl font-semibold">{formatPercent(portfolioPerformance.volatility)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    <div className="text-xl font-semibold">{formatPercent(portfolioPerformance.maxDrawdown)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Alpha / Beta</div>
                    <div className="text-xl font-semibold">{portfolioPerformance.alpha.toFixed(2)} / {portfolioPerformance.beta.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      vs Market
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best & Worst Periods</CardTitle>
              </CardHeader>
              <CardContent>
                {!bestWorstYTD ? (
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Best Month</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">
                        {formatPercent(bestWorstYTD.best_month.return)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Worst Month</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {formatPercent(bestWorstYTD.worst_month.return)}
                      </span>
                    </div>
                    {cashFlowsYTD && (
                      <>
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Net Contributions</span>
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(cashFlowsYTD.net_contributions)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Net Withdrawals</span>
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(cashFlowsYTD.net_withdrawals)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          {/* Goals Overview Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investmentGoals.length}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {investmentGoals.filter(g => g.status === 'ACTIVE').length} active
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Target</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(investmentGoals.reduce((sum, g) => sum + (Number(g.target) || 0), 0))}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Across all goals
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Average Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {investmentGoals.length > 0 && Object.keys(goalProgressMap).length > 0
                    ? (Object.values(goalProgressMap).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) / investmentGoals.length).toFixed(1)
                    : '0.0'}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Overall completion
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Goals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Investment Goals</CardTitle>
                <Button variant="outline" size="sm" onClick={() => onNavigate('goals')}>
                  <Target className="h-4 w-4 mr-2" />
                  Manage Goals
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {investmentGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No investment goals yet</p>
                  <Button onClick={() => onNavigate('goals')}>
                    Create Your First Goal
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {investmentGoals.map((goal) => {
                    const progress = Number(goalProgressMap[goal.id]) || 0;
                    const target = Number(goal.target) || 0;
                    const currentAmount = (target * progress) / 100;
                    const remaining = Math.max(0, target - currentAmount);
                    
                    return (
                      <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{goal.name}</h3>
                              <Badge 
                                variant="outline" 
                                className={
                                  goal.priority === 'High' 
                                    ? 'border-red-200 text-red-600' 
                                    : goal.priority === 'Medium' 
                                    ? 'border-yellow-200 text-yellow-600' 
                                    : 'border-blue-200 text-blue-600'
                                }
                              >
                                {goal.priority}
                              </Badge>
                              <Badge variant="outline">
                                {goal.status || 'ACTIVE'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Target: {formatCurrency(target)} • Due: {goal.timeframe}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{progress.toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Complete</div>
                          </div>
                        </div>

                        <Progress value={progress} className="h-3" />

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Current</div>
                            <div className="font-semibold text-green-600">
                              {formatCurrency(currentAmount)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Remaining</div>
                            <div className="font-semibold text-orange-600">
                              {formatCurrency(remaining)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Target</div>
                            <div className="font-semibold">
                              {formatCurrency(target)}
                            </div>
                          </div>
                        </div>

                        {progress >= 100 && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                            <Award className="h-4 w-4" />
                            <span className="font-medium">Goal Achieved! 🎉</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {/* Risk Overview Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Risk Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(Number(dashboardSummaryMemo?.risk_score) || 0).toFixed(1)}</div>
                <Badge 
                  variant="outline" 
                  className={
                    dashboardSummaryMemo?.risk_level === 'HIGH' 
                      ? 'border-red-200 text-red-600 mt-2' 
                      : dashboardSummaryMemo?.risk_level === 'MODERATE' 
                      ? 'border-yellow-200 text-yellow-600 mt-2' 
                      : 'border-green-200 text-green-600 mt-2'
                  }
                >
                  {dashboardSummaryMemo?.risk_level || 'LOW'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Volatility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(portfolioPerformance?.volatility || 0)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Annualized
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatPercent(portfolioPerformance?.maxDrawdown || 0)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Worst decline
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{riskAlerts?.length || 0}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {(riskAlerts?.filter(a => a.severity === 'high') || []).length} high priority
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Profile */}
          {riskProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Your Risk Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Risk Tolerance</div>
                        <div className="font-semibold text-lg capitalize">{riskProfile.risk_tolerance || 'Moderate'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Investment Horizon</div>
                        <div className="font-semibold">{riskProfile.investment_horizon || 'Medium-term'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Risk Capacity</div>
                        <div className="font-semibold capitalize">{riskProfile.risk_capacity || 'Moderate'}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Max Loss Tolerance</div>
                        <div className="font-semibold">{riskProfile.max_loss_tolerance ? `${riskProfile.max_loss_tolerance}%` : 'Not set'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Liquidity Needs</div>
                        <div className="font-semibold capitalize">{riskProfile.liquidity_needs || 'Moderate'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Profile Updated</div>
                        <div className="font-semibold">
                          {riskProfile.updated_at ? new Date(riskProfile.updated_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Risk Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Risk-Adjusted Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                  <div className="text-2xl font-bold">{(portfolioPerformance?.sharpeRatio || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(portfolioPerformance?.sharpeRatio || 0) > 1 ? 'Good' : (portfolioPerformance?.sharpeRatio || 0) > 0.5 ? 'Fair' : 'Poor'}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Volatility</div>
                  <div className="text-2xl font-bold">{formatPercent(portfolioPerformance?.volatility || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.abs(portfolioPerformance?.volatility || 0) < 15 ? 'Low' : Math.abs(portfolioPerformance?.volatility || 0) < 25 ? 'Moderate' : 'High'}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-600">{formatPercent(portfolioPerformance?.maxDrawdown || 0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Worst decline
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Beta</div>
                  <div className="text-2xl font-bold">{(portfolioPerformance?.beta || 0).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    vs DSEX: {formatPercent(portfolioPerformance.benchmarkYTD)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Alerts
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => onNavigate('risk-analysis')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {riskAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-green-600 mb-3" />
                  <p className="text-muted-foreground">No active risk alerts</p>
                  <p className="text-sm text-muted-foreground mt-1">Your portfolio is within acceptable risk parameters</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riskAlerts.map((alert, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      alert.severity === 'high' ? 'bg-red-50 border-red-200' : alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{alert.type.toUpperCase()}</span>
                            <Badge 
                              variant="outline" 
                              className={
                                alert.severity === 'high' 
                                  ? 'border-red-300 text-red-700' 
                                  : alert.severity === 'medium' 
                                  ? 'border-yellow-300 text-yellow-700' 
                                  : 'border-emerald-300 text-emerald-700'
                              }
                            >
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{txn.type.toUpperCase()}</div>
                      <div className="text-sm text-muted-foreground">{new Date(txn.date).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(txn.amount)}</div>
                      <div className="text-sm text-muted-foreground">{txn.status.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}