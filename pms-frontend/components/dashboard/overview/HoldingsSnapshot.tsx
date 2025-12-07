import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useDashboardPortfolios } from '../../../hooks/useDashboardPortfolios';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

export interface HoldingItem {
    id: string;
    symbol: string;
    companyName?: string;
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    currentValue: number;
    gain: number;
    gainPercent: number;
    change: number;
    sector?: string;
}

interface HoldingsSnapshotProps {
    portfolioId?: string;
    holdings?: HoldingItem[];
}

const HoldingsSnapshot: React.FC<HoldingsSnapshotProps> = ({ portfolioId, holdings }) => {
    const { enrichedPortfolios } = useDashboardPortfolios([]);

    // Use provided holdings if available (from API), otherwise fall back to client-side aggregation
    const topHoldings = useMemo(() => {
        if (holdings && holdings.length > 0) {
            // Use API-provided holdings, sorted by value descending and take top 5
            return [...holdings]
                .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
                .slice(0, 5);
        }

        // Fall back to client-side aggregation
        const allStocks = portfolioId
            ? enrichedPortfolios.find(p => p.id === portfolioId)?.stocks || []
            : enrichedPortfolios.flatMap(p => p.stocks);

        // Transform to match HoldingItem structure
        return allStocks
            .map(stock => ({
                id: stock.id,
                symbol: stock.symbol,
                companyName: stock.companyName,
                quantity: stock.quantity,
                purchasePrice: stock.purchasePrice,
                currentPrice: stock.currentPrice,
                currentValue: stock.quantity * stock.currentPrice,
                gain: (stock.currentPrice - stock.purchasePrice) * stock.quantity,
                gainPercent: stock.purchasePrice > 0 
                    ? ((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100 
                    : 0,
                change: 0, // Not available from client-side data
                sector: stock.sector
            }))
            .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
            .slice(0, 5);
    }, [holdings, portfolioId, enrichedPortfolios]);

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium">Top Holdings</CardTitle>
                <Button variant="link" className="text-primary text-xs font-medium h-auto p-0">View All</Button>
            </CardHeader>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-muted-foreground border-b border-border">
                        <tr>
                            <th className="pb-2 font-medium text-xs">Ticker</th>
                            <th className="pb-2 font-medium text-right text-xs">LTP</th>
                            <th className="pb-2 font-medium text-right text-xs">Qty</th>
                            <th className="pb-2 font-medium text-right text-xs">Value</th>
                            <th className="pb-2 font-medium text-right text-xs">Gain/Loss</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {topHoldings.map((stock) => {
                            const change = Number(stock.change || 0);
                            const gain = Number(stock.gain || 0);
                            const gainPercent = Number(stock.gainPercent || 0);

                            return (
                                <tr key={`${stock.symbol}-${stock.id}`} className="group hover:bg-muted/50 transition-colors">
                                    <td className="py-2 font-medium text-xs">{stock.symbol}</td>
                                    <td className="py-2 text-right">
                                        <div className="text-xs">{Number(stock.currentPrice).toFixed(1)}</div>
                                        <div className={cn("text-[10px] flex items-center justify-end gap-0.5", change >= 0 ? "text-green-600" : "text-red-600")}>
                                            {change >= 0 ? <ArrowUp size={8} /> : <ArrowDown size={8} />}
                                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td className="py-2 text-right text-xs">{stock.quantity}</td>
                                    <td className="py-2 text-right font-medium text-xs">{formatCurrency(stock.currentValue)}</td>
                                    <td className="py-2 text-right">
                                        <div className={cn("font-medium text-xs", gain >= 0 ? "text-green-600" : "text-red-600")}>
                                            {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                                        </div>
                                        <div className={cn("text-[10px]", gainPercent >= 0 ? "text-green-600" : "text-red-600")}>
                                            {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {topHoldings.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">
                                    No holdings found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default HoldingsSnapshot;
