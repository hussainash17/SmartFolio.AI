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
import { useEffect, useState } from "react";
import { AnalyticsService, RiskManagementService, KycService, OpenAPI } from "../src/client";

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

  // Backend-integrated state
  const [dashboardSummary, setDashboardSummary] = useState<{ 
    total_portfolio_value: number;
    ytd_return_percent: number;
    risk_score: number;
    risk_level: string;
    active_goals: number;
    day_change?: number;
    day_change_percent?: number;
  }>({ total_portfolio_value: 0, ytd_return_percent: 0, risk_score: 0, risk_level: 'LOW', active_goals: 0 });

  const [portfolioPerformance, setPortfolioPerformance] = useState({
    totalReturn: 0,
    yearToDate: 0,
    oneYear: 0,
    threeYear: 0,
    sharpeRatio: 0,
    volatility: 0,
    maxDrawdown: 0,
    alpha: 0,
    beta: 0,
  });

  const [investmentGoals, setInvestmentGoals] = useState<Array<{ id: string; name: string; target: number; current: number; progress: number; timeframe: string; priority: string }>>([]);

  const [assetAllocation, setAssetAllocation] = useState<Array<{ type: string; value: number; percentage: number; color: string }>>([]);

  const [riskAlerts, setRiskAlerts] = useState<Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>>([]);

  useEffect(() => {
    // Ensure auth header for OpenAPI client and fetch
    const token = localStorage.getItem('portfoliomax_token');
    if (token) {
      (OpenAPI as any).TOKEN = token as any;
    }

    const base = (OpenAPI as any).BASE || '';
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/dashboard/summary`, {
          headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
          credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
        });
        if (res.ok) {
          const data = await res.json();
          setDashboardSummary({
            total_portfolio_value: Number(data.total_portfolio_value || 0),
            ytd_return_percent: Number(data.ytd_return_percent || 0),
            risk_score: Number(data.risk_score || 0),
            risk_level: String(data.risk_level || 'LOW'),
            active_goals: Number(data.active_goals || 0),
            day_change: Number(data.day_change || 0),
            day_change_percent: Number(data.day_change_percent || 0),
          });
        }
      } catch {}
    };

    const fetchPortfolioAnalytics = async () => {
      if (!selectedPortfolioId) return;
      try {
        // All-time return (approximate using ALL period)
        const perfAll = await AnalyticsService.getPortfolioPerformance({ portfolioId: selectedPortfolioId, period: 'ALL' });
        // 1Y performance for detailed metrics
        const perf1Y = await AnalyticsService.getPortfolioPerformance({ portfolioId: selectedPortfolioId, period: '1Y' });
        // Optional benchmark comparison
        let alpha = 0, beta = 0;
        try {
          const bench = await AnalyticsService.getBenchmarkComparison({ portfolioId: selectedPortfolioId, benchmark: 'SPY', period: '1Y' });
          alpha = Number((bench as any).alpha || 0);
          beta = Number((bench as any).beta || 0);
        } catch {}

        setPortfolioPerformance({
          totalReturn: Number((perfAll as any).absolute_return_percent || 0),
          yearToDate: Number(dashboardSummary.ytd_return_percent || (perf1Y as any).absolute_return_percent || 0),
          oneYear: Number((perf1Y as any).annualized_return || 0),
          threeYear: Number((perfAll as any).cagr || 0),
          sharpeRatio: Number((perf1Y as any).sharpe_ratio || 0),
          volatility: Number((perf1Y as any).volatility || 0),
          maxDrawdown: Number((perf1Y as any).max_drawdown || 0),
          alpha,
          beta,
        });
      } catch {}
    };

    const fetchAllocation = async () => {
      if (!selectedPortfolioId) return;
      try {
        const alloc = await AnalyticsService.getPortfolioAllocation({ portfolioId: selectedPortfolioId });
        const sectors = ((alloc as any).sector_wise_allocation || []) as Array<any>;
        const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280", "#8b5cf6", "#14b8a6", "#f97316"];
        const mapped = sectors.map((s, idx) => ({
          type: String(s.sector || 'Unknown'),
          value: Number(s.value || 0),
          percentage: Number(s.allocation_percent || 0),
          color: palette[idx % palette.length],
        }));
        setAssetAllocation(mapped);
      } catch {
        setAssetAllocation([]);
      }
    };

    const fetchGoals = async () => {
      try {
        const goals = await KycService.getInvestmentGoals();
        const mapped = (goals as any[]).map((g) => ({
          id: String(g.id),
          name: String(g.goal_type || 'Goal'),
          target: Number(g.target_amount || 0),
          current: 0,
          progress: 0,
          timeframe: g.target_date ? new Date(g.target_date).toLocaleDateString() : '—',
          priority: (Number(g.priority || 1) <= 1 ? 'High' : Number(g.priority || 1) <= 2 ? 'Medium' : 'Low'),
        }));
        setInvestmentGoals(mapped);
      } catch {
        setInvestmentGoals([]);
      }
    };

    const fetchRiskAlerts = async () => {
      try {
        const alerts = await RiskManagementService.getRiskAlerts({ portfolioId: selectedPortfolioId });
        const mapped = (alerts as any[]).map((a) => ({
          type: String(a.alert_type || 'info'),
          message: String(a.message || ''),
          severity: String((a.severity || 'LOW')).toLowerCase() as 'low' | 'medium' | 'high',
        }));
        setRiskAlerts(mapped);
      } catch {
        setRiskAlerts([]);
      }
    };

    fetchSummary();
    fetchGoals();
    fetchRiskAlerts();
    fetchPortfolioAnalytics();
    fetchAllocation();
  }, [selectedPortfolioId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Portfolio Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive view of your investment portfolio and financial goals
          </p>
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
            <div className="text-2xl font-bold">{formatCurrency(dashboardSummary.total_portfolio_value || accountBalance.totalValue)}</div>
            {dashboardSummary.day_change != null && (
              <div className="flex items-center gap-1 mt-1">
                {(dashboardSummary.day_change || 0) >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={`${(dashboardSummary.day_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
                  {formatCurrency(Math.abs(dashboardSummary.day_change || 0))}
                </span>
                <span className={`${(dashboardSummary.day_change_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'} text-sm`}>
                  ({formatPercent(dashboardSummary.day_change_percent || 0)})
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
            <div className="text-2xl font-bold {dashboardSummary.ytd_return_percent >= 0 ? 'text-green-600' : 'text-red-600'}">
              {formatPercent(dashboardSummary.ytd_return_percent || 0)}
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
            <div className="text-2xl font-bold">{dashboardSummary.risk_score.toFixed(1)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {dashboardSummary.risk_level || 'Moderate'} Risk
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
            <div className="text-2xl font-bold">{dashboardSummary.active_goals}</div>
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
                  {assetAllocation.map((asset) => (
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
                  ))}
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
                      alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                      alert.severity === 'medium' ? 'border-orange-200 bg-orange-50' :
                      'border-blue-200 bg-blue-50'
                    }`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                          alert.severity === 'high' ? 'text-red-600' :
                          alert.severity === 'medium' ? 'text-orange-600' :
                          'text-blue-600'
                        }`} />
                        <div>
                          <p className="text-sm">{alert.message}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {alert.severity} priority
                          </Badge>
                        </div>
                      </div>
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
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-green-600">{portfolioPerformance.sharpeRatio}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Alpha</p>
                    <p className="text-2xl font-bold text-blue-600">{portfolioPerformance.alpha}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Beta</p>
                    <p className="text-2xl font-bold">{portfolioPerformance.beta}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volatility</p>
                    <p className="text-2xl font-bold text-orange-600">{portfolioPerformance.volatility}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Returns Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">1 Year (Annualized)</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPercent(portfolioPerformance.oneYear)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">CAGR (All Time)</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPercent(portfolioPerformance.threeYear)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Max Drawdown</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatPercent(portfolioPerformance.maxDrawdown)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benchmark Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">vs S&P 500</span>
                    <Badge variant="outline" className={(portfolioPerformance.alpha >= 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200')}>
                      {portfolioPerformance.alpha >= 0 ? `+${portfolioPerformance.alpha}% outperformance` : `${portfolioPerformance.alpha}% underperformance`}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <div className="grid gap-6">
            {investmentGoals.map((goal) => (
              <Card key={goal.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Target: {formatCurrency(goal.target)} by {goal.timeframe}
                      </p>
                    </div>
                    <Badge variant={goal.priority === 'High' ? 'destructive' : 'secondary'}>
                      {goal.priority} Priority
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {formatCurrency(goal.current)}</span>
                      <span>{goal.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      Adjust Target
                    </Button>
                    <Button variant="outline" size="sm">
                      Add Contribution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{dashboardSummary.risk_score.toFixed(1)}</p>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{portfolioPerformance.volatility}%</p>
                    <p className="text-sm text-muted-foreground">Volatility</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Value at Risk (95%)</span>
                    <span className="text-sm font-medium">—</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Correlation to Market</span>
                    <span className="text-sm font-medium">—</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diversification Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sector Concentration</span>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {/* Could compute from allocation */}—
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Geographic Exposure</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {/* Not available */}—
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Asset Class Mix</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      {/* Not available */}—
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium">{order.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.side.toUpperCase()} {order.quantity} shares
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.totalValue)}</p>
                        <Badge variant={order.status === 'filled' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">{tx.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}