import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  Star, 
  Activity,
  BarChart3,
  Volume2,
  ShoppingCart
} from "lucide-react";
import { MarketData as MarketDataType, Watchlist, NewsItem } from "../types/trading";

interface MarketDataProps {
  marketData: MarketDataType[];
  watchlists: Watchlist[];
  news: NewsItem[];
  onAddToWatchlist: (watchlistId: string, symbol: string) => void;
  onRemoveFromWatchlist: (watchlistId: string, symbol: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  onChartStock: (symbol: string) => void;
}

export function MarketData({ 
  marketData, 
  watchlists, 
  news, 
  onAddToWatchlist, 
  onRemoveFromWatchlist,
  onQuickTrade,
  onChartStock
}: MarketDataProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'volume'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const filteredAndSortedData = marketData
    .filter(stock =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      
      switch (sortBy) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'price':
          aVal = a.currentPrice;
          bVal = b.currentPrice;
          break;
        case 'change':
          aVal = a.changePercent;
          bVal = b.changePercent;
          break;
        case 'volume':
          aVal = a.volume;
          bVal = b.volume;
          break;
        default:
          aVal = a.symbol;
          bVal = b.symbol;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const topGainers = marketData
    .filter(stock => stock.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  const topLosers = marketData
    .filter(stock => stock.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  const mostActive = marketData
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Top Gainer</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {topGainers[0] && (
              <div>
                <div className="text-2xl font-bold">{topGainers[0].symbol}</div>
                <p className="text-xs text-muted-foreground">{topGainers[0].companyName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{formatCurrency(topGainers[0].currentPrice)}</span>
                  <span className="text-green-600">{formatPercent(topGainers[0].changePercent)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Top Loser</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {topLosers[0] && (
              <div>
                <div className="text-2xl font-bold">{topLosers[0].symbol}</div>
                <p className="text-xs text-muted-foreground">{topLosers[0].companyName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{formatCurrency(topLosers[0].currentPrice)}</span>
                  <span className="text-red-600">{formatPercent(topLosers[0].changePercent)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Most Active</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mostActive[0] && (
              <div>
                <div className="text-2xl font-bold">{mostActive[0].symbol}</div>
                <p className="text-xs text-muted-foreground">{mostActive[0].companyName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{formatCurrency(mostActive[0].currentPrice)}</span>
                  <span className="text-muted-foreground">Vol: {formatNumber(mostActive[0].volume)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-stocks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-stocks">All Stocks</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="movers">Top Movers</TabsTrigger>
          <TabsTrigger value="news">Market News</TabsTrigger>
        </TabsList>

        <TabsContent value="all-stocks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Market Data</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stocks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('symbol')} className="p-0 h-auto font-medium">
                        Symbol {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('price')} className="p-0 h-auto font-medium">
                        Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('change')} className="p-0 h-auto font-medium">
                        Change {sortBy === 'change' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('volume')} className="p-0 h-auto font-medium">
                        Volume {sortBy === 'volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Market Cap</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData.map((stock) => (
                    <TableRow key={stock.symbol}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stock.symbol}</span>
                          <Badge variant="outline" className="text-xs">{stock.sector}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="truncate">{stock.companyName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(stock.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {stock.change >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <div className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                            <div>{formatCurrency(stock.change)}</div>
                            <div className="text-xs">{formatPercent(stock.changePercent)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(stock.volume)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(stock.marketCap)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1">
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
                            onClick={() => onAddToWatchlist(watchlists[0]?.id, stock.symbol)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              {watchlists[0] && watchlists[0].symbols.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchlists[0].symbols.map((symbol) => {
                      const stock = marketData.find(s => s.symbol === symbol);
                      if (!stock) return null;
                      
                      return (
                        <TableRow key={symbol}>
                          <TableCell className="font-medium">{stock.symbol}</TableCell>
                          <TableCell>{stock.companyName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stock.currentPrice)}</TableCell>
                          <TableCell className="text-right">
                            <div className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(stock.change)} ({formatPercent(stock.changePercent)})
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemoveFromWatchlist(watchlists[0].id, symbol)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Star className="h-3 w-3 fill-current" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No stocks in your watchlist</p>
                  <Button variant="outline" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stocks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Top Gainers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topGainers.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between group">
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {stock.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                          <p className="text-xs text-green-600">{formatPercent(stock.changePercent)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChartStock(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onQuickTrade(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Top Losers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topLosers.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between group">
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {stock.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                          <p className="text-xs text-red-600">{formatPercent(stock.changePercent)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChartStock(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onQuickTrade(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mostActive.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between group">
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {stock.companyName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                          <p className="text-xs text-muted-foreground">Vol: {formatNumber(stock.volume)}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChartStock(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onQuickTrade(stock.symbol)}
                            className="h-6 w-6 p-0"
                          >
                            <ShoppingCart className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {news.map((article) => (
                  <div key={article.id} className="border-b border-border pb-4 last:border-b-0">
                    <h3 className="font-medium mb-2">{article.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{article.source}</span>
                        {article.symbols && article.symbols.length > 0 && (
                          <div className="flex gap-1">
                            {article.symbols.map((symbol) => (
                              <Badge key={symbol} variant="outline" className="text-xs">
                                {symbol}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}