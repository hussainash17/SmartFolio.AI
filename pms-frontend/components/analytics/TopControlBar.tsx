import { useState, useRef, useEffect } from 'react';
import { Search, Sun, Moon, Settings, TrendingUp, BarChart3, LineChart } from 'lucide-react';
import { MarketService } from '../../src/client';

interface TopControlBarProps {
    currentSymbol: string;
    onSymbolChange: (symbol: string) => void;
    timeframe: string;
    onTimeframeChange: (timeframe: string) => void;
    chartType: 'candlestick' | 'line' | 'bar';
    onChartTypeChange: (type: 'candlestick' | 'line' | 'bar') => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}

interface SymbolSearchResult {
    symbol: string;
    name: string;
    exchange?: string;
    type?: string;
}

const TIMEFRAMES = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '30', label: '30m' },
    { value: '60', label: '1H' },
    { value: '240', label: '4H' },
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
];

export function TopControlBar({
    currentSymbol,
    onSymbolChange,
    timeframe,
    onTimeframeChange,
    chartType,
    onChartTypeChange,
    theme,
    onThemeToggle,
}: TopControlBarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

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

    // Close search results when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
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

    const getChartTypeIcon = (type: 'candlestick' | 'line' | 'bar') => {
        switch (type) {
            case 'candlestick':
                return <TrendingUp className="w-4 h-4" />;
            case 'line':
                return <LineChart className="w-4 h-4" />;
            case 'bar':
                return <BarChart3 className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border shadow-sm">
            {/* Symbol Search */}
            <div ref={searchRef} className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery && setShowSearchResults(true)}
                        placeholder={currentSymbol || "Search symbol..."}
                        className="pl-9 pr-4 py-2 w-64 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    />
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                        {searchResults.map((result) => (
                            <button
                                key={result.symbol}
                                onClick={() => handleSymbolSelect(result.symbol)}
                                className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <div className="font-semibold text-sm">{result.symbol}</div>
                                    <div className="text-xs text-muted-foreground truncate">{result.name}</div>
                                </div>
                                <div className="text-xs text-muted-foreground">{result.exchange}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border" />

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-background rounded-md p-1">
                {TIMEFRAMES.map((tf) => (
                    <button
                        key={tf.value}
                        onClick={() => onTimeframeChange(tf.value)}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeframe === tf.value
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border" />

            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 bg-background rounded-md p-1">
                <button
                    onClick={() => onChartTypeChange('candlestick')}
                    className={`p-2 rounded transition-colors ${chartType === 'candlestick'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    title="Candlestick Chart"
                >
                    {getChartTypeIcon('candlestick')}
                </button>
                <button
                    onClick={() => onChartTypeChange('line')}
                    className={`p-2 rounded transition-colors ${chartType === 'line'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    title="Line Chart"
                >
                    {getChartTypeIcon('line')}
                </button>
                <button
                    onClick={() => onChartTypeChange('bar')}
                    className={`p-2 rounded transition-colors ${chartType === 'bar'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                    title="Bar Chart"
                >
                    {getChartTypeIcon('bar')}
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

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
                title="Chart Settings"
            >
                <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
        </div>
    );
}
