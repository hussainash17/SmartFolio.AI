import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { ArrowLeft, Plus, Trash2, Edit, TrendingUp, TrendingDown, BarChart3, ShoppingCart, Upload } from "lucide-react";
import { Portfolio, Stock } from "../types/portfolio";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { UploadPortfolioDialog } from "./UploadPortfolioDialog";
import { MarketData } from "../types/trading";

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const safePercent = Number.isFinite(percent) ? percent : 0;
    return `${safePercent >= 0 ? '+' : ''}${safePercent.toFixed(2)}%`;
  };

  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    marketData.forEach((quote) => {
      const symbol = String(quote.symbol || '').toUpperCase();
      if (!symbol) return;
      const price = Number(quote.currentPrice ?? quote.change ?? 0);
      if (!Number.isFinite(price)) return;
      map.set(symbol, price);
    });
    return map;
  }, [marketData]);

  const resolvePrice = (stock: Stock) => {
    const symbolKey = String(stock.symbol || '').toUpperCase();
    return priceMap.get(symbolKey) ?? stock.currentPrice;
  };

  const enhancedStocks = useMemo(() => {
    return portfolio.stocks.map((stock) => {
      const currentPrice = resolvePrice(stock);
      return {
        ...stock,
        livePrice: currentPrice,
      };
    });
  }, [portfolio.stocks, priceMap]);

  const totalCost = enhancedStocks.reduce((sum, stock) => sum + (stock.quantity * stock.purchasePrice), 0);
  const totalStockValue = enhancedStocks.reduce((sum, stock) => sum + (stock.quantity * stock.livePrice), 0);
  const totalValue = totalStockValue + portfolio.cash;
  const totalGainLoss = totalStockValue - totalCost;
  const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

  // Calculate sector allocation
  const sectorAllocation = enhancedStocks.reduce((acc, stock) => {
    const rawSector = stock.sector;
    const sector = !rawSector || /^\d+$/.test(String(rawSector)) ? 'Unknown' : rawSector;
    const value = stock.quantity * stock.livePrice;
    acc[sector] = (acc[sector] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  // Color palette for pie chart
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Prepare data for pie chart
  const sectorChartData = Object.entries(sectorAllocation).map(([sector, value]) => ({
    name: sector,
    value: value,
    percentage: totalStockValue > 0 ? (value / totalStockValue) * 100 : 0,
  }));

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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsUploadDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Portfolio
          </Button>
          <Button onClick={onAddStock} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Stock
          </Button>
        </div>
      </div>

      {/* Upload Portfolio Dialog */}
      <UploadPortfolioDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        portfolioId={portfolio.id}
        portfolioName={portfolio.name}
      />

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Totol Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(totalCost)}</div>
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
            <CardTitle className="text-sm">Unrealized PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolio.unrealizedPnl)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Realized PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolio.realizedPnl)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{formatCurrency(portfolio.cash)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalValue > 0 ? (portfolio.cash / totalValue) * 100 : 0).toFixed(1))}% of portfolio
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
              {enhancedStocks.map((stock) => {
                const marketValue = stock.quantity * stock.livePrice;
                const costBasis = stock.quantity * stock.purchasePrice;
                const gainLoss = marketValue - costBasis;
                const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                const portfolioPercent = totalStockValue > 0 ? (marketValue / totalStockValue) * 100 : 0;

                const sectorName = !stock.sector || /^\d+$/.test(String(stock.sector)) ? 'Unknown' : stock.sector;

                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{stock.symbol}</span>
                        {sectorName && (
                          <Badge variant="outline" className="text-xs">{sectorName}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{stock.companyName}</TableCell>
                    <TableCell className="text-right">{stock.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stock.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(stock.livePrice)}</TableCell>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectorChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sectorChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend with Details */}
              <div className="space-y-3">
                {sectorChartData.map((sector, index) => (
                  <div key={sector.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-sm">{sector.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(sector.value)}</span>
                      <Badge variant="secondary" className="min-w-[60px] justify-center">
                        {sector.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}