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
import { useMemo } from "react";
import { AnalyticsService, RiskManagementService, KycService, OpenAPI } from "../src/client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queryKeys";

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
  selectedPortfolioId,
}: ComprehensiveDashboardProps) {
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

  const { data: portfolioPerformance = {
    totalReturn: 0,
    yearToDate: 0,
    oneYear: 0,
    threeYear: 0,
    sharpeRatio: 0,
    volatility: 0,
    maxDrawdown: 0,
    alpha: 0,
    beta: 0,
  } } = useQuery({
    queryKey: queryKeys.portfolioAnalytics(selectedPortfolioId || 'none'),
    enabled: !!selectedPortfolioId,
    queryFn: async () => {
      if (!selectedPortfolioId) return {
        totalReturn: 0, yearToDate: 0, oneYear: 0, threeYear: 0, sharpeRatio: 0, volatility: 0, maxDrawdown: 0, alpha: 0, beta: 0,
      };
      const perfAll = await AnalyticsService.getPortfolioPerformance({ portfolioId: selectedPortfolioId, period: 'ALL' });
      const perf1Y = await AnalyticsService.getPortfolioPerformance({ portfolioId: selectedPortfolioId, period: '1Y' });
      let alpha = 0, beta = 0;
      try {
        const bench = await AnalyticsService.getBenchmarkComparison({ portfolioId: selectedPortfolioId, benchmark: 'SPY', period: '1Y' });
        alpha = Number((bench as any).alpha || 0);
        beta = Number((bench as any).beta || 0);
      } catch {}
      return {
        totalReturn: Number((perfAll as any).absolute_return_percent || 0),
        yearToDate: Number((perf1Y as any).absolute_return_percent || 0),
        oneYear: Number((perf1Y as any).annualized_return || 0),
        threeYear: Number((perfAll as any).cagr || 0),
        sharpeRatio: Number((perf1Y as any).sharpe_ratio || 0),
        volatility: Number((perf1Y as any).volatility || 0),
        maxDrawdown: Number((perf1Y as any).max_drawdown || 0),
        alpha,
        beta,
      };
    },
  });

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
      const goals = await KycService.getInvestmentGoals();
      return (goals as any[]).map((g) => ({
        id: String(g.id),
        name: String(g.goal_type || 'Goal'),
        target: Number(g.target_amount || 0),
        current: 0,
        progress: 0,
        timeframe: g.target_date ? new Date(g.target_date).toLocaleDateString() : '—',
        priority: (Number(g.priority || 1) <= 1 ? 'High' : Number(g.priority || 1) <= 2 ? 'Medium' : 'Low'),
      }));
    },
  });

  const { data: goalProgressMap = {} } = useQuery({
    queryKey: ['kyc', 'goals', 'progress'],
    queryFn: async () => {
      const result: Record<string, number> = {};
      for (const g of (investmentGoals as any[])) {
        try {
          const contribs = await KycService.listGoalContributions({ goalId: g.id });
          const sum = (contribs as any[]).reduce((acc, c) => acc + Number(c.amount || 0), 0);
          const target = Number(g.target_amount || 0);
          result[g.id] = target > 0 ? Math.min(100, (sum / target) * 100) : 0;
        } catch {}
      }
      return result;
    },
    enabled: (investmentGoals as any[]).length > 0,
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

  const dashboardSummaryMemo = useMemo(() => dashboardSummary, [dashboardSummary]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Comprehensive view of your investment portfolio and financial goals</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('reports')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={() => onQuickTrade()}>
            <DollarSign className="h-4 w-4 mr-2" />
            Quick Trade
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
              <span className="text-sm text-muted-foreground">vs S&P 500:</span>
              <span className="text-sm text-green-600">{/* Placeholder or integrate benchmark */}+0.0%</span>
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
                {(investmentGoals.length > 0 ? (investmentGoals.reduce((acc, goal) => acc + goal.progress, 0) / investmentGoals.length) : 0).toFixed(1)}%
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
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-600" />
                      <span>First $10,000 investment</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Reach $50,000 goal</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Est. 6 months</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Investment Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investmentGoals.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{goal.name}</div>
                        <div className="text-sm text-muted-foreground">Target: {formatCurrency(goal.target)} • Due: {goal.timeframe}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{Number((goalProgressMap as any)[goal.id] || 0).toFixed(1)}%</div>
                      </div>
                    </div>
                    <Progress value={Number((goalProgressMap as any)[goal.id] || 0)} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
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