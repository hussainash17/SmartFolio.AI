import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { useMarketSummary } from '../../../hooks/useDashboardMarket';

const MarketBreadth: React.FC = () => {
    const { data: marketSummary } = useMarketSummary();
    console.log("Market Summary", marketSummary);

    // Use real data if available, otherwise fallback to safe defaults (avoid division by zero)
    const gainers = marketSummary?.advancers || 0;
    const losers = marketSummary?.decliners || 0;
    const unchanged = marketSummary?.unchanged || 0;
    const total = gainers + losers + unchanged;

    // If no data, show a placeholder state
    const hasData = total > 0;
    const safeTotal = hasData ? total : 1;

    const getWidth = (val: number) => `${(val / safeTotal) * 100}%`;

    return (
        <Card className="h-full border-none shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Market Breadth</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-muted">
                    {hasData && (
                        <>
                            <div style={{ width: getWidth(gainers) }} className="bg-green-500" title={`Gainers: ${gainers}`} />
                            <div style={{ width: getWidth(unchanged) }} className="bg-gray-300 dark:bg-gray-600" title={`Unchanged: ${unchanged}`} />
                            <div style={{ width: getWidth(losers) }} className="bg-red-500" title={`Losers: ${losers}`} />
                        </>
                    )}
                </div>

                <div className="flex justify-between text-sm">
                    <div className="text-center">
                        <p className="text-green-600 font-bold">{gainers}</p>
                        <p className="text-xs text-muted-foreground">Gainers</p>
                    </div>
                    <div className="text-center">
                        <p className="text-muted-foreground font-bold">{unchanged}</p>
                        <p className="text-xs text-muted-foreground">Unchanged</p>
                    </div>
                    <div className="text-center">
                        <p className="text-red-600 font-bold">{losers}</p>
                        <p className="text-xs text-muted-foreground">Losers</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MarketBreadth;
