import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  PieChart, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ShoppingCart,
  Sparkles,
  Target,
  Zap,
  Eye,
  AlertTriangle,
  Shield,
  Target as TargetIcon,
  Gauge,
  LineChart,
  CandlestickChart,
  Volume2,
  Timer,
  Calendar,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Minus,
  Plus,
  RefreshCw,
  Settings,
  Filter,
  Search,
  Star,
  BookOpen,
  FileText,
  Users,
  Building2,
  Globe,
  Zap as ZapIcon,
  Brain,
  Atom,
  Crown,
  Hexagon
} from "lucide-react";
import { 
  AccountBalance, 
  Order, 
  Transaction, 
  NewsItem, 
  MarketData, 
  Position,
  MarketIndex,
  OrderBook,
  TimeAndSales,
  TechnicalAnalysis,
  RiskMetrics,
  PortfolioAnalytics,
  MarketMovers,
  SectorPerformance
} from "@/types/trading";

interface TradingDashboardProps {
  accountBalance: AccountBalance;
  recentOrders: Order[];
  recentTransactions: Transaction[];
  news: NewsItem[];
  marketData: MarketData[];
  positions: Position[];
  marketIndexes: MarketIndex[];
  orderBook: OrderBook;
  timeAndSales: TimeAndSales;
  technicalAnalysis: TechnicalAnalysis;
  riskMetrics: RiskMetrics;
  portfolioAnalytics: PortfolioAnalytics;
  marketMovers: MarketMovers;
  sectorPerformance: SectorPerformance[];
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
}

export function TradingDashboard({ 
  accountBalance, 
  recentOrders, 
  recentTransactions, 
  news,
  marketData,
  positions,
  marketIndexes,
  orderBook,
  timeAndSales,
  technicalAnalysis,
  riskMetrics,
  portfolioAnalytics,
  marketMovers,
  sectorPerformance,
  onQuickTrade,
  onChartStock
}: TradingDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedStock, setSelectedStock] = useState<string>('AAPL');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStockData = (symbol: string) => {
    return marketData.find(stock => stock.symbol === symbol);
  };

  const currentStock = getStockData(selectedStock);

  return (
    <div className="space-y-6">
      {/* Market Indexes Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {marketIndexes.map((index) => (
          <Card key={index.symbol} className="bg-gradient-to-br from-slate-50 to-white border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{index.symbol}</p>
                  <p className="text-xs text-slate-500">{index.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{formatNumber(index.value)}</p>
                  <div className={`text-sm font-semibold flex items-center gap-1 ${index.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {index.changePercent >= 0 ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
                    {formatPercent(index.changePercent)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200/50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                <Shield className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Total Account Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(accountBalance.totalValue)}</p>
              <div className="flex items-center gap-2">
                <div className={`text-sm font-semibold ${portfolioAnalytics.dayGainLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolioAnalytics.dayGainLoss)}
                </div>
                <div className={`text-sm ${portfolioAnalytics.dayGainLossPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPercent(portfolioAnalytics.dayGainLossPercent)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <Target className="h-3 w-3 mr-1" />
                Available
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Buying Power</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(accountBalance.buyingPower)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Day Trading</span>
                  <span className="font-medium">{formatCurrency(accountBalance.dayTradingBuyingPower)}</span>
                </div>
                <Progress value={75} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200/50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                <Activity className="h-3 w-3 mr-1" />
                {positions.length} Positions
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Portfolio Performance</p>
              <p className="text-2xl font-bold text-slate-900">{formatPercent(portfolioAnalytics.totalGainLossPercent)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Sharpe Ratio</span>
                  <span className="font-medium">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Beta</span>
                  <span className="font-medium">{riskMetrics.beta.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200/50 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl">
                <Gauge className="h-6 w-6 text-white" />
              </div>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {accountBalance.marginLevel.toFixed(0)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">Margin Level</p>
              <p className="text-2xl font-bold text-slate-900">{accountBalance.marginLevel.toFixed(1)}%</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Used</span>
                  <span className="font-medium">{formatCurrency(accountBalance.marginUsed)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Available</span>
                  <span className="font-medium">{formatCurrency(accountBalance.marginExcess)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <PieChart className="h-4 w-4 mr-2" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <FileText className="h-4 w-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="market" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <BarChart3 className="h-4 w-4 mr-2" />
            Market
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <LineChart className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="news" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-xl">
            <BookOpen className="h-4 w-4 mr-2" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Performance Chart */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900">Portfolio Performance</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        1D
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        1M
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        1Y
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">Performance chart will be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Metrics */}
            <div>
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900">Risk Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Sharpe Ratio</span>
                      <span className="font-semibold">{riskMetrics.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Beta</span>
                      <span className="font-semibold">{riskMetrics.beta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Volatility</span>
                      <span className="font-semibold">{formatPercent(riskMetrics.volatility)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Max Drawdown</span>
                      <span className="font-semibold text-red-600">{formatPercent(riskMetrics.maxDrawdown)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">VaR (95%)</span>
                      <span className="font-semibold">{formatCurrency(riskMetrics.var95)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${order.side === 'buy' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                          {order.side === 'buy' ? <Plus className="h-4 w-4 text-emerald-600" /> : <Minus className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{order.symbol}</p>
                          <p className="text-sm text-slate-600">{order.orderType} • {order.quantity} shares</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(order.totalValue)}</p>
                        <Badge className={`text-xs ${order.status === 'filled' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{transaction.description}</p>
                          <p className="text-sm text-slate-600">{formatTime(transaction.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(transaction.amount)}
                        </p>
                        <Badge className="text-xs bg-slate-100 text-slate-700">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900">Portfolio Positions</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Avg Cost</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Unrealized P&L</TableHead>
                    <TableHead>Day P&L</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.symbol}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">{position.symbol[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold">{position.symbol}</p>
                            <p className="text-xs text-slate-600">{position.companyName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatNumber(position.quantity)}</TableCell>
                      <TableCell>{formatCurrency(position.avgCost)}</TableCell>
                      <TableCell>{formatCurrency(position.marketValue)}</TableCell>
                      <TableCell>
                        <div className={`font-semibold ${position.unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(position.unrealizedPnL)}
                        </div>
                        <div className={`text-xs ${position.unrealizedPnLPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatPercent(position.unrealizedPnLPercent)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold ${position.dayPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(position.dayPnL)}
                        </div>
                        <div className={`text-xs ${position.dayPnLPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatPercent(position.dayPnLPercent)}
                        </div>
                      </TableCell>
                      <TableCell>{formatPercent(position.weight)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => onQuickTrade(position.symbol, 'buy')}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onQuickTrade(position.symbol, 'sell')}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => onChartStock(position.symbol)}>
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Market Movers */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900">Market Movers</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="gainers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
                      <TabsTrigger value="losers">Top Losers</TabsTrigger>
                      <TabsTrigger value="active">Most Active</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gainers" className="space-y-3 mt-4">
                      {marketMovers.gainers.slice(0, 10).map((stock) => (
                        <div key={stock.symbol} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onChartStock(stock.symbol)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{stock.symbol[0]}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{stock.symbol}</p>
                              <p className="text-xs text-slate-600">{stock.companyName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(stock.currentPrice)}</p>
                            <p className="text-emerald-600 font-semibold">{formatPercent(stock.changePercent)}</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="losers" className="space-y-3 mt-4">
                      {marketMovers.losers.slice(0, 10).map((stock) => (
                        <div key={stock.symbol} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onChartStock(stock.symbol)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{stock.symbol[0]}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{stock.symbol}</p>
                              <p className="text-xs text-slate-600">{stock.companyName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(stock.currentPrice)}</p>
                            <p className="text-red-600 font-semibold">{formatPercent(stock.changePercent)}</p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="active" className="space-y-3 mt-4">
                      {marketMovers.mostActive.slice(0, 10).map((stock) => (
                        <div key={stock.symbol} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onChartStock(stock.symbol)}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{stock.symbol[0]}</span>
                            </div>
                            <div>
                              <p className="font-semibold">{stock.symbol}</p>
                              <p className="text-xs text-slate-600">{formatNumber(stock.volume)} vol</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(stock.currentPrice)}</p>
                            <p className={`font-semibold ${stock.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatPercent(stock.changePercent)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sector Performance */}
            <div>
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900">Sector Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sectorPerformance.slice(0, 8).map((sector) => (
                      <div key={sector.sector} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-900">{sector.sector}</p>
                          <p className="text-xs text-slate-600">{formatNumber(sector.volume)} vol</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${sector.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatPercent(sector.changePercent)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technical Analysis */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Technical Analysis - {selectedStock}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Overall Signal</span>
                    <Badge className={`${technicalAnalysis.signals.overall === 'buy' ? 'bg-emerald-100 text-emerald-700' : technicalAnalysis.signals.overall === 'sell' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {technicalAnalysis.signals.overall.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">RSI</span>
                      <span className="font-semibold">{technicalAnalysis.indicators.rsi.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">MACD</span>
                      <span className="font-semibold">{technicalAnalysis.indicators.macd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">SMA 20</span>
                      <span className="font-semibold">{formatCurrency(technicalAnalysis.indicators.sma20)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">SMA 50</span>
                      <span className="font-semibold">{formatCurrency(technicalAnalysis.indicators.sma50)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Book */}
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">Order Book - {selectedStock}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-red-600 mb-2">Asks</p>
                      <div className="space-y-1">
                        {orderBook.asks.slice(0, 5).map((ask, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-red-600">{formatCurrency(ask.price)}</span>
                            <span className="text-slate-600">{formatNumber(ask.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-600 mb-2">Bids</p>
                      <div className="space-y-1">
                        {orderBook.bids.slice(0, 5).map((bid, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-emerald-600">{formatCurrency(bid.price)}</span>
                            <span className="text-slate-600">{formatNumber(bid.size)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Spread</span>
                      <span className="font-semibold">{formatCurrency(orderBook.spread)} ({formatPercent(orderBook.spreadPercent)})</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">Market News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {news.slice(0, 10).map((item) => (
                  <div key={item.id} className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{item.summary}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{item.source}</span>
                          <span>{formatTime(item.timestamp)}</span>
                          {item.symbols && item.symbols.length > 0 && (
                            <span>Related: {item.symbols.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      {item.sentiment && (
                        <Badge className={`ml-4 ${item.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' : item.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {item.sentiment}
                        </Badge>
                      )}
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