import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, PieChart, ArrowUpDown, TrendingUp, TrendingDown, List, Star } from 'lucide-react';
import { formatPrice, formatChange, getChangeColor } from '../../lib/formatting-utils';
import { useWatchlists } from '../../hooks/useWatchlists';
import { useWatchlistItems } from '../../hooks/useWatchlistItems';
import { useTopMovers, useMostActive } from '../../hooks/useTopMovers';

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
type MarketTab = 'gainers' | 'losers' | 'active';

export function LeftPanel({ currentSymbol, onSymbolSelect }: LeftPanelProps) {
    const [activeTab, setActiveTab] = useState<'watchlist' | 'movers'>('watchlist');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('symbol');
    const [groupBy, setGroupBy] = useState<GroupOption>('all');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'Favorites': true, 'Portfolio': true });
    const [marketTab, setMarketTab] = useState<MarketTab>('gainers');

    // Real watchlist data
    const { watchlists, selectedWatchlistId, selectWatchlist, loading: watchlistsLoading } = useWatchlists();
    const { items: watchlistItems, loading: itemsLoading } = useWatchlistItems(selectedWatchlistId);

    // Get current watchlist name
    const currentWatchlist = watchlists.find(w => w.id === selectedWatchlistId);

    // Market movers data
    const { data: topMoversData, isLoading: moversLoading } = useTopMovers({ limit: 15, enabled: activeTab === 'movers' });
    const { data: mostActiveData, isLoading: activeLoading } = useMostActive({ limit: 15, enabled: activeTab === 'movers' && marketTab === 'active' });

    const loading = activeTab === 'watchlist' ? (watchlistsLoading || itemsLoading) : (moversLoading || activeLoading);

    // Convert watchlist items to display format
    const watchlistSymbols: WatchlistSymbol[] = useMemo(() => {
        return watchlistItems.map(item => ({
            symbol: item.symbol,
            last_trade_price: item.last_trade_price,
            change: item.change,
            change_percent: item.change_percent,
            volume: item.volume,
            group: 'Watchlist',
        }));
    }, [watchlistItems]);

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

    // Get current market data based on selected tab
    const currentMarketData = useMemo(() => {
        if (marketTab === 'gainers') return topMoversData?.gainers || [];
        if (marketTab === 'losers') return topMoversData?.losers || [];
        return mostActiveData || [];
    }, [marketTab, topMoversData, mostActiveData]);

    const renderWatchlistTab = () => (
        <>
            {/* Watchlist Selector */}
            {watchlists.length > 0 && (
                <div className="px-2 pt-2 pb-1 border-b border-border">
                    <div className="relative">
                        <List className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <select
                            value={selectedWatchlistId || ''}
                            onChange={(e) => selectWatchlist(e.target.value)}
                            className="w-full pl-7 pr-6 py-1.5 text-xs font-medium bg-background border border-border rounded appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                            {watchlists.map((watchlist) => (
                                <option key={watchlist.id} value={watchlist.id}>
                                    {watchlist.name}
                                    {watchlist.is_default ? ' ★' : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                    </div>
                    {currentWatchlist && (
                        <div className="flex items-center justify-between mt-1 px-1">
                            <span className="text-[10px] text-muted-foreground">
                                {watchlistItems.length} symbols
                            </span>
                            {currentWatchlist.is_default && (
                                <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    Default
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="p-2 space-y-2 border-b border-border">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols..."
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
                ) : watchlists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground px-4 text-center">
                        <List className="w-8 h-8 mb-2 opacity-50" />
                        <p>No watchlists yet</p>
                        <p className="mt-1 text-[10px]">Create a watchlist from the Research page</p>
                    </div>
                ) : filteredAndSortedSymbols.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-xs text-muted-foreground">
                        <p>No stocks in "{currentWatchlist?.name || 'watchlist'}"</p>
                        <p className="mt-1 text-[10px]">Add symbols from the Research page</p>
                    </div>
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
        </>
    );

    const renderMoversTab = () => (
        <>
            {/* Market Sub-tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setMarketTab('gainers')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${marketTab === 'gainers'
                        ? 'text-emerald-500 border-b-2 border-emerald-500'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <TrendingUp className="w-3 h-3" />
                    Gainers
                </button>
                <button
                    onClick={() => setMarketTab('losers')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${marketTab === 'losers'
                        ? 'text-rose-500 border-b-2 border-rose-500'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <TrendingDown className="w-3 h-3" />
                    Losers
                </button>
                <button
                    onClick={() => setMarketTab('active')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${marketTab === 'active'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Active
                </button>
            </div>

            {/* Market List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Loading...</div>
                ) : currentMarketData.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                        No data available
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {currentMarketData.map((item, index) => (
                            <button
                                key={`${item.symbol}-${index}`}
                                onClick={() => onSymbolSelect(item.symbol)}
                                className={`w-full px-3 py-2 text-left hover:bg-accent transition-colors ${currentSymbol === item.symbol ? 'bg-accent/50 border-l-2 border-primary' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground w-4">{index + 1}</span>
                                        <span className="font-bold text-sm">{item.symbol}</span>
                                    </div>
                                    <span className="font-mono text-sm">{formatPrice(item.last)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs pl-6">
                                    <span className="text-muted-foreground truncate max-w-[100px]">
                                        {item.company_name || '-'}
                                    </span>
                                    <span className={`font-medium ${getChangeColor(item.change)}`}>
                                        {item.change >= 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

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

            {activeTab === 'watchlist' ? renderWatchlistTab() : renderMoversTab()}
        </div>
    );
}
