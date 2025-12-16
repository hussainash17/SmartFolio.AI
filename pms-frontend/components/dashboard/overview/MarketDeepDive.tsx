import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { ArrowUp, ArrowDown, Zap, AlertTriangle } from 'lucide-react';
import { useMarketTopMovers, useMarketMostActive, useMarketMostVolatile } from '../../../hooks/useDashboardMarket';
import { useBlockTransactions } from '../../../hooks/useBlockTransactions';

// --- Sub-components ---

const MarketMovers = () => {
    const { data } = useMarketTopMovers();
    const { data: mostActiveData } = useMarketMostActive();
    const { data: mostVolatileData } = useMarketMostVolatile();

    const gainers = data?.gainers || [];
    const losers = data?.losers || [];
    const mostActive = mostActiveData || [];
    const mostVolatile = mostVolatileData || [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Top Gainers */}
            <div>
                <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                    <ArrowUp size={16} /> Top Gainers
                </h4>
                <div className="space-y-2">
                    {gainers.slice(0, 5).map((stock, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-green-50/50 dark:bg-green-900/10 rounded-md">
                            <span className="font-medium text-sm">{stock.symbol}</span>
                            <span className="font-bold text-sm text-green-600">+{stock.change_percent.toFixed(2)}%</span>
                        </div>
                    ))}
                    {gainers.length === 0 && <div className="text-xs text-muted-foreground">No gainers data</div>}
                </div>
            </div>

            {/* Top Losers */}
            <div>
                <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ArrowDown size={16} /> Top Losers
                </h4>
                <div className="space-y-2">
                    {losers.slice(0, 5).map((stock, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-red-50/50 dark:bg-red-900/10 rounded-md">
                            <span className="font-medium text-sm">{stock.symbol}</span>
                            <span className="font-bold text-sm text-red-600">{stock.change_percent.toFixed(2)}%</span>
                        </div>
                    ))}
                    {losers.length === 0 && <div className="text-xs text-muted-foreground">No losers data</div>}
                </div>
            </div>

            {/* Most Active */}
            <div>
                <h4 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2">
                    <Zap size={16} /> Most Active
                </h4>
                <div className="space-y-2">
                    {mostActive.slice(0, 5).map((stock, i) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-md">
                            <span className="font-medium text-sm">{stock.symbol}</span>
                            <span className="font-bold text-sm text-blue-600">{(stock.volume / 1000000).toFixed(2)}M</span>
                        </div>
                    ))}
                    {mostActive.length === 0 && <div className="text-xs text-muted-foreground">No active data</div>}
                </div>
            </div>

            {/* Most Volatile */}
            <div>
                <h4 className="text-sm font-medium text-orange-600 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} /> Most Volatile (%)
                </h4>
                <div className="space-y-2">
                    {mostVolatile.slice(0, 5).map((stock, i) => (
                        <div key={i} className="flex justify-between items-center gap-2 p-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-md">
                            <span className="font-medium text-sm">{stock.symbol}</span>
                            <span className="font-bold text-sm text-orange-600">{stock.true_range_pct.toFixed(2)}%</span>
                        </div>
                    ))}
                    {mostVolatile.length === 0 && <div className="text-xs text-muted-foreground">No volatile data</div>}
                </div>
            </div>
        </div>
    );
};

const BlockTrades = () => {
    const { data: blockTransactions, isLoading } = useBlockTransactions();

    // Format volume with commas
    const formatVolume = (volume: number) => {
        return volume.toLocaleString('en-IN');
    };

    // Format value in Crore/Lakh
    const formatValue = (value: number) => {
        if (value >= 1) {
            return `${value.toFixed(2)} Cr`;
        }
        return `${(value * 100).toFixed(2)} L`;
    };

    // Format price range
    const formatPrice = (minPrice: number, maxPrice: number) => {
        if (minPrice === maxPrice) {
            return minPrice.toFixed(2);
        }
        return `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-lg bg-card animate-pulse">
                        <div className="space-y-2">
                            <div className="h-4 w-20 bg-muted rounded"></div>
                            <div className="h-3 w-16 bg-muted rounded"></div>
                        </div>
                        <div className="space-y-2 text-right">
                            <div className="h-4 w-16 bg-muted rounded ml-auto"></div>
                            <div className="h-3 w-24 bg-muted rounded ml-auto"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    const trades = blockTransactions || [];

    if (trades.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground">
                No block transactions available
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                    <div>
                        <p className="font-bold text-sm">{trade.code}</p>
                        <p className="text-xs text-muted-foreground">{trade.trades} trade{trade.trades > 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-medium text-sm">৳ {formatValue(trade.value)}</p>
                        <p className="text-xs text-muted-foreground">@ {formatPrice(trade.minPrice, trade.maxPrice)} ({formatVolume(trade.volume)})</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const CircuitBreakers = () => (
    <div className="space-y-3">
        <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
            <h5 className="text-xs font-bold text-green-700 dark:text-green-400 uppercase mb-2">Upper Circuit (Halted)</h5>
            <div className="flex flex-wrap gap-2">
                {['ORIONINFU', 'BDTHAI', 'KEYACOSMET'].map(s => (
                    <span key={s} className="px-2 py-1 bg-white dark:bg-green-900/30 rounded text-xs font-medium shadow-sm">{s}</span>
                ))}
            </div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
            <h5 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-2">Lower Circuit (Halted)</h5>
            <div className="flex flex-wrap gap-2">
                {['FAREASTLIF', 'ILFSL'].map(s => (
                    <span key={s} className="px-2 py-1 bg-white dark:bg-red-900/30 rounded text-xs font-medium shadow-sm">{s}</span>
                ))}
            </div>
        </div>
    </div>
);

const ForeignActivity = () => (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground uppercase">Net Buy</p>
                <p className="text-lg font-bold text-green-600">+12.5 Cr</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground uppercase">Net Sell</p>
                <p className="text-lg font-bold text-red-600">-8.2 Cr</p>
            </div>
        </div>
        <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">Top Foreign Picks</h5>
            <div className="space-y-2">
                <div className="flex justify-between text-sm border-b pb-1">
                    <span>OLYMPIC</span>
                    <span className="text-green-600 font-medium">+ Buy</span>
                </div>
                <div className="flex justify-between text-sm border-b pb-1">
                    <span>BRACBANK</span>
                    <span className="text-green-600 font-medium">+ Buy</span>
                </div>
                <div className="flex justify-between text-sm border-b pb-1">
                    <span>BATBC</span>
                    <span className="text-red-600 font-medium">- Sell</span>
                </div>
            </div>
        </div>
    </div>
);

// --- Main Component ---

const MarketDeepDive: React.FC = () => {
    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle>Market Deep Dive</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="movers">
                    <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="movers" className="text-xs">Movers</TabsTrigger>
                        <TabsTrigger value="blocks" className="text-xs">Blocks</TabsTrigger>
                        <TabsTrigger value="circuits" className="text-xs">Circuits</TabsTrigger>
                        <TabsTrigger value="foreign" className="text-xs">Foreign</TabsTrigger>
                    </TabsList>

                    <TabsContent value="movers" className="mt-0">
                        <MarketMovers />
                    </TabsContent>
                    <TabsContent value="blocks" className="mt-0">
                        <BlockTrades />
                    </TabsContent>
                    <TabsContent value="circuits" className="mt-0">
                        <CircuitBreakers />
                    </TabsContent>
                    <TabsContent value="foreign" className="mt-0">
                        <ForeignActivity />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default MarketDeepDive;
