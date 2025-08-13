import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Edit, TrendingUp, TrendingDown, BarChart3, ShoppingCart } from "lucide-react";
import { Portfolio, Stock } from "@/types/portfolio";

interface PortfolioDetailProps {
  portfolio: Portfolio;
  onBack: () => void;
  onAddStock: () => void;
  onEditStock: (stock: Stock) => void;
  onDeleteStock: (stockId: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
}

export function PortfolioDetail({ 
  portfolio, 
  onBack, 
  onAddStock, 
  onEditStock, 
  onDeleteStock,
  onQuickTrade,
  onChartStock
}: PortfolioDetailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const totalGainLoss = portfolio.totalValue - portfolio.totalCost;
  const totalGainLossPercent = portfolio.totalCost > 0 ? (totalGainLoss / portfolio.totalCost) * 100 : 0;

  // Calculate sector allocation
  const sectorAllocation = portfolio.stocks.reduce((acc, stock) => {
    const sector = stock.sector || 'Other';
    const value = stock.quantity * stock.currentPrice;
    acc[sector] = (acc[sector] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const totalStockValue = portfolio.stocks.reduce((sum, stock) => sum + (stock.quantity * stock.currentPrice), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1>{portfolio.name}</h1>
          {portfolio.description && (
            <p className="text-muted-foreground">{portfolio.description}</p>
          )}
        </div>
        <Button onClick={onAddStock} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolio.totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalGainLoss)}
            </div>
            <p className={`text-xs ${totalGainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(totalGainLossPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolio.cash)}</div>
            <p className="text-xs text-muted-foreground">
              {((portfolio.cash / portfolio.totalValue) * 100).toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{portfolio.stocks.length}</div>
            <p className="text-xs text-muted-foreground">Different stocks</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
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
              {portfolio.stocks.map((stock) => {
                const marketValue = stock.quantity * stock.currentPrice;
                const costBasis = stock.quantity * stock.purchasePrice;
                const gainLoss = marketValue - costBasis;
                const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                const portfolioPercent = totalStockValue > 0 ? (marketValue / totalStockValue) * 100 : 0;

                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{stock.symbol}</span>
                        {stock.sector && (
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
                          onClick={() => onChartStock(stock.symbol)}
                          className="h-8 w-8 p-0"
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onQuickTrade(stock.symbol)}
                          className="h-8 w-8 p-0"
                        >
                          <ShoppingCart className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditStock(stock)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteStock(stock.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Sector Allocation */}
      {Object.keys(sectorAllocation).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sector Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(sectorAllocation).map(([sector, value]) => {
                const percentage = totalStockValue > 0 ? (value / totalStockValue) * 100 : 0;
                return (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-sm">{sector}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{formatCurrency(value)}</span>
                      <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}