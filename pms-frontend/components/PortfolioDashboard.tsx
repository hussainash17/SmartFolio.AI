import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
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
        <h2>Your Portfolios</h2>
        <Button onClick={onCreatePortfolio} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Portfolio
        </Button>
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
    </div>
  );
}