import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Info, FileText, Calendar, Newspaper, DollarSign } from 'lucide-react';
import { MarketService } from '../../src/client';
import { formatPrice, formatNumber, getChangeColor } from '../../lib/formatting-utils';

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
    eps?: number;
    dividend_yield?: number;
    sector?: string;
}

type Tab = 'fundamentals' | 'financials' | 'news' | 'events';

export function RightPanel({ currentSymbol, onPlaceOrder }: RightPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('fundamentals');
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
                last_trade_price: Number(stockData?.last_trade_price ?? stockData?.last ?? 0),
                change: Number(stockData?.change ?? 0),
                change_percent: Number(stockData?.change_percent ?? 0),
                high: Number(stockData?.high ?? stockData?.day_high ?? 0),
                low: Number(stockData?.low ?? stockData?.day_low ?? 0),
                volume: Number(stockData?.volume ?? 0),
                market_cap: Number(stockData?.market_cap ?? 0),
                pe_ratio: Number(stockData?.pe_ratio ?? 0),
                week_52_high: Number(stockData?.week_52_high ?? 0),
                week_52_low: Number(stockData?.week_52_low ?? 0),
                eps: Number(stockData?.eps || 12.5), // Mock
                dividend_yield: Number(stockData?.dividend_yield || 2.5), // Mock
                sector: stockData?.sector || 'Pharma', // Mock
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

    const renderFundamentals = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Market Cap</div>
                    <div className="font-semibold text-sm">{formatNumber(symbolInfo?.market_cap)}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">P/E Ratio</div>
                    <div className="font-semibold text-sm">{symbolInfo?.pe_ratio?.toFixed(2) || '--'}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">EPS (TTM)</div>
                    <div className="font-semibold text-sm flex items-center gap-1">
                        {symbolInfo?.eps?.toFixed(2)}
                        <span className="text-[10px] text-emerald-500">(+5% YoY)</span>
                    </div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Div Yield</div>
                    <div className="font-semibold text-sm">{symbolInfo?.dividend_yield?.toFixed(2)}%</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">52W High</div>
                    <div className="font-semibold text-sm">{formatPrice(symbolInfo?.week_52_high)}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">52W Low</div>
                    <div className="font-semibold text-sm">{formatPrice(symbolInfo?.week_52_low)}</div>
                </div>
            </div>

            <div className="p-3 border border-border rounded-md">
                <h4 className="text-xs font-semibold mb-2">Analyst Rating</h4>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-emerald-500 rounded-full opacity-80" />
                    <div className="flex-1 h-2 bg-emerald-200 rounded-full opacity-50" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                    <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>Strong Buy</span>
                    <span>Hold</span>
                    <span>Sell</span>
                </div>
            </div>
        </div>
    );

    const renderFinancials = () => (
        <div className="space-y-4">
            <div className="flex justify-end mb-2">
                <div className="flex bg-muted rounded p-0.5">
                    <button className="px-2 py-0.5 text-[10px] bg-background rounded shadow-sm">Annual</button>
                    <button className="px-2 py-0.5 text-[10px] text-muted-foreground">Quarterly</button>
                </div>
            </div>

            <table className="w-full text-xs">
                <thead>
                    <tr className="text-muted-foreground border-b border-border">
                        <th className="text-left py-1 font-medium">Metric</th>
                        <th className="text-right py-1 font-medium">2024</th>
                        <th className="text-right py-1 font-medium">2023</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    <tr>
                        <td className="py-2">Revenue</td>
                        <td className="text-right font-mono">12.5B</td>
                        <td className="text-right font-mono text-muted-foreground">11.2B</td>
                    </tr>
                    <tr>
                        <td className="py-2">Net Income</td>
                        <td className="text-right font-mono">2.1B</td>
                        <td className="text-right font-mono text-muted-foreground">1.8B</td>
                    </tr>
                    <tr>
                        <td className="py-2">Op. Cash Flow</td>
                        <td className="text-right font-mono">3.5B</td>
                        <td className="text-right font-mono text-muted-foreground">3.1B</td>
                    </tr>
                    <tr>
                        <td className="py-2">Profit Margin</td>
                        <td className="text-right font-mono text-emerald-500">16.8%</td>
                        <td className="text-right font-mono text-muted-foreground">16.1%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );

    const renderNews = () => (
        <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                <span className="text-xs font-medium text-emerald-500">Market Sentiment</span>
                <span className="text-sm font-bold text-emerald-500">Bullish (72%)</span>
            </div>

            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="group cursor-pointer">
                        <div className="text-xs text-muted-foreground mb-0.5">2 hours ago • Financial Express</div>
                        <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                            {symbolInfo?.symbol} reports strong Q3 earnings growth, beating analyst expectations by 15%
                        </h4>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderEvents = () => (
        <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 border border-border rounded-md">
                <div className="p-2 bg-primary/10 rounded text-primary">
                    <Calendar className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-sm font-medium">Q4 Earnings Report</h4>
                    <p className="text-xs text-muted-foreground">Oct 24, 2025 (Estimated)</p>
                </div>
            </div>
            <div className="flex items-start gap-3 p-3 border border-border rounded-md">
                <div className="p-2 bg-emerald-500/10 rounded text-emerald-500">
                    <DollarSign className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-sm font-medium">Dividend Payout</h4>
                    <p className="text-xs text-muted-foreground">Nov 15, 2025 • ₹2.50 / share</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Symbol Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-bold text-lg">{currentSymbol || 'No Symbol'}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {symbolInfo?.company_name || '--'}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="font-mono font-bold text-lg">
                            ₹{formatPrice(symbolInfo?.last_trade_price)}
                        </div>
                        <div className={`text-xs font-medium ${getChangeColor(symbolInfo?.change)}`}>
                            {symbolInfo?.change !== undefined && symbolInfo.change >= 0 ? '+' : ''}
                            {symbolInfo?.change?.toFixed(2)} ({symbolInfo?.change_percent?.toFixed(2)}%)
                        </div>
                    </div>
                </div>

                {/* Quick Order Buttons */}
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={handleBuy}
                        disabled={!currentSymbol}
                        className="flex-1 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                        BUY
                    </button>
                    <button
                        onClick={handleSell}
                        disabled={!currentSymbol}
                        className="flex-1 py-1.5 bg-rose-500 text-white text-xs font-bold rounded hover:bg-rose-600 transition-colors disabled:opacity-50"
                    >
                        SELL
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('fundamentals')}
                    className={`flex-none px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'fundamentals'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Fundamentals
                </button>
                <button
                    onClick={() => setActiveTab('financials')}
                    className={`flex-none px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'financials'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Financials
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    className={`flex-none px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'news'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    News
                </button>
                <button
                    onClick={() => setActiveTab('events')}
                    className={`flex-none px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${activeTab === 'events'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Events
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                        Loading...
                    </div>
                ) : !symbolInfo ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                        Select a symbol to view details
                    </div>
                ) : (
                    <>
                        {activeTab === 'fundamentals' && renderFundamentals()}
                        {activeTab === 'financials' && renderFinancials()}
                        {activeTab === 'news' && renderNews()}
                        {activeTab === 'events' && renderEvents()}
                    </>
                )}
            </div>
        </div>
    );
}
