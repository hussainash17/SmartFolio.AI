import { useState } from 'react';
import { Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { MarketService } from '../../src/client';
import { formatPrice, formatNumber, getChangeColor } from '../../lib/formatting-utils';
import { useQuery } from '@tanstack/react-query';
import { useSymbolMarketSummary, useSymbolEarnings, useSymbolDividends } from '../../hooks/useSymbolFundamentals';
import { useSymbolNews } from '../../hooks/useSymbolNews';
import { useSymbolEvents } from '../../hooks/useSymbolEvents';

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

    // Fetch basic stock data from market API
    const { data: stockData, isLoading: stockLoading } = useQuery({
        queryKey: ['market', 'stock', currentSymbol],
        enabled: !!currentSymbol,
        queryFn: async () => {
            const data = await MarketService.getStock({ symbol: currentSymbol });
            const stock = (data as any)?.data || data;
            return {
                symbol: currentSymbol,
                company_name: stock?.company_name,
                last_trade_price: Number(stock?.last_trade_price ?? stock?.last ?? 0),
                change: Number(stock?.change ?? 0),
                change_percent: Number(stock?.change_percent ?? 0),
                high: Number(stock?.high ?? stock?.day_high ?? 0),
                low: Number(stock?.low ?? stock?.day_low ?? 0),
                volume: Number(stock?.volume ?? 0),
                market_cap: Number(stock?.market_cap ?? 0),
                pe_ratio: Number(stock?.pe_ratio ?? 0),
                week_52_high: Number(stock?.week_52_high ?? 0),
                week_52_low: Number(stock?.week_52_low ?? 0),
            } as SymbolInfo;
        },
        staleTime: 30 * 1000, // 30 seconds
    });

    // Fetch fundamental data
    const { data: marketSummary, isLoading: fundamentalsLoading } = useSymbolMarketSummary({
        symbol: currentSymbol,
        enabled: !!currentSymbol && activeTab === 'fundamentals',
    });

    // Fetch earnings data for financials tab
    const { data: earningsData, isLoading: earningsLoading } = useSymbolEarnings({
        symbol: currentSymbol,
        enabled: !!currentSymbol && activeTab === 'financials',
    });

    // Fetch dividends
    const { data: dividendsData } = useSymbolDividends({
        symbol: currentSymbol,
        limit: 3,
        enabled: !!currentSymbol && activeTab === 'fundamentals',
    });

    // Fetch news
    const { data: newsData, isLoading: newsLoading } = useSymbolNews({
        symbol: currentSymbol,
        days: 30,
        limit: 5,
        enabled: !!currentSymbol && activeTab === 'news',
    });
    console.log(newsData);

    // Fetch events
    const { data: eventsData, isLoading: eventsLoading } = useSymbolEvents({
        symbol: currentSymbol,
        limit: 5,
        enabled: !!currentSymbol && activeTab === 'events',
    });

    const loading = stockLoading || 
        (activeTab === 'fundamentals' && fundamentalsLoading) ||
        (activeTab === 'financials' && earningsLoading) ||
        (activeTab === 'news' && newsLoading) ||
        (activeTab === 'events' && eventsLoading);
    console.log(earningsData);
    const symbolInfo: SymbolInfo | null = stockData ? {
        ...stockData,
        eps: earningsData?.annual_profit?.[0]?.eps ?? (stockData.pe_ratio && stockData.pe_ratio !== 0 ? stockData.last_trade_price / stockData.pe_ratio : undefined),
        dividend_yield: marketSummary?.dividend_yield ? Number(marketSummary.dividend_yield) : undefined,
        sector: marketSummary?.sector,
        market_cap: marketSummary?.market_cap ? Number(marketSummary.market_cap) : stockData.market_cap,
        pe_ratio: marketSummary?.current_pe ? Number(marketSummary.current_pe) : stockData.pe_ratio,
        week_52_high: marketSummary?.week_52_range?.high ? Number(marketSummary.week_52_range.high) : stockData.week_52_high,
        week_52_low: marketSummary?.week_52_range?.low ? Number(marketSummary.week_52_range.low) : stockData.week_52_low,
    } : null;

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

    // Helper to safely format numbers
    const safeToFixed = (value: any, decimals: number = 2): string => {
        const num = Number(value);
        return isNaN(num) ? '--' : num.toFixed(decimals);
    };

    const renderFundamentals = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Market Cap</div>
                    <div className="font-semibold text-sm">
                        {symbolInfo?.market_cap ? `${safeToFixed(symbolInfo.market_cap)} Million` : '--'}
                    </div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">P/E Ratio</div>
                    <div className="font-semibold text-sm">{symbolInfo?.pe_ratio ? safeToFixed(symbolInfo.pe_ratio) : '--'}</div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">EPS (TTM)</div>
                    <div className="font-semibold text-sm">
                        {symbolInfo?.eps ? safeToFixed(symbolInfo.eps) : '--'}
                    </div>
                </div>
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Div Yield</div>
                    <div className="font-semibold text-sm">
                        {symbolInfo?.dividend_yield ? `${safeToFixed(symbolInfo.dividend_yield)}%` : '--'}
                    </div>
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

            {/* Sector */}
            {symbolInfo?.sector && (
                <div className="p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground">Sector</div>
                    <div className="font-semibold text-sm">{symbolInfo.sector}</div>
                </div>
            )}

            {/* Recent Dividends */}
            {dividendsData && dividendsData.length > 0 && (
                <div className="p-3 border border-border rounded-md">
                    <h4 className="text-xs font-semibold mb-2">Recent Dividends</h4>
                    <div className="space-y-1">
                        {dividendsData.slice(0, 3).map((div, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{div.year}</span>
                                <span>
                                    {div.cash_dividend ? `${div.cash_dividend}% Cash` : ''}
                                    {div.cash_dividend && div.stock_dividend ? ' + ' : ''}
                                    {div.stock_dividend ? `${div.stock_dividend}% Stock` : ''}
                                    {!div.cash_dividend && !div.stock_dividend ? '--' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Day Range */}
            <div className="p-3 border border-border rounded-md">
                <h4 className="text-xs font-semibold mb-2">Today's Range</h4>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{formatPrice(symbolInfo?.low)}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full relative">
                        {symbolInfo?.low && symbolInfo?.high && symbolInfo?.last_trade_price && (
                            <div 
                                className="absolute top-0 w-2 h-2 bg-primary rounded-full"
                                style={{
                                    left: `${Math.max(0, Math.min(100, ((symbolInfo.last_trade_price - symbolInfo.low) / (symbolInfo.high - symbolInfo.low)) * 100))}%`,
                                    transform: 'translateX(-50%)',
                                }}
                            />
                        )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatPrice(symbolInfo?.high)}</span>
                </div>
            </div>
        </div>
    );

    const renderFinancials = () => {
        return (
        <div className="space-y-4">
            {earningsData?.quarterly_eps && earningsData.quarterly_eps.length > 0 ? (
                <>
                    <h4 className="text-xs font-semibold">Quarterly EPS</h4>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground border-b border-border">
                                <th className="text-left py-1 font-medium">Quarter</th>
                                <th className="text-right py-1 font-medium">EPS</th>
                                <th className="text-right py-1 font-medium">Growth</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {earningsData.quarterly_eps.slice(0, 8).map((q, idx) => (
                                <tr key={idx}>
                                    <td className="py-2">{q.quarter} {q.year}</td>
                                    <td className="text-right font-mono">{safeToFixed(q.eps)}</td>
                                    <td className={`text-right font-mono ${q.growth_percent && Number(q.growth_percent) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {q.growth_percent ? `${Number(q.growth_percent) >= 0 ? '+' : ''}${safeToFixed(q.growth_percent, 1)}%` : '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No financial data available
                </div>
            )}

            {earningsData?.annual_profit && earningsData.annual_profit.length > 0 && (
                <>
                    <h4 className="text-xs font-semibold mt-4">Annual Profit</h4>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground border-b border-border">
                                <th className="text-left py-1 font-medium">Year</th>
                                <th className="text-right py-1 font-medium">Profit</th>
                                <th className="text-right py-1 font-medium">EPS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {earningsData.annual_profit.slice(0, 5).map((a, idx) => (
                                <tr key={idx}>
                                    <td className="py-2">{a.year}</td>
                                    <td className="text-right font-mono">{formatNumber(a.profit)}</td>
                                    <td className="text-right font-mono">{safeToFixed(a.eps)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
        );
    };

    const renderNews = () => (
        <div className="space-y-3">
            {newsData && newsData.length > 0 ? (
                <div className="space-y-4">
                    {newsData.map((news) => (
                        <div key={news.id} className="border-b border-border pb-3 last:border-b-0">
                            <div className="text-xs text-muted-foreground mb-1">
                                {new Date(news.published_at).toLocaleDateString()} • {news.source || 'News'}
                            </div>
                            <h4 className="text-sm font-semibold mb-2">
                                {news.title}
                            </h4>
                            {news.content && (
                                <p className="text-xs text-foreground leading-relaxed">
                                    {news.content}
                                </p>
                            )}
                            {news.url && (
                                <a 
                                    href={news.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                                >
                                    Read more <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent news for {currentSymbol}
                </div>
            )}
        </div>
    );

    const renderEvents = () => (
        <div className="space-y-3">
            {eventsData && eventsData.length > 0 ? (
                eventsData.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border border-border rounded-md">
                        <div className={`p-2 rounded ${event.type === 'AGM' ? 'bg-primary/10 text-primary' : 
                            event.type === 'Record Date' ? 'bg-emerald-500/10 text-emerald-500' : 
                            'bg-blue-500/10 text-blue-500'}`}>
                            {event.type === 'Record Date' ? <DollarSign className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-medium">{event.type}</h4>
                            <p className="text-xs text-muted-foreground">{event.date} • {event.time}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    No upcoming events for {currentSymbol}
                </div>
            )}
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
                            ৳{formatPrice(symbolInfo?.last_trade_price)}
                        </div>
                        <div className={`text-xs font-medium ${getChangeColor(symbolInfo?.change)}`}>
                            {symbolInfo?.change !== undefined && Number(symbolInfo.change) >= 0 ? '+' : ''}
                            {safeToFixed(symbolInfo?.change)} ({safeToFixed(symbolInfo?.change_percent)}%)
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
                ) : !currentSymbol ? (
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
