import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, BarChart3, ShoppingCart, Star } from 'lucide-react';
import { formatCurrency, formatMarketCap, formatPercent, getRatingColor } from '../../lib/screener-utils';
import type { ScreenerResult } from '../../hooks/useStockScreener';

interface ScreenerResultsTableProps {
    results: ScreenerResult[];
    totalResults: number;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    isEmptyState: boolean;
    isQueryDisabled: boolean;
    onChartStock: (symbol: string) => void;
    onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
    onAddToWatchlist: (symbol: string, companyName: string) => void;
}

export function ScreenerResultsTable({
    results,
    totalResults,
    isLoading,
    isFetching,
    isError,
    isEmptyState,
    isQueryDisabled,
    onChartStock,
    onQuickTrade,
    onAddToWatchlist,
}: ScreenerResultsTableProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Screening Results</CardTitle>
                    <Badge variant="secondary">
                        {isQueryDisabled ? 'Sign in required' : isFetching ? 'Updating…' : `${totalResults} stocks found`}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Symbol</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Sector</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Change</TableHead>
                                <TableHead className="text-right">Market Cap</TableHead>
                                <TableHead className="text-right">P/E</TableHead>
                                <TableHead className="text-right">Div Yield</TableHead>
                                <TableHead className="text-right">RSI</TableHead>
                                <TableHead className="text-right">20D MA</TableHead>
                                <TableHead className="text-right">50D MA</TableHead>
                                <TableHead>Rating</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isQueryDisabled ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                                        Sign in to run the stock screener and view results.
                                    </TableCell>
                                </TableRow>
                            ) : isLoading || isFetching ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                                        Loading screener data...
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="py-8 text-center text-sm text-destructive">
                                        Unable to load screening results. Please try refreshing.
                                    </TableCell>
                                </TableRow>
                            ) : isEmptyState ? (
                                <TableRow>
                                    <TableCell colSpan={13} className="py-8 text-center text-sm text-muted-foreground">
                                        No stocks match the selected filters. Adjust your filters or clear them to see more results.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((stock) => {
                                    const hasChange = stock.changePercent !== null && stock.changePercent !== undefined;
                                    const isGain = (stock.changePercent ?? 0) >= 0;
                                    return (
                                        <TableRow key={stock.symbol} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="font-medium">{stock.symbol}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-48 truncate font-medium">{stock.companyName}</div>
                                                {stock.industry && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-48">{stock.industry}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {stock.sector ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {stock.sector}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(stock.price)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {hasChange ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        {isGain ? (
                                                            <TrendingUp className="h-3 w-3 text-green-600" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3 text-red-600" />
                                                        )}
                                                        <span className={isGain ? 'text-green-600' : 'text-red-600'}>
                                                            {formatPercent(stock.changePercent)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatMarketCap(stock.marketCap)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stock.peRatio !== null && stock.peRatio !== undefined ? stock.peRatio.toFixed(1) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stock.dividendYield !== null && stock.dividendYield !== undefined ? `${stock.dividendYield.toFixed(2)}%` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {stock.rsi !== null && stock.rsi !== undefined ? stock.rsi.toFixed(0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(stock.sma20)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(stock.sma50)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getRatingColor(stock.rating)}>
                                                    {stock.rating}
                                                </Badge>
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
                                                        onClick={() => onAddToWatchlist(stock.symbol, stock.companyName)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Star className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
