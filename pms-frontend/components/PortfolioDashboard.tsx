import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BarChart3, DollarSign, Plus, ShoppingCart, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { Portfolio, PortfolioSummary } from "../types/portfolio";
import { useEffect, useState, useMemo } from "react";
import { OpenAPI } from "../src/client";
import { formatCurrency, formatPercent } from "../lib/utils";
import { useDonchianChannelsBatch } from "../hooks/useDonchianChannel";

interface PortfolioDashboardProps {
    onCreatePortfolio: () => void;
    onUploadPortfolio?: () => void;
    onSelectPortfolio: (portfolio: Portfolio) => void;
    onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
    onChartStock: (symbol: string) => void;
    portfolios: Portfolio[];
    portfolioSummary: PortfolioSummary;
    selectedPortfolio?: Portfolio | null;
}

export function PortfolioDashboard({
    onCreatePortfolio,
    onUploadPortfolio,
    onSelectPortfolio,
    onQuickTrade,
    onChartStock,
    portfolios,
    portfolioSummary,
    selectedPortfolio
}: PortfolioDashboardProps) {
    type Aggregates = {
        total_portfolio_value: number;
        total_invested_amount: number;
        total_available_cash: number;
        total_gain_loss: number;
        total_day_change: number;
    };

    const [aggregates, setAggregates] = useState<Aggregates | null>(null);
    const [aggLoading, setAggLoading] = useState<boolean>(false);
    const [selectedPeriod, setSelectedPeriod] = useState("20");

    useEffect(() => {
        const fetchAggregates = async () => {
            try {
                setAggLoading(true);
                const base = (OpenAPI.BASE || '').replace(/\/$/, '');
                const res = await fetch(`${base}/api/v1/portfolio/aggregates`, {
                    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
                    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) {
                    setAggregates(null);
                    return;
                }
                const data = (await res.json()) as Aggregates;
                setAggregates(data);
            } catch {
                setAggregates(null);
            } finally {
                setAggLoading(false);
            }
        };
        fetchAggregates();
    }, []);

    // Fallback: if no selected portfolio provided, use the first one when available
    const portfolioForSummary = selectedPortfolio ?? (portfolios.length > 0 ? portfolios[0] : undefined);
    const gainLossSelected = portfolioForSummary ? (portfolioForSummary.totalValue - portfolioForSummary.totalCost) : 0;
    const gainLossPctSelected = portfolioForSummary && portfolioForSummary.totalCost > 0
        ? (gainLossSelected / portfolioForSummary.totalCost) * 100
        : 0;

    // Fetch Donchian Channel data for portfolio stocks
    const portfolioSymbols = useMemo(() => {
        return portfolioForSummary?.stocks.map(stock => stock.symbol) || [];
    }, [portfolioForSummary]);

    const { dataMap: donchianDataMap, isLoading: donchianLoading } = useDonchianChannelsBatch(
        portfolioSymbols,
        selectedPeriod
    );

    return (
        <div className="space-y-6">

            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-semibold text-foreground mb-2">My Portfolios</h1>
                    <p className="text-muted-foreground text-lg">Manage and monitor your investment portfolios</p>
                </div>
                <div className="flex items-center gap-2">
                    {onUploadPortfolio && (
                        <Button onClick={onUploadPortfolio} variant="outline" size="lg">
                            <Upload className="h-5 w-5 mr-2" />
                            Upload Portfolio
                        </Button>
                    )}
                    <Button onClick={onCreatePortfolio} size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Create Portfolio
                    </Button>
                </div>
            </div>

            {/* Aggregated Totals (All Portfolios) */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Value (All)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">
                            {aggregates ? formatCurrency(aggregates.total_portfolio_value) : (aggLoading ? '…' : '-')}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Gain/Loss (All)</CardTitle>
                        {(aggregates?.total_gain_loss ?? 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">
                            <span className={(aggregates?.total_gain_loss ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {aggregates ? formatCurrency(aggregates.total_gain_loss) : (aggLoading ? '…' : '-')}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Available Cash (All)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">
                            {aggregates ? formatCurrency(aggregates.total_available_cash) : (aggLoading ? '…' : '-')}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Day Change (All)</CardTitle>
                        {(aggregates?.total_day_change ?? 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">
                            <span className={(aggregates?.total_day_change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {aggregates ? formatCurrency(aggregates.total_day_change) : (aggLoading ? '…' : '-')}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Invested Amount (All)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl">
                            {aggregates ? formatCurrency(aggregates.total_invested_amount) : (aggLoading ? '…' : '-')}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Portfolios Grid */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Your Portfolios</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolios.map((portfolio) => {
                    const gainLoss = portfolio.totalValue - portfolio.totalCost - portfolio.cash;
                    const gainLossPercent = portfolio.totalCost > 0 ? (gainLoss / portfolio.totalCost) * 100 : 0;
                    return (
                        <Card key={portfolio.id} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => onSelectPortfolio(portfolio)}>
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

            {/* Selected Portfolio Holdings */}
            {portfolioForSummary && portfolioForSummary.stocks.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Selected Portfolio Holdings</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Showing stocks from: {portfolioForSummary.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="Period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5-day</SelectItem>
                                        <SelectItem value="10">10-day</SelectItem>
                                        <SelectItem value="20">20-day</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={() => onSelectPortfolio(portfolioForSummary)}>
                                    View Full Details
                                </Button>
                            </div>
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
                                    <TableHead className="text-right">S/R</TableHead>
                                    <TableHead className="text-right">Market Value</TableHead>
                                    <TableHead className="text-right">Gain/Loss</TableHead>
                                    <TableHead className="text-right">%</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {portfolioForSummary.stocks.map((stock) => {
                                    const marketValue = stock.quantity * stock.currentPrice;
                                    const costBasis = stock.quantity * stock.purchasePrice;
                                    const gainLoss = marketValue - costBasis;
                                    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

                                    const donchianData = donchianDataMap.get(stock.symbol);
                                    const primaryPeriod = parseInt(selectedPeriod.split(',')[0]);
                                    const channel = donchianData?.channels?.find(c => c.period === primaryPeriod);
                                    
                                    let supportValue: string | null = null;
                                    let resistanceValue: string | null = null;
                                    
                                    if (donchianLoading) {
                                        supportValue = null;
                                        resistanceValue = null;
                                    } else if (channel) {
                                        supportValue = channel.support.toFixed(2);
                                        resistanceValue = channel.resistance.toFixed(2);
                                    } else if (donchianData && donchianData.channels.length > 0) {
                                        // Fallback to first available channel if primary period not found
                                        const firstChannel = donchianData.channels[0];
                                        supportValue = firstChannel.support.toFixed(2);
                                        resistanceValue = firstChannel.resistance.toFixed(2);
                                    }

                                    return (
                                        <TableRow key={stock.id}>
                                            <TableCell>
                                                <div className="font-medium">{stock.symbol}</div>
                                                {stock.sector && stock.sector !== 'Unknown' && (
                                                    <Badge variant="outline" className="text-xs mt-1">
                                                        {stock.sector}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">{stock.companyName}</TableCell>
                                            <TableCell className="text-right">{stock.quantity}</TableCell>
                                            <TableCell
                                                className="text-right">{formatCurrency(stock.purchasePrice)}</TableCell>
                                            <TableCell
                                                className="text-right">{formatCurrency(stock.currentPrice)}</TableCell>
                                            <TableCell className="text-right text-xs py-2">
                                                {donchianLoading ? (
                                                    <div className="text-muted-foreground">...</div>
                                                ) : supportValue && resistanceValue ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-green-600 font-medium">{supportValue}</div>
                                                        <div className="border-t border-border/50 my-0.5"></div>
                                                        <div className="text-red-600 font-medium">{resistanceValue}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground">N/A</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(marketValue)}</TableCell>
                                            <TableCell
                                                className={`text-right ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                <div className="flex items-center justify-end gap-1">
                                                    {gainLoss >= 0 ? <TrendingUp className="h-3 w-3" /> :
                                                        <TrendingDown className="h-3 w-3" />}
                                                    {formatCurrency(gainLoss)}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                className={`text-right ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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