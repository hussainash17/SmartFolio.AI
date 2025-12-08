import { useState, useEffect, useMemo } from 'react';
import { Activity, Plus, Search, ChevronDown, ChevronRight, Star, Briefcase, PieChart, ArrowUpDown } from 'lucide-react';
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
    volume?: number;
    group?: string;
}

type SortOption = 'symbol' | 'price' | 'change' | 'volume';
type GroupOption = 'all' | 'portfolio' | 'favorites' | 'sector';

export function LeftPanel({ currentSymbol, onSymbolSelect }: LeftPanelProps) {
    const [activeTab, setActiveTab] = useState<'watchlist' | 'movers'>('watchlist');
    const [watchlistSymbols, setWatchlistSymbols] = useState<WatchlistSymbol[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('symbol');
    const [groupBy, setGroupBy] = useState<GroupOption>('all');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'Favorites': true, 'Portfolio': true });

    // Mock initial data
    useEffect(() => {
        const initialSymbols = [
            { symbol: 'GP', group: 'Favorites' },
            { symbol: 'BRACBANK', group: 'Favorites' },
            { symbol: 'SQURPHARMA', group: 'Portfolio' },
            { symbol: 'BATBC', group: 'Portfolio' },
            { symbol: 'BEXIMCO', group: 'Sector: Pharma' },
            { symbol: 'RENATA', group: 'Sector: Pharma' },
            { symbol: 'LHBL', group: 'Sector: Cement' },
        ];
        loadWatchlistQuotes(initialSymbols);
    }, []);

    const loadWatchlistQuotes = async (items: { symbol: string, group: string }[]) => {
        setLoading(true);
        try {
            const quotes = await Promise.all(
                items.map(async (item) => {
                    try {
                        const data = await MarketService.getStock({ symbol: item.symbol });
                        const stockData = (data as any)?.data || data;
                        return {
                            symbol: item.symbol,
                            group: item.group,
                            last_trade_price: stockData?.last_trade_price ?? stockData?.last,
                            change: stockData?.change,
                            change_percent: stockData?.change_percent,
                            volume: stockData?.volume,
                        };
                    } catch {
                        return { symbol: item.symbol, group: item.group };
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

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const filteredAndSortedSymbols = useMemo(() => {
        let result = [...watchlistSymbols];

        // Filter by search
        if (searchQuery) {
            result = result.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'price': return (b.last_trade_price || 0) - (a.last_trade_price || 0);
                case 'change': return (b.change_percent || 0) - (a.change_percent || 0);
                case 'volume': return (b.volume || 0) - (a.volume || 0);
                default: return a.symbol.localeCompare(b.symbol);
            }
        });

        return result;
    }, [watchlistSymbols, searchQuery, sortBy]);

    const groupedSymbols = useMemo(() => {
        if (groupBy === 'all') return { 'All Symbols': filteredAndSortedSymbols };

        const groups: Record<string, WatchlistSymbol[]> = {};
        filteredAndSortedSymbols.forEach(s => {
            const groupName = s.group || 'Other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(s);
        });
        return groups;
    }, [filteredAndSortedSymbols, groupBy]);

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header / Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab('watchlist')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'watchlist'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Watchlist
                </button>
                <button
                    onClick={() => setActiveTab('movers')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'movers'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Market
                </button>
            </div>

            {/* Controls */}
            <div className="p-2 space-y-2 border-b border-border">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Add / Search..."
                        className="w-full pl-7 pr-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Sort & Group */}
                <div className="flex gap-1">
                    <div className="relative flex-1">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="w-full pl-2 pr-6 py-1 text-[10px] bg-background border border-border rounded appearance-none focus:outline-none"
                        >
                            <option value="symbol">Name</option>
                            <option value="price">Price</option>
                            <option value="change">Change %</option>
                            <option value="volume">Volume</option>
                        </select>
                        <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="relative flex-1">
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as GroupOption)}
                            className="w-full pl-2 pr-6 py-1 text-[10px] bg-background border border-border rounded appearance-none focus:outline-none"
                        >
                            <option value="all">No Grouping</option>
                            <option value="portfolio">Portfolio</option>
                            <option value="favorites">Favorites</option>
                            <option value="sector">Sector</option>
                        </select>
                        <PieChart className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Loading...</div>
                ) : (
                    <div className="divide-y divide-border">
                        {Object.entries(groupedSymbols).map(([groupName, symbols]) => (
                            <div key={groupName}>
                                {/* Group Header (only if grouping is active) */}
                                {groupBy !== 'all' && (
                                    <button
                                        onClick={() => toggleGroup(groupName)}
                                        className="w-full px-3 py-1.5 bg-muted/30 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-1">
                                            {expandedGroups[groupName] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            {groupName}
                                        </div>
                                        <span className="text-[10px]">{symbols.length}</span>
                                    </button>
                                )}

                                {/* Symbols List */}
                                {(groupBy === 'all' || expandedGroups[groupName]) && symbols.map((item) => (
                                    <button
                                        key={item.symbol}
                                        onClick={() => onSymbolSelect(item.symbol)}
                                        className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${currentSymbol === item.symbol ? 'bg-accent/50 border-l-2 border-primary' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="font-bold text-sm">{item.symbol}</span>
                                            <span className="font-mono text-sm">{formatPrice(item.last_trade_price)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Vol: {item.volume ? (item.volume / 1000).toFixed(1) + 'K' : '-'}</span>
                                            <span className={`font-medium ${getChangeColor(item.change)}`}>
                                                {formatChange(item.change, item.change_percent)}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
