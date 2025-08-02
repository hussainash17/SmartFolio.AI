import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  Settings,
  Volume2,
  Target,
  Plus
} from "lucide-react";
import { MarketData } from "../../types/trading";

interface TradingViewChartProps {
  stock: MarketData;
  onQuickTrade: (symbol: string, side?: 'buy' | 'sell') => void;
  className?: string;
}

export function TradingViewChart({ stock, onQuickTrade, className }: TradingViewChartProps) {
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('candlestick');
  const [showOrderEntry, setShowOrderEntry] = useState(false);

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

  // Generate mock chart data points for visualization
  const generateMockData = () => {
    const points = [];
    const basePrice = stock.currentPrice;
    const variation = basePrice * 0.02; // 2% variation
    
    for (let i = 0; i < 100; i++) {
      const price = basePrice + (Math.random() - 0.5) * variation;
      points.push({
        x: i * 5, // 5px intervals
        y: 300 - (price / basePrice) * 100, // Scale to chart height
        price: price
      });
    }
    return points;
  };

  const chartData = generateMockData();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{stock.symbol}</span>
                <Badge variant="outline">{stock.sector}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{stock.companyName}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(stock.currentPrice)}</p>
                <div className="flex items-center gap-1">
                  {stock.change >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={stock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(stock.change)} ({formatPercent(stock.changePercent)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickTrade(stock.symbol, 'buy')}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              Buy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuickTrade(stock.symbol, 'sell')}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Sell
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Timeframe:</span>
              <div className="flex gap-1">
                {['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M'].map((tf) => (
                  <Button
                    key={tf}
                    variant={timeframe === tf ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeframe(tf)}
                    className="h-7 px-2 text-xs"
                  >
                    {tf}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Chart:</span>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Vol:</span>
              <span>{formatNumber(stock.volume)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">52W:</span>
              <span>{formatCurrency(stock.low52Week)} - {formatCurrency(stock.high52Week)}</span>
            </div>
            {stock.peRatio && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">P/E:</span>
                <span>{stock.peRatio}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mock TradingView Chart */}
        <div className="relative bg-gradient-to-b from-background to-muted/20 h-96 overflow-hidden">
          {/* Grid Lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {/* Horizontal grid lines */}
            {[...Array(8)].map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 48}
                x2="100%"
                y2={i * 48}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
            ))}
            {/* Vertical grid lines */}
            {[...Array(10)].map((_, i) => (
              <line
                key={`v-${i}`}
                x1={`${i * 10}%`}
                y1={0}
                x2={`${i * 10}%`}
                y2="100%"
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
            ))}
          </svg>

          {/* Mock Price Chart */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 2 }}>
            {/* Area fill */}
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={stock.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"} stopOpacity={0.3} />
                <stop offset="100%" stopColor={stock.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            
            {/* Price line */}
            <polyline
              fill="none"
              stroke={stock.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
              strokeWidth={2}
              points={chartData.map(point => `${point.x},${point.y}`).join(' ')}
            />
            
            {/* Area fill */}
            <polygon
              fill="url(#priceGradient)"
              points={`${chartData.map(point => `${point.x},${point.y}`).join(' ')} ${chartData[chartData.length - 1]?.x || 0},384 0,384`}
            />

            {/* Current price line */}
            <line
              x1={0}
              y1={200}
              x2="100%"
              y2={200}
              stroke={stock.change >= 0 ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)"}
              strokeWidth={1}
              strokeDasharray="5,5"
              strokeOpacity={0.7}
            />
          </svg>

          {/* Price Labels */}
          <div className="absolute right-2 top-2 space-y-1 text-xs bg-background/80 backdrop-blur rounded p-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span>{formatCurrency(stock.currentPrice - stock.change)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span>{formatCurrency(stock.currentPrice * 1.012)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span>{formatCurrency(stock.currentPrice * 0.988)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-semibold">{formatCurrency(stock.currentPrice)}</span>
            </div>
          </div>

          {/* Chart Trading Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOrderEntry(!showOrderEntry)}
              className="bg-background/80 backdrop-blur"
            >
              <Target className="h-4 w-4 mr-1" />
              Place Order
            </Button>
            <Button
              size="sm"
              onClick={() => onQuickTrade(stock.symbol)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Quick Trade
            </Button>
          </div>

          {/* Order Entry Panel */}
          {showOrderEntry && (
            <div className="absolute bottom-16 right-4 bg-background border rounded-lg p-4 shadow-lg min-w-64">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Quick Order</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOrderEntry(false)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onQuickTrade(stock.symbol, 'buy');
                      setShowOrderEntry(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Buy Market
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onQuickTrade(stock.symbol, 'sell');
                      setShowOrderEntry(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sell Market
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onQuickTrade(stock.symbol);
                    setShowOrderEntry(false);
                  }}
                >
                  Advanced Order
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Volume Chart */}
        <div className="h-16 bg-muted/20 relative border-t">
          <svg className="absolute inset-0 w-full h-full">
            {chartData.map((point, i) => (
              <rect
                key={i}
                x={point.x - 1}
                y={32}
                width={2}
                height={Math.random() * 32}
                fill="currentColor"
                fillOpacity={0.3}
              />
            ))}
          </svg>
          <div className="absolute left-2 bottom-1 text-xs text-muted-foreground">
            Volume: {formatNumber(stock.volume)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}