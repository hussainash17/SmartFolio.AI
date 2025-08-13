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

interface ComprehensiveDashboardProps {
  accountBalance: AccountBalance;
  recentOrders: Order[];
  recentTransactions: Transaction[];
  news: NewsItem[];
  marketData: MarketDataType[];
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export function ComprehensiveDashboard({ 
  accountBalance, 
  recentOrders, 
  recentTransactions, 
  news,
  marketData,
  onQuickTrade,
  onChartStock,
  onNavigate
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

  // Mock portfolio performance data
  const portfolioPerformance = {
    totalReturn: 15.8,
    yearToDate: 12.3,
    oneYear: 18.9,
    threeYear: 8.4,
    sharpeRatio: 1.34,
    volatility: 14.2,
    maxDrawdown: -8.3,
    alpha: 2.1,
    beta: 1.08
  };

  // Mock investment goals
  const investmentGoals = [
    { id: 1, name: "Emergency Fund", target: 25000, current: 18750, progress: 75, timeframe: "6 months", priority: "High" },
    { id: 2, name: "Retirement Savings", target: 500000, current: 125000, progress: 25, timeframe: "25 years", priority: "High" },
    { id: 3, name: "House Down Payment", target: 80000, current: 35000, progress: 43.75, timeframe: "3 years", priority: "Medium" },
    { id: 4, name: "Children's Education", target: 150000, current: 22000, progress: 14.67, timeframe: "15 years", priority: "Medium" }
  ];

  // Mock asset allocation
  const assetAllocation = [
    { type: "Large Cap Stocks", value: 185000, percentage: 37, color: "#3b82f6" },
    { type: "International Stocks", value: 125000, percentage: 25, color: "#10b981" },
    { type: "Bonds", value: 100000, percentage: 20, color: "#f59e0b" },
    { type: "Small Cap Stocks", value: 75000, percentage: 15, color: "#ef4444" },
    { type: "Cash", value: 15000, percentage: 3, color: "#6b7280" }
  ];

  // Risk alerts
  const riskAlerts = [
    { type: "concentration", message: "Tech sector represents 35% of portfolio - consider diversification", severity: "medium" },
    { type: "rebalancing", message: "Asset allocation deviation detected - rebalancing recommended", severity: "low" },
    { type: "volatility", message: "Portfolio volatility increased to 16.2% this month", severity: "medium" }
  ];

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
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.totalValue)}</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <span className="text-sm text-green-600">+{formatPercent(portfolioPerformance.totalReturn)}</span>
              <span className="text-sm text-muted-foreground">all time</span>
            </div>
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
            <div className="text-2xl font-bold text-green-600">
              {formatPercent(portfolioPerformance.yearToDate)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-muted-foreground">vs S&P 500:</span>
              <span className="text-sm text-green-600">+2.3%</span>
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
            <div className="text-2xl font-bold">7.2</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Moderate Risk
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
            <div className="text-2xl font-bold">{investmentGoals.length}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-muted-foreground">Avg progress:</span>
              <span className="text-sm font-medium">
                {(investmentGoals.reduce((acc, goal) => acc + goal.progress, 0) / investmentGoals.length).toFixed(1)}%
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
                    <span className="text-sm">1 Year</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPercent(portfolioPerformance.oneYear)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">3 Year (Annualized)</span>
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
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      +2.3% outperformance
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">vs Nasdaq</span>
                    <Badge variant="outline" className="text-red-600 border-red-200">
                      -1.1% underperformance
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">vs Russell 2000</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      +4.8% outperformance
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
                    <p className="text-2xl font-bold text-orange-600">7.2</p>
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
                    <span className="text-sm font-medium">$12,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Correlation to Market</span>
                    <span className="text-sm font-medium">0.82</span>
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
                      Moderate
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Geographic Exposure</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Well Diversified
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Asset Class Mix</span>
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      Balanced
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
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`font-medium ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
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