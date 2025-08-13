import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Slider } from "./ui/slider";
import { Checkbox } from "./ui/checkbox";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  ShoppingCart,
  Star,
  RefreshCw,
  Download,
  Bookmark
} from "lucide-react";

interface StockScreenerProps {
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
  onAddToWatchlist: (symbol: string) => void;
}

interface ScreenerFilters {
  // Basic filters
  sector: string;
  industry: string;
  marketCap: [number, number];
  
  // Fundamental filters
  peRatio: [number, number];
  priceToBook: [number, number];
  debtToEquity: [number, number];
  returnOnEquity: [number, number];
  revenueGrowth: [number, number];
  earningsGrowth: [number, number];
  dividendYield: [number, number];
  
  // Technical filters
  priceRange: [number, number];
  volume: [number, number];
  rsi: [number, number];
  movingAverage: string;
  priceChange: [number, number];
  
  // Additional filters
  country: string;
  exchange: string;
}

interface ScreenerResult {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  peRatio: number;
  priceToBook: number;
  dividendYield: number;
  revenueGrowth: number;
  earningsGrowth: number;
  rsi: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

export function StockScreener({ onQuickTrade, onChartStock, onAddToWatchlist }: StockScreenerProps) {
  const [filters, setFilters] = useState<ScreenerFilters>({
    sector: 'all',
    industry: 'all',
    marketCap: [0, 1000000],
    peRatio: [0, 100],
    priceToBook: [0, 10],
    debtToEquity: [0, 200],
    returnOnEquity: [0, 100],
    revenueGrowth: [-50, 100],
    earningsGrowth: [-100, 200],
    dividendYield: [0, 10],
    priceRange: [0, 1000],
    volume: [0, 100000000],
    rsi: [0, 100],
    movingAverage: 'all',
    priceChange: [-20, 20],
    country: 'all',
    exchange: 'all'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeFilters, setActiveFilters] = useState(0);

  // Mock screener results
  const mockResults: ScreenerResult[] = [
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      marketCap: 3000000,
      price: 175.43,
      change: 2.15,
      changePercent: 1.24,
      volume: 52000000,
      peRatio: 28.5,
      priceToBook: 45.2,
      dividendYield: 0.52,
      revenueGrowth: 8.1,
      earningsGrowth: 11.3,
      rsi: 58.2,
      rating: 'Buy'
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft Corporation',
      sector: 'Technology',
      industry: 'Software',
      marketCap: 2800000,
      price: 378.85,
      change: -1.92,
      changePercent: -0.50,
      volume: 28000000,
      peRatio: 32.1,
      priceToBook: 12.8,
      dividendYield: 0.75,
      revenueGrowth: 12.4,
      earningsGrowth: 15.2,
      rsi: 45.8,
      rating: 'Strong Buy'
    },
    {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc.',
      sector: 'Technology',
      industry: 'Internet Software & Services',
      marketCap: 1700000,
      price: 138.21,
      change: 0.85,
      changePercent: 0.62,
      volume: 31000000,
      peRatio: 25.3,
      priceToBook: 5.4,
      dividendYield: 0.0,
      revenueGrowth: 13.8,
      earningsGrowth: 18.7,
      rsi: 52.1,
      rating: 'Buy'
    },
    {
      symbol: 'AMZN',
      companyName: 'Amazon.com Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Internet Retail',
      marketCap: 1500000,
      price: 145.86,
      change: 3.21,
      changePercent: 2.25,
      volume: 45000000,
      peRatio: 52.8,
      priceToBook: 8.2,
      dividendYield: 0.0,
      revenueGrowth: 9.4,
      earningsGrowth: 28.9,
      rsi: 62.7,
      rating: 'Buy'
    },
    {
      symbol: 'TSLA',
      companyName: 'Tesla Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Auto Manufacturers',
      marketCap: 800000,
      price: 248.42,
      change: -5.67,
      changePercent: -2.23,
      volume: 89000000,
      peRatio: 67.2,
      priceToBook: 15.8,
      dividendYield: 0.0,
      revenueGrowth: 19.3,
      earningsGrowth: 42.1,
      rsi: 38.5,
      rating: 'Hold'
    }
  ];

  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Discretionary',
    'Communication Services', 'Industrials', 'Consumer Staples', 'Energy',
    'Utilities', 'Real Estate', 'Materials'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Strong Buy': return 'text-green-700 bg-green-100 border-green-200';
      case 'Buy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Hold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Sell': return 'text-red-600 bg-red-50 border-red-200';
      case 'Strong Sell': return 'text-red-700 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const updateFilter = (key: keyof ScreenerFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Update active filters count
    setActiveFilters(prev => prev + 1);
  };

  const clearFilters = () => {
    setFilters({
      sector: 'all',
      industry: 'all',
      marketCap: [0, 1000000],
      peRatio: [0, 100],
      priceToBook: [0, 10],
      debtToEquity: [0, 200],
      returnOnEquity: [0, 100],
      revenueGrowth: [-50, 100],
      earningsGrowth: [-100, 200],
      dividendYield: [0, 10],
      priceRange: [0, 1000],
      volume: [0, 100000000],
      rsi: [0, 100],
      movingAverage: 'all',
      priceChange: [-20, 20],
      country: 'all',
      exchange: 'all'
    });
    setActiveFilters(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Stock Screener</h1>
          <p className="text-muted-foreground">
            Find stocks that match your investment criteria using fundamental and technical filters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Bookmark className="h-4 w-4 mr-2" />
            Save Screen
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Filters</CardTitle>
                <div className="flex items-center gap-2">
                  {activeFilters > 0 && (
                    <Badge variant="secondary">{activeFilters}</Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="fundamental" className="space-y-4">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="fundamental">Fundamental</TabsTrigger>
                  <TabsTrigger value="technical">Technical</TabsTrigger>
                </TabsList>

                <TabsContent value="fundamental" className="space-y-4">
                  {/* Sector Filter */}
                  <div className="space-y-2">
                    <Label>Sector</Label>
                    <Select value={filters.sector} onValueChange={(value) => updateFilter('sector', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sectors</SelectItem>
                        {sectors.map(sector => (
                          <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Market Cap */}
                  <div className="space-y-2">
                    <Label>Market Cap (M)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.marketCap}
                        onValueChange={(value) => updateFilter('marketCap', value)}
                        max={1000000}
                        step={1000}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${formatNumber(filters.marketCap[0] * 1e6)}</span>
                        <span>${formatNumber(filters.marketCap[1] * 1e6)}</span>
                      </div>
                    </div>
                  </div>

                  {/* P/E Ratio */}
                  <div className="space-y-2">
                    <Label>P/E Ratio</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.peRatio}
                        onValueChange={(value) => updateFilter('peRatio', value)}
                        max={100}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.peRatio[0]}</span>
                        <span>{filters.peRatio[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dividend Yield */}
                  <div className="space-y-2">
                    <Label>Dividend Yield (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.dividendYield}
                        onValueChange={(value) => updateFilter('dividendYield', value)}
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.dividendYield[0]}%</span>
                        <span>{filters.dividendYield[1]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Growth */}
                  <div className="space-y-2">
                    <Label>Revenue Growth (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.revenueGrowth}
                        onValueChange={(value) => updateFilter('revenueGrowth', value)}
                        min={-50}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.revenueGrowth[0]}%</span>
                        <span>{filters.revenueGrowth[1]}%</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="technical" className="space-y-4">
                  {/* Price Range */}
                  <div className="space-y-2">
                    <Label>Price Range ($)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => updateFilter('priceRange', value)}
                        max={1000}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${filters.priceRange[0]}</span>
                        <span>${filters.priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* RSI */}
                  <div className="space-y-2">
                    <Label>RSI</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.rsi}
                        onValueChange={(value) => updateFilter('rsi', value)}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.rsi[0]}</span>
                        <span>{filters.rsi[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Change */}
                  <div className="space-y-2">
                    <Label>Price Change (%)</Label>
                    <div className="px-2">
                      <Slider
                        value={filters.priceChange}
                        onValueChange={(value) => updateFilter('priceChange', value)}
                        min={-20}
                        max={20}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.priceChange[0]}%</span>
                        <span>{filters.priceChange[1]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Moving Average */}
                  <div className="space-y-2">
                    <Label>Moving Average Position</Label>
                    <Select value={filters.movingAverage} onValueChange={(value) => updateFilter('movingAverage', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="above_20">Above 20-day MA</SelectItem>
                        <SelectItem value="above_50">Above 50-day MA</SelectItem>
                        <SelectItem value="above_200">Above 200-day MA</SelectItem>
                        <SelectItem value="below_20">Below 20-day MA</SelectItem>
                        <SelectItem value="below_50">Below 50-day MA</SelectItem>
                        <SelectItem value="below_200">Below 200-day MA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Sort */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by symbol or company name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketCap">Market Cap</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="changePercent">Change %</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="peRatio">P/E Ratio</SelectItem>
                      <SelectItem value="dividendYield">Dividend Yield</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Screening Results</CardTitle>
                <Badge variant="secondary">
                  {mockResults.length} stocks found
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Market Cap</TableHead>
                      <TableHead className="text-right">P/E</TableHead>
                      <TableHead className="text-right">Div Yield</TableHead>
                      <TableHead className="text-right">RSI</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockResults.map((stock) => (
                      <TableRow key={stock.symbol} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">{stock.symbol}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate">{stock.companyName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {stock.sector}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stock.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {stock.change >= 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatPercent(stock.changePercent)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(stock.marketCap * 1e6)}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.peRatio.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.dividendYield.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.rsi.toFixed(0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRatingColor(stock.rating)}>
                            {stock.rating}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onChartStock(stock.symbol)}
                              className="h-8 w-8 p-0"
                            >
                              <BarChart3 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onQuickTrade(stock.symbol)}
                              className="h-8 w-8 p-0"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddToWatchlist(stock.symbol)}
                              className="h-8 w-8 p-0"
                            >
                              <Star className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}