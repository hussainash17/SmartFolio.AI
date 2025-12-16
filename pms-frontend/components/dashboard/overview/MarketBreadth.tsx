import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { useMarketSummary, useStockDistribution } from '../../../hooks/useDashboardMarket';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart2, PieChart, BarChart3 } from 'lucide-react';

const MarketBreadth: React.FC = () => {
    const { data: marketSummary } = useMarketSummary();
    const { data: distributionData, isLoading: isLoadingDistribution } = useStockDistribution();

    // Use real data if available, otherwise fallback to safe defaults
    const gainers = marketSummary?.advancers || 0;
    const losers = marketSummary?.decliners || 0;
    const unchanged = marketSummary?.unchanged || 0;
    const total = gainers + losers + unchanged;

    // If no data, show a placeholder state
    const hasData = total > 0;
    const safeTotal = hasData ? total : 1;

    const getWidth = (val: number) => `${(val / safeTotal) * 100}%`;

    // Get calculated fields from API
    const adRatio = marketSummary?.ad_ratio || 0;
    const netBreadth = marketSummary?.net_breadth || 0;
    const totalActive = marketSummary?.total_active || 0;
    const sentiment = marketSummary?.sentiment || "Neutral";

    // Calculate volume breadth percentages
    const volumeUp = marketSummary?.volume_breadth_up || 0;
    const volumeDown = marketSummary?.volume_breadth_down || 0;
    const totalVolumeBreadth = volumeUp + volumeDown;
    const volumeBreadthUp = totalVolumeBreadth > 0 ? Math.round((volumeUp / totalVolumeBreadth) * 100) : 0;
    const volumeBreadthDown = totalVolumeBreadth > 0 ? Math.round((volumeDown / totalVolumeBreadth) * 100) : 0;

    // Distribution histogram data
    const distribution = distributionData?.distribution || {
        "0%": 0,
        "0 to 2%": 0,
        "0 to -2%": 0,
        "2 to 5%": 0,
        "-2 to -5%": 0,
        "5 to 10%": 0,
        "-5 to -10%": 0,
    };

    // Create histogram bins in order: negative to positive
    const histogramBins = [
        { label: "-5 to -10%", value: distribution["-5 to -10%"], color: "bg-red-600" },
        { label: "-2 to -5%", value: distribution["-2 to -5%"], color: "bg-red-500" },
        { label: "0 to -2%", value: distribution["0 to -2%"], color: "bg-red-400" },
        { label: "0%", value: distribution["0%"], color: "bg-gray-400" },
        { label: "0 to 2%", value: distribution["0 to 2%"], color: "bg-green-400" },
        { label: "2 to 5%", value: distribution["2 to 5%"], color: "bg-green-500" },
        { label: "5 to 10%", value: distribution["5 to 10%"], color: "bg-green-600" },
    ];

    // Calculate max value for scaling
    const maxValue = Math.max(...histogramBins.map(b => b.value), 1);

    return (
        <Card className="h-full border-none shadow-sm flex flex-col">
            <CardContent className="flex-1 flex flex-col px-4 pb-4">
                <Tabs defaultValue="breadth" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-3">
                        <TabsTrigger value="breadth" className="text-xs">Breadth</TabsTrigger>
                        <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
                    </TabsList>

                    {/* Market Breadth Tab */}
                    <TabsContent value="breadth" className="flex-1 flex flex-col justify-between gap-4 mt-0">
                        {/* Top Row: Gainers / Losers / Unchanged Bar */}
                        <div className="space-y-2">
                            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                                {hasData && (
                                    <>
                                        <div style={{ width: getWidth(gainers) }} className="bg-green-500" title={`Gainers: ${gainers}`} />
                                        <div style={{ width: getWidth(unchanged) }} className="bg-gray-300 dark:bg-gray-600" title={`Unchanged: ${unchanged}`} />
                                        <div style={{ width: getWidth(losers) }} className="bg-red-500" title={`Losers: ${losers}`} />
                                    </>
                                )}
                            </div>
                            <div className="flex justify-between text-xs">
                                <div className="text-left">
                                    <span className="text-green-600 font-bold">{gainers}</span> <span className="text-muted-foreground">Adv</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-muted-foreground font-bold">{unchanged}</span> <span className="text-muted-foreground">Unch</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-red-600 font-bold">{losers}</span> <span className="text-muted-foreground">Dec</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Row: Key Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center divide-x divide-border">
                            <div className="flex flex-col items-center justify-center" title="Advance/Decline Ratio">
                                <span className="text-xs text-muted-foreground mb-0.5 cursor-help">A/D Ratio</span>
                                <span className="text-sm font-bold text-foreground">{adRatio}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center" title="Net Breadth (Advancers - Decliners)">
                                <span className="text-xs text-muted-foreground mb-0.5 cursor-help">Net Breadth</span>
                                <span className={`text-sm font-bold ${netBreadth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {netBreadth > 0 ? '+' : ''}{netBreadth}
                                </span>
                            </div>
                            <div className="flex flex-col items-center justify-center" title="Total Active Stocks">
                                <span className="text-xs text-muted-foreground mb-0.5 cursor-help">Active</span>
                                <span className="text-sm font-bold text-foreground">{totalActive}</span>
                            </div>
                        </div>

                        {/* Bottom Row: Sentiment & Volume */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Market Sentiment (Based on Advancers vs Decliners)">
                                    <PieChart className="h-3 w-3" />
                                    <span className="cursor-help">Sentiment</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${sentiment === 'Bullish'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : sentiment === 'Bearish'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}>
                                        {sentiment}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Volume Breadth (Gainer vs Loser Volume Distribution)">
                                    <BarChart2 className="h-3 w-3" />
                                    <span className="cursor-help">Vol. Breadth</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-green-600 font-medium">{volumeBreadthUp}%</span>
                                    <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden flex">
                                        <div style={{ width: `${volumeBreadthUp}%` }} className="bg-green-500" />
                                        <div style={{ width: `${volumeBreadthDown}%` }} className="bg-red-500" />
                                    </div>
                                    <span className="text-red-600 font-medium">{volumeBreadthDown}%</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Distribution Histogram Tab */}
                    <TabsContent value="distribution" className="flex-1 flex flex-col mt-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <BarChart3 className="h-3 w-3" />
                            <span>Advancers & Decliners Distribution</span>
                        </div>

                        {isLoadingDistribution ? (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                                Loading...
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                {/* Vertical Bar Chart */}
                                <div className="flex-1 flex items-end justify-between gap-1 px-1">
                                    {histogramBins.map((bin) => (
                                        <div key={bin.label} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[9px] font-medium text-foreground">
                                                {bin.value}
                                            </span>
                                            <div className="w-full bg-muted/50 rounded-t-sm relative" style={{ height: '80px' }}>
                                                <div
                                                    className={`absolute bottom-0 w-full ${bin.color} rounded-t-sm transition-all duration-300`}
                                                    style={{ height: `${(bin.value / maxValue) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* X-axis labels */}
                                <div className="flex justify-between gap-1 px-1 mt-1 border-t border-border pt-1">
                                    {histogramBins.map((bin) => (
                                        <div
                                            key={bin.label}
                                            className="flex-1 text-center text-[8px] text-muted-foreground leading-tight"
                                            title={bin.label}
                                        >
                                            {bin.label.replace(' to ', '→').replace('%', '')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Summary stats */}
                        <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>
                                    <span className="text-red-500 font-medium">
                                        {distribution["-5 to -10%"] + distribution["-2 to -5%"] + distribution["0 to -2%"]}
                                    </span> declining
                                </span>
                                <span>
                                    <span className="text-gray-500 font-medium">{distribution["0%"]}</span> unchanged
                                </span>
                                <span>
                                    <span className="text-green-500 font-medium">
                                        {distribution["0 to 2%"] + distribution["2 to 5%"] + distribution["5 to 10%"]}
                                    </span> advancing
                                </span>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default MarketBreadth;
