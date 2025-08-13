import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
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
  ShoppingCart
} from "lucide-react";
import { AccountBalance, Order, Transaction, NewsItem, MarketData } from "../types/trading";

interface TradingDashboardProps {
  accountBalance: AccountBalance;
  recentOrders: Order[];
  recentTransactions: Transaction[];
  news: NewsItem[];
  marketData: MarketData[];
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
}

export function TradingDashboard({ 
  accountBalance, 
  recentOrders, 
  recentTransactions, 
  news,
  marketData,
  onQuickTrade,
  onChartStock
}: TradingDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const todayGainLoss = accountBalance.totalValue * 0.015; // Mock 1.5% daily gain
  const todayGainLossPercent = 1.5;

  return (
    <div className="space-y-6">
      {/* Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Account Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.totalValue)}</div>
            <div className="flex items-center gap-1 text-sm">
              {todayGainLoss >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600" />
              )}
              <span className={todayGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(todayGainLoss)} ({formatPercent(todayGainLossPercent)})
              </span>
              <span className="text-muted-foreground">today</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Buying Power</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.buyingPower)}</div>
            <p className="text-xs text-muted-foreground">
              Available to invest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Cash Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.cashBalance)}</div>
            <p className="text-xs text-muted-foreground">
              {((accountBalance.cashBalance / accountBalance.totalValue) * 100).toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Stock Value</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(accountBalance.stockValue)}</div>
            <p className="text-xs text-muted-foreground">
              {((accountBalance.stockValue / accountBalance.totalValue) * 100).toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Movers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Market Movers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {marketData.slice(0, 5).map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {stock.companyName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(stock.currentPrice)}</p>
                      <div className="flex items-center gap-1">
                        {stock.change >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={`text-xs ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(stock.changePercent)}
                        </span>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onChartStock(stock.symbol)}
                        className="h-7 w-7 p-0"
                      >
                        <BarChart3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuickTrade(stock.symbol)}
                        className="h-7 w-7 p-0"
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                      {order.side.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{order.symbol}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.quantity} shares
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        order.status === 'filled' ? 'default' :
                        order.status === 'pending' ? 'secondary' :
                        order.status === 'cancelled' ? 'outline' : 'destructive'
                      }
                    >
                      {order.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(order.orderDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{transaction.description}</TableCell>
                    <TableCell className={`text-right ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Market News */}
        <Card>
          <CardHeader>
            <CardTitle>Market News</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {news.slice(0, 4).map((article) => (
                <div key={article.id} className="border-b border-border pb-3 last:border-b-0">
                  <h4 className="text-sm font-medium line-clamp-2 mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{article.source}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}