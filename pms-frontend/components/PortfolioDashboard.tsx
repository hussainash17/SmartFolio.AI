import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, ShoppingCart } from "lucide-react";
import { Portfolio, PortfolioSummary } from "../types/portfolio";

interface PortfolioDashboardProps {
  onCreatePortfolio: () => void;
  onSelectPortfolio: (portfolio: Portfolio) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  portfolios: Portfolio[];
  portfolioSummary: PortfolioSummary;
}

export function PortfolioDashboard({ onCreatePortfolio, onSelectPortfolio, onQuickTrade, onChartStock, portfolios, portfolioSummary }: PortfolioDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">My Portfolios</h1>
          <p className="text-muted-foreground text-lg">Manage and monitor your investment portfolios</p>
        </div>
        <Button onClick={onCreatePortfolio} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Create Portfolio
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolioSummary.totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Gain/Loss</CardTitle>
            {portfolioSummary.totalGainLoss >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              <span className={portfolioSummary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(portfolioSummary.totalGainLoss)}
              </span>
            </div>
            <p className={`text-xs ${portfolioSummary.totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(portfolioSummary.totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Day Change</CardTitle>
            {portfolioSummary.dayChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              <span className={portfolioSummary.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(portfolioSummary.dayChange)}
              </span>
            </div>
            <p className={`text-xs ${portfolioSummary.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(portfolioSummary.dayChangePercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Portfolios</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{portfolios.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios Grid */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Portfolios</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => {
          const gainLoss = portfolio.totalValue - portfolio.totalCost;
          const gainLossPercent = portfolio.totalCost > 0 ? (gainLoss / portfolio.totalCost) * 100 : 0;

          return (
            <Card key={portfolio.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelectPortfolio(portfolio)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                  <Badge variant={gainLoss >= 0 ? "default" : "destructive"}>
                    {formatPercent(gainLossPercent)}
                  </Badge>
                </div>
                {portfolio.description && (
                  <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span>{formatCurrency(portfolio.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gain/Loss</span>
                    <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(gainLoss)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Holdings</span>
                    <span>{portfolio.stocks.length} stocks</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Cash</span>
                    <span>{formatCurrency(portfolio.cash)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Default Portfolio Holdings */}
      {portfolios.length > 0 && portfolios[0].stocks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Default Portfolio Holdings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Showing stocks from: {portfolios[0].name}
                </p>
              </div>
              <Button variant="outline" onClick={() => onSelectPortfolio(portfolios[0])}>
                View Full Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Gain/Loss</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolios[0].stocks.map((stock) => {
                  const marketValue = stock.quantity * stock.currentPrice;
                  const costBasis = stock.quantity * stock.purchasePrice;
                  const gainLoss = marketValue - costBasis;
                  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                  return (
                    <TableRow key={stock.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stock.symbol}</span>
                          {stock.sector && stock.sector !== 'Unknown' && (
                            <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{stock.companyName}</TableCell>
                      <TableCell className="text-right">{stock.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.purchasePrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.currentPrice)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(marketValue)}</TableCell>
                      <TableCell className={`text-right ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {gainLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatCurrency(gainLoss)}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(gainLossPercent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onChartStock(stock.symbol);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickTrade(stock.symbol);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}