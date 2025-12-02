import { useState, useEffect } from 'react';
import { Activity, Plus } from 'lucide-react';
import { MarketService } from '../../src/client';
import { formatPrice, formatChange, getChangeColor, getChangeIcon } from '../../lib/formatting-utils';

interface LeftPanelProps {
    currentSymbol: string;
    onSymbolSelect: (symbol: string) => void;
}

interface WatchlistSymbol {
    symbol: string;
    last_trade_price?: number;
    change?: number;
    change_percent?: number;
}

interface MarketMover {
    symbol: string;
    company_name?: string;
    change_percent?: number;
    last_trade_price?: number;
}

export function LeftPanel({ currentSymbol, onSymbolSelect }: LeftPanelProps) {
    const [activeTab, setActiveTab] = useState<'watchlist' | 'movers' | 'active'>('watchlist');
    const [watchlistSymbols, setWatchlistSymbols] = useState<WatchlistSymbol[]>([]);
    const [topMovers, setTopMovers] = useState<MarketMover[]>([]);
    const [mostActive, setMostActive] = useState<MarketMover[]>([]);
    const [loading, setLoading] = useState(false);

    // Load watchlist from localStorage
    useEffect(() => {
        const savedWatchlist = localStorage.getItem('analytics_watchlist');
        if (savedWatchlist) {
            const symbols = JSON.parse(savedWatchlist);
            loadWatchlistQuotes(symbols);
        } else {
            // Default watchlist
            loadWatchlistQuotes(['GP', 'BRAC', 'SQUR', 'ACI', 'BATBC']);
        }
    }, []);

    // Load top movers
    useEffect(() => {
        if (activeTab === 'movers') {
            loadTopMovers();
        }
    }, [activeTab]);

    // Load most active
    useEffect(() => {
        if (activeTab === 'active') {
            loadMostActive();
        }
    }, [activeTab]);

    const loadWatchlistQuotes = async (symbols: string[]) => {
        setLoading(true);
        try {
            const quotes = await Promise.all(
                symbols.map(async (symbol) => {
                    try {
                        const data = await MarketService.getStock({ symbol });
                        return {
                            symbol,
                            last_trade_price: (data as any)?.data?.last_trade_price ?? (data as any)?.last_trade_price,
                            change: (data as any)?.data?.change ?? (data as any)?.change,
                            change_percent: (data as any)?.data?.change_percent ?? (data as any)?.change_percent,
                        };
                    } catch {
                        return { symbol };
                    }
                })
            );
            setWatchlistSymbols(quotes);
        } catch (error) {
            console.error('Error loading watchlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTopMovers = async () => {
        setLoading(true);
        try {
            const data = await MarketService.getTopMovers({ limit: 10 });
            setTopMovers(data as MarketMover[]);
        } catch (error) {
            console.error('Error loading top movers:', error);
            setTopMovers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMostActive = async () => {
        setLoading(true);
        try {
            const data = await MarketService.getMostActive({ limit: 10 });
            setMostActive(data as MarketMover[]);
        } catch (error) {
            console.error('Error loading most active:', error);
            setMostActive([]);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border bg-card">
                <button
                    onClick={() => setActiveTab('watchlist')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'watchlist'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Watchlist
                </button>
                <button
                    onClick={() => setActiveTab('movers')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'movers'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Movers
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'active'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Active
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    </div>
                ) : (
                    <>
                        {/* Watchlist Tab */}
                        {activeTab === 'watchlist' && (
                            <div className="divide-y divide-border">
                                {watchlistSymbols.map((item) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => onSymbolSelect(item.symbol)}
                                        className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors ${currentSymbol === item.symbol ? 'bg-accent' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm">{item.symbol}</div>
                                                <div className="text-lg font-mono">
                                                    {formatPrice(item.last_trade_price)}
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-1 text-xs font-medium ${getChangeColor(item.change)}`}>
                                                {getChangeIcon(item.change)}
                                                <span>{formatChange(item.change, item.change_percent)}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                <button
                                    className="w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Symbol
                                </button>
                            </div>
                        )}

                        {/* Top Movers Tab */}
                        {activeTab === 'movers' && (
                            <div className="divide-y divide-border">
                                {topMovers.length > 0 ? (
                                    topMovers.map((mover) => (
                                        <button
                                            key={mover.symbol}
                                            onClick={() => onSymbolSelect(mover.symbol)}
                                            className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm">{mover.symbol}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {mover.company_name || mover.symbol}
                                                    </div>
                                                </div>
                                                <div className={`text-sm font-medium ${getChangeColor(mover.change_percent)}`}>
                                                    {mover.change_percent !== undefined && mover.change_percent !== null
                                                        ? `${mover.change_percent >= 0 ? '+' : ''}${mover.change_percent.toFixed(2)}%`
                                                        : '--'}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No data available
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Most Active Tab */}
                        {activeTab === 'active' && (
                            <div className="divide-y divide-border">
                                {mostActive.length > 0 ? (
                                    mostActive.map((stock) => (
                                        <button
                                            key={stock.symbol}
                                            onClick={() => onSymbolSelect(stock.symbol)}
                                            className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-sm">{stock.symbol}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        {stock.company_name || stock.symbol}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Activity className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No data available
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
