import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { MarketService } from '@/src/client';

interface RightPanelProps {
    currentSymbol: string;
    onPlaceOrder?: (symbol: string, side: 'buy' | 'sell') => void;
}

interface SymbolInfo {
    symbol: string;
    company_name?: string;
    last_trade_price?: number;
    change?: number;
    change_percent?: number;
    high?: number;
    low?: number;
    volume?: number;
    market_cap?: number;
    pe_ratio?: number;
    week_52_high?: number;
    week_52_low?: number;
}

export function RightPanel({ currentSymbol, onPlaceOrder }: RightPanelProps) {
    const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [quantity, setQuantity] = useState('');
    const [limitPrice, setLimitPrice] = useState('');

    // Load symbol info when symbol changes
    useEffect(() => {
        if (currentSymbol) {
            loadSymbolInfo();
        }
    }, [currentSymbol]);

    const loadSymbolInfo = async () => {
        if (!currentSymbol) return;

        setLoading(true);
        try {
            const data = await MarketService.getStock({ symbol: currentSymbol });
            const stockData = (data as any)?.data || data;

            setSymbolInfo({
                symbol: currentSymbol,
                company_name: stockData?.company_name,
                last_trade_price: stockData?.last_trade_price ?? stockData?.last,
                change: stockData?.change,
                change_percent: stockData?.change_percent,
                high: stockData?.high ?? stockData?.day_high,
                low: stockData?.low ?? stockData?.day_low,
                volume: stockData?.volume,
                market_cap: stockData?.market_cap,
                pe_ratio: stockData?.pe_ratio,
                week_52_high: stockData?.week_52_high,
                week_52_low: stockData?.week_52_low,
            });
        } catch (error) {
            console.error('Error loading symbol info:', error);
            setSymbolInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = () => {
        if (onPlaceOrder && currentSymbol) {
            onPlaceOrder(currentSymbol, 'buy');
        }
    };

    const handleSell = () => {
        if (onPlaceOrder && currentSymbol) {
            onPlaceOrder(currentSymbol, 'sell');
        }
    };

    const formatPrice = (price?: number) => {
        if (price === undefined || price === null) return '--';
        return price.toFixed(2);
    };

    const formatNumber = (num?: number) => {
        if (num === undefined || num === null) return '--';
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(0);
    };

    const getChangeColor = (change?: number) => {
        if (!change) return 'text-muted-foreground';
        return change >= 0 ? 'text-emerald-500' : 'text-rose-500';
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Symbol Info Section */}
            <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-bold text-lg">{currentSymbol || 'No Symbol'}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {symbolInfo?.company_name || '--'}
                        </p>
                    </div>
                    <button
                        onClick={loadSymbolInfo}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Refresh"
                    >
                        <Info className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {loading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                ) : symbolInfo ? (
                    <>
                        <div className="mb-3">
                            <div className="text-2xl font-bold font-mono">
                                ₹{formatPrice(symbolInfo.last_trade_price)}
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(symbolInfo.change)}`}>
                                {symbolInfo.change !== undefined && symbolInfo.change >= 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                ) : (
                                    <TrendingDown className="w-4 h-4" />
                                )}
                                <span>
                                    {symbolInfo.change !== undefined && symbolInfo.change !== null
                                        ? `${symbolInfo.change >= 0 ? '+' : ''}${symbolInfo.change.toFixed(2)}`
                                        : '--'}
                                    {symbolInfo.change_percent !== undefined && symbolInfo.change_percent !== null
                                        ? ` (${symbolInfo.change_percent >= 0 ? '+' : ''}${symbolInfo.change_percent.toFixed(2)}%)`
                                        : ''}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <div className="text-muted-foreground">High</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.high)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Low</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.low)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Volume</div>
                                <div className="font-semibold">{formatNumber(symbolInfo.volume)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Mkt Cap</div>
                                <div className="font-semibold">{formatNumber(symbolInfo.market_cap)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">52W High</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.week_52_high)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">52W Low</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.week_52_low)}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-sm text-muted-foreground">Select a symbol to view details</div>
                )}
            </div>

            {/* Order Entry Section */}
            <div className="p-4 space-y-4">
                <h4 className="font-semibold text-sm">Quick Order</h4>

                {/* Order Type */}
                <div>
                    <label className="block text-xs text-muted-foreground mb-1">Order Type</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setOrderType('market')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${orderType === 'market'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background text-foreground border border-border hover:bg-accent'
                                }`}
                        >
                            Market
                        </button>
                        <button
                            onClick={() => setOrderType('limit')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${orderType === 'limit'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background text-foreground border border-border hover:bg-accent'
                                }`}
                        >
                            Limit
                        </button>
                    </div>
                </div>

                {/* Quantity */}
                <div>
                    <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {/* Limit Price (only for limit orders) */}
                {orderType === 'limit' && (
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">Limit Price</label>
                        <input
                            type="number"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                )}

                {/* Order Value */}
                <div className="p-3 bg-background rounded border border-border">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Order Value</span>
                        <span className="font-semibold font-mono">
                            ₹{quantity && symbolInfo?.last_trade_price
                                ? (parseFloat(quantity) * symbolInfo.last_trade_price).toFixed(2)
                                : '0.00'}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleBuy}
                        disabled={!currentSymbol || !quantity}
                        className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Buy
                    </button>
                    <button
                        onClick={handleSell}
                        disabled={!currentSymbol || !quantity}
                        className="flex-1 py-3 bg-rose-500 text-white font-semibold rounded hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sell
                    </button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                    Orders are placed on your default portfolio
                </p>
            </div>
        </div>
    );
}
