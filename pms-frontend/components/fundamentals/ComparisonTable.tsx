import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Download, Trophy, AlertTriangle, X } from "lucide-react";

interface ComparisonStock {
    symbol: string;
    companyName: string;
    ltp: number;
    pe: number;
    dividendYield: number;
    roe: number;
    debtToEquity: number;
    marketCap: number;
    eps: number;
    navPerShare: number;
}

interface ComparisonTableProps {
    stocks: ComparisonStock[];
    onRemove?: (symbol: string) => void;
    onExport?: () => void;
}

function formatNumber(n?: number | null) {
    if (n === undefined || n === null || !isFinite(n)) return "-";
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getBestValue(values: number[], lowerIsBetter: boolean = false): number | null {
    const validValues = values.filter(v => isFinite(v));
    if (validValues.length === 0) return null;
    return lowerIsBetter ? Math.min(...validValues) : Math.max(...validValues);
}

function isHighlighted(value: number, bestValue: number | null, lowerIsBetter: boolean = false): boolean {
    if (bestValue === null || !isFinite(value)) return false;
    return lowerIsBetter ? value === bestValue : value === bestValue;
}

export function ComparisonTable({ stocks, onRemove, onExport }: ComparisonTableProps) {
    if (!stocks || stocks.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No stocks selected for comparison</p>
                    <p className="text-sm mt-2">Add stocks from the grid view to see side-by-side comparison</p>
                </CardContent>
            </Card>
        );
    }

    // Calculate best values for highlighting
    const bestPE = getBestValue(stocks.map(s => s.pe), true);
    const bestDivYield = getBestValue(stocks.map(s => s.dividendYield));
    const bestROE = getBestValue(stocks.map(s => s.roe));
    const bestDebtEquity = getBestValue(stocks.map(s => s.debtToEquity), true);
    const bestEPS = getBestValue(stocks.map(s => s.eps));

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Stock Comparison ({stocks.length} stocks)</CardTitle>
                {onExport && (
                    <Button variant="outline" size="sm" onClick={onExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-10">Metric</TableHead>
                                {stocks.map((stock) => (
                                    <TableHead key={stock.symbol} className="min-w-[150px]">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold">{stock.symbol}</div>
                                                {onRemove && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onRemove(stock.symbol)}
                                                        className="h-6 w-6 p-0 hover:bg-destructive/10"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-normal truncate">
                                                {stock.companyName}
                                            </div>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">Last Price</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell key={stock.symbol}>{formatNumber(stock.ltp)}</TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">P/E Ratio</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell
                                        key={stock.symbol}
                                        className={isHighlighted(stock.pe, bestPE, true) ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {formatNumber(stock.pe)}
                                            {isHighlighted(stock.pe, bestPE, true) && <Trophy className="h-3 w-3 text-green-600" />}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">Dividend Yield</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell
                                        key={stock.symbol}
                                        className={isHighlighted(stock.dividendYield, bestDivYield) ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {stock.dividendYield?.toFixed(2)}%
                                            {isHighlighted(stock.dividendYield, bestDivYield) && <Trophy className="h-3 w-3 text-green-600" />}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">ROE</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell
                                        key={stock.symbol}
                                        className={isHighlighted(stock.roe, bestROE) ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {stock.roe?.toFixed(2)}%
                                            {isHighlighted(stock.roe, bestROE) && <Trophy className="h-3 w-3 text-green-600" />}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">Debt/Equity</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell
                                        key={stock.symbol}
                                        className={isHighlighted(stock.debtToEquity, bestDebtEquity, true) ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {formatNumber(stock.debtToEquity)}
                                            {isHighlighted(stock.debtToEquity, bestDebtEquity, true) && <Trophy className="h-3 w-3 text-green-600" />}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">Market Cap</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell key={stock.symbol}>{formatNumber(stock.marketCap)}M</TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">EPS</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell
                                        key={stock.symbol}
                                        className={isHighlighted(stock.eps, bestEPS) ? 'bg-green-50 dark:bg-green-950/20 font-semibold' : ''}
                                    >
                                        <div className="flex items-center gap-1">
                                            {formatNumber(stock.eps)}
                                            {isHighlighted(stock.eps, bestEPS) && <Trophy className="h-3 w-3 text-green-600" />}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell className="sticky left-0 bg-background font-medium">NAV/Share</TableCell>
                                {stocks.map((stock) => (
                                    <TableCell key={stock.symbol}>{formatNumber(stock.navPerShare)}</TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Trophy className="h-3 w-3 text-green-600" />
                    <span>Highlighted cells indicate the best value for that metric</span>
                </div>
            </CardContent>
        </Card>
    );
}
