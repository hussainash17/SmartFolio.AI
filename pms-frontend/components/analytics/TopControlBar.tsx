import { useState, useRef, useEffect } from 'react';
import { Search, Sun, Moon, Settings, TrendingUp, BarChart3, LineChart, CandlestickChart, LayoutTemplate, ChevronDown } from 'lucide-react';
import { MarketService } from '../../src/client';
import { formatPrice, formatNumber, getChangeColor } from '../../lib/formatting-utils';

interface TopControlBarProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
    timeframe: string;
    onTimeframeChange: (timeframe: string) => void;
    chartType: 'candlestick' | 'line' | 'bar' | 'heikin_ashi';
    onChartTypeChange: (type: 'candlestick' | 'line' | 'bar' | 'heikin_ashi') => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    onLayoutChange: (layout: { left: boolean; right: boolean; bottom: boolean }) => void;
    layoutState: { left: boolean; right: boolean; bottom: boolean };
}

interface SymbolSearchResult {
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
}

const TIMEFRAMES = [
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' },
    { value: '5Y', label: '5Y' },
    { value: 'ALL', label: 'MAX' },
];

const ASSET_CLASSES = ['Stocks', 'Crypto', 'Forex'];

export function TopControlBar({
    currentSymbol,
    onSymbolChange,
    timeframe,
    onTimeframeChange,
    chartType,
    onChartTypeChange,
    theme,
    onThemeToggle,
    onLayoutChange,
    layoutState,
}: TopControlBarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [currentAssetClass, setCurrentAssetClass] = useState('Stocks');
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);

    // Real-time data state (mock for now, would come from websocket/context)
    const [marketData, setMarketData] = useState<{ price: number; change: number; changePercent: number; volume: number } | null>(null);

    const searchRef = useRef<HTMLDivElement>(null);
    const layoutRef = useRef<HTMLDivElement>(null);

    // Fetch basic market data when symbol changes
    useEffect(() => {
        if (currentSymbol) {
            const fetchMarketData = async () => {
                try {
                    const data = await MarketService.getStock({ symbol: currentSymbol });
                    const stockData = (data as any)?.data || data;
                    if (stockData) {
                        setMarketData({
                            price: Number(stockData.last_trade_price || stockData.last || 0),
                            change: Number(stockData.change || 0),
                            changePercent: Number(stockData.change_percent || 0),
                            volume: Number(stockData.volume || 0)
                        });
                    }
                } catch (e) {
                    console.error("Failed to fetch market data", e);
                }
            };
            fetchMarketData();
        }
    }, [currentSymbol]);

    // Symbol search with debounce
    useEffect(() => {
        if (searchQuery.length < 1) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await MarketService.listStocks({
                    limit: 10,
                    offset: 0,
                });

                // Filter results based on search query
                const filtered = results
                    .filter((stock: any) =>
                        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        stock.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((stock: any) => ({
                        symbol: stock.symbol || '',
                        name: stock.company_name || stock.symbol || '',
                        exchange: stock.exchange || 'DSE',
                        type: 'stock'
                    }));

                setSearchResults(filtered);
                setShowSearchResults(true);
            } catch (error) {
                console.error('Symbol search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close menus when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
            if (layoutRef.current && !layoutRef.current.contains(event.target as Node)) {
                setShowLayoutMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSymbolSelect = (symbol: string) => {
        onSymbolChange(symbol);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const getChartTypeIcon = (type: string) => {
        switch (type) {
            case 'candlestick': return <TrendingUp className="w-4 h-4" />;
            case 'line': return <LineChart className="w-4 h-4" />;
            case 'bar': return <BarChart3 className="w-4 h-4" />;
            case 'heikin_ashi': return <CandlestickChart className="w-4 h-4" />; // Using Candlestick icon as proxy
            default: return <TrendingUp className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border shadow-sm h-14">
            {/* Asset Class Dropdown (Mock) */}
            <div className="relative group">
                <button className="flex items-center gap-1 px-2 py-1 text-sm font-medium hover:bg-accent rounded-md">
                    {currentAssetClass}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                <div className="absolute top-full left-0 mt-1 w-32 bg-card border border-border rounded-md shadow-lg hidden group-hover:block z-50">
                    {ASSET_CLASSES.map(cls => (
                        <button
                            key={cls}
                            onClick={() => setCurrentAssetClass(cls)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
                        >
                            {cls}
                        </button>
                    ))}
                </div>
            </div>

            {/* Symbol Search */}
            <div ref={searchRef} className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery && setShowSearchResults(true)}
                        placeholder={currentSymbol || "Search..."}
                        className="pl-9 pr-4 py-1.5 w-48 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground font-bold uppercase"
                    />
                </div>
                {/* Search Results */}
                {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-64 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                        {searchResults.map((result) => (
                            <button
                                key={result.symbol}
                                onClick={() => handleSymbolSelect(result.symbol)}
                                className="w-full px-4 py-2 text-left hover:bg-accent transition-colors block"
                            >
                                <div className="font-semibold text-sm">{result.symbol}</div>
                                <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Market Data Display */}
            {marketData && (
                <div className="flex items-center gap-3 text-sm border-l border-border pl-3">
                    <span className="font-mono font-bold text-foreground">
                        {formatPrice(marketData.price)}
                    </span>
                    <span className={`font-medium ${getChangeColor(marketData.change)}`}>
                        {marketData.change > 0 ? '+' : ''}{marketData.change.toFixed(2)} ({marketData.changePercent.toFixed(2)}%)
                    </span>
                    <span className="text-xs text-muted-foreground hidden lg:block">
                        Vol: {formatNumber(marketData.volume)}
                    </span>
                </div>
            )}

            <div className="flex-1" />

            {/* Center Controls Group */}
            <div className="flex items-center gap-2">
                {/* Timeframe */}
                <div className="flex items-center bg-background rounded-md p-0.5 border border-border">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => onTimeframeChange(tf.value)}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${timeframe === tf.value
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                {/* Chart Type */}
                <div className="flex items-center bg-background rounded-md p-0.5 border border-border">
                    {(['candlestick', 'line', 'bar', 'heikin_ashi'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => onChartTypeChange(type)}
                            className={`p-1.5 rounded transition-colors ${chartType === type
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                }`}
                            title={type.replace('_', ' ')}
                        >
                            {getChartTypeIcon(type)}
                        </button>
                    ))}
                </div>

                {/* Indicators (Mock) */}
                <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Indicators</span>
                </button>
            </div>

            <div className="flex-1" />

            {/* Right Controls */}
            <div className="flex items-center gap-2">
                {/* Layout Control */}
                <div ref={layoutRef} className="relative">
                    <button
                        onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                        className={`p-2 rounded-md hover:bg-accent transition-colors ${showLayoutMenu ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
                        title="Customize Layout"
                    >
                        <LayoutTemplate className="w-5 h-5" />
                    </button>

                    {showLayoutMenu && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50 p-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Toggle Panels</div>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={layoutState.left}
                                    onChange={() => onLayoutChange({ ...layoutState, left: !layoutState.left })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">Watchlist (Left)</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={layoutState.right}
                                    onChange={() => onLayoutChange({ ...layoutState, right: !layoutState.right })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">Details (Right)</span>
                            </label>
                            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={layoutState.bottom}
                                    onChange={() => onLayoutChange({ ...layoutState, bottom: !layoutState.bottom })}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm">Analytics (Bottom)</span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
                <button
                    onClick={onThemeToggle}
                    className="p-2 rounded-md hover:bg-accent transition-colors"
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                >
                    {theme === 'dark' ? (
                        <Sun className="w-5 h-5 text-muted-foreground" />
                    ) : (
                        <Moon className="w-5 h-5 text-muted-foreground" />
                    )}
                </button>

                {/* Settings */}
                <button
                    className="p-2 rounded-md hover:bg-accent transition-colors"
                    title="Settings"
                >
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>
        </div>
    );
}
