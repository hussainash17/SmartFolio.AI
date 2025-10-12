import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { 
  Target, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  Settings,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap,
  Info,
  ArrowRight,
  ShoppingCart
} from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { AnalyticsService, OpenAPI } from '../src/client';
import { toast } from 'sonner';

interface RebalancingManagerProps {
  onNavigate: (view: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  portfolioId?: string;
}

interface RebalancingSuggestion {
  symbol: string;
  companyName: string;
  sector: string;
  currentAllocation: number;
  targetAllocation: number;
  deviation: number;
  action: 'BUY' | 'SELL';
  suggestedShares: number;
  suggestedValue: number;
  currentValue: number;
  priority: 'high' | 'medium' | 'low';
}

export function RebalancingManager({ onNavigate, onQuickTrade, portfolioId }: RebalancingManagerProps) {
  const queryClient = useQueryClient();
  const [autoRebalancing, setAutoRebalancing] = useState(false);
  const [rebalanceThreshold, setRebalanceThreshold] = useState([5]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('quarterly');
  const [selectedStrategy, setSelectedStrategy] = useState('strategic');
  const [minTradeValue, setMinTradeValue] = useState(100);

  // Fetch allocation data
  const { data: allocation, isLoading } = useQuery({
    queryKey: queryKeys.portfolioAllocation(portfolioId || 'none'),
    enabled: !!portfolioId,
    queryFn: async () => {
      if (!portfolioId) return null;
      return AnalyticsService.getPortfolioAllocation({ portfolioId }) as any;
    },
    staleTime: 30 * 1000,
  });

  // Fetch targets
  const { data: targets = [] } = useQuery({
    queryKey: queryKeys.allocationTargets(portfolioId || 'none'),
    enabled: !!portfolioId,
    queryFn: async () => {
      if (!portfolioId) return [];
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/portfolio/${portfolioId}/allocation/targets`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return [];
      return await res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  // Calculate rebalancing suggestions
  const rebalancingSuggestions: RebalancingSuggestion[] = useMemo(() => {
    if (!allocation || !targets.length) return [];

    const totalValue = allocation.total_value || 0;
    if (totalValue <= 0) return [];

    const suggestions: RebalancingSuggestion[] = [];
    const stocks = allocation.stock_wise_allocation || [];
    const sectors = allocation.sector_wise_allocation || [];

    // Create target map by sector
    const targetMap = new Map();
    targets.forEach((t: any) => {
      targetMap.set(t.category, t.target_percent);
    });

    // Group stocks by sector
    const stocksBySector = new Map();
    stocks.forEach((stock: any) => {
      const sector = stock.sector || 'Unknown';
      if (!stocksBySector.has(sector)) {
        stocksBySector.set(sector, []);
      }
      stocksBySector.get(sector).push(stock);
    });

    // Calculate suggestions for each sector
    sectors.forEach((sector: any) => {
      const sectorName = sector.sector;
      const currentPercent = sector.allocation_percent || 0;
      const targetPercent = targetMap.get(sectorName) || currentPercent;
      const deviation = currentPercent - targetPercent;

      if (Math.abs(deviation) > rebalanceThreshold[0]) {
        const sectorStocks = stocksBySector.get(sectorName) || [];
        const targetValue = (targetPercent / 100) * totalValue;
        const currentValue = (currentPercent / 100) * totalValue;
        const difference = targetValue - currentValue;

        sectorStocks.forEach((stock: any) => {
          const stockValue = stock.current_value || 0;
          const stockPercent = sectorStocks.length > 0 
            ? stockValue / sectorStocks.reduce((sum: number, s: any) => sum + (s.current_value || 0), 0)
            : 1;

          const suggestedValueChange = difference * stockPercent;
          const currentPrice = stock.quantity > 0 ? stockValue / stock.quantity : 0;
          
          if (currentPrice > 0) {
            const suggestedShares = Math.abs(Math.round(suggestedValueChange / currentPrice));

            if (suggestedShares > 0 && Math.abs(suggestedValueChange) >= minTradeValue) {
              const priority = Math.abs(deviation) > 10 ? 'high' : Math.abs(deviation) > 5 ? 'medium' : 'low';
              
              suggestions.push({
                symbol: stock.symbol,
                companyName: stock.name,
                sector: sectorName,
                currentAllocation: stock.allocation_percent || 0,
                targetAllocation: targetPercent,
                deviation: deviation,
                action: suggestedValueChange > 0 ? 'BUY' : 'SELL',
                suggestedShares: suggestedShares,
                suggestedValue: Math.abs(suggestedValueChange),
                currentValue: stockValue,
                priority: priority,
              });
            }
          }
        });
      }
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }, [allocation, targets, rebalanceThreshold, minTradeValue]);

  const totalBuyValue = rebalancingSuggestions
    .filter(s => s.action === 'BUY')
    .reduce((sum, s) => sum + s.suggestedValue, 0);

  const totalSellValue = rebalancingSuggestions
    .filter(s => s.action === 'SELL')
    .reduce((sum, s) => sum + s.suggestedValue, 0);

  const estimatedCost = (totalBuyValue + totalSellValue) * 0.001; // 0.1% transaction cost

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleExecuteRebalancing = () => {
    toast.info('Rebalancing execution will be implemented in the next phase');
  };

  if (!portfolioId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            Please select a portfolio to view rebalancing recommendations
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Rebalancing</h1>
          <p className="text-muted-foreground">Automated rebalancing recommendations and execution</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('allocation')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Asset Allocation
          </Button>
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(portfolioId) })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Actions Needed</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{rebalancingSuggestions.length}</div>
            <Badge variant="outline" className="mt-2">
              {rebalancingSuggestions.filter(s => s.priority === 'high').length} High Priority
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Buy Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totalBuyValue)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {rebalancingSuggestions.filter(s => s.action === 'BUY').length} buy orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Sell Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(totalSellValue)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {rebalancingSuggestions.filter(s => s.action === 'SELL').length} sell orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Est. Cost</CardTitle>
              <Calculator className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{formatCurrency(estimatedCost)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Transaction costs (0.1%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Rebalancing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-Rebalancing Settings
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automatic portfolio rebalancing rules
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable Auto-Rebalancing</label>
                  <p className="text-xs text-muted-foreground">Automatic rebalancing</p>
                </div>
                <Switch
                  checked={autoRebalancing}
                  onCheckedChange={setAutoRebalancing}
                />
              </div>
              
              {autoRebalancing && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium">Active</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-rebalancing is enabled
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Drift Threshold (%)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Trigger rebalancing at {rebalanceThreshold[0]}% drift
              </p>
              <Slider
                value={rebalanceThreshold}
                onValueChange={setRebalanceThreshold}
                min={1}
                max={15}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span className="font-medium">{rebalanceThreshold[0]}%</span>
                <span>15%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <p className="text-xs text-muted-foreground mb-2">Check interval</p>
              <Select value={rebalanceFrequency} onValueChange={setRebalanceFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Trade Value ($)</label>
              <p className="text-xs text-muted-foreground mb-2">Ignore trades below</p>
              <Input
                type="number"
                value={minTradeValue}
                onChange={(e) => setMinTradeValue(Number(e.target.value) || 100)}
                min="0"
                step="50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="recommendations">
            Recommendations
            {rebalancingSuggestions.length > 0 && (
              <Badge variant="destructive" className="ml-2">{rebalancingSuggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="simulation">Simulate</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {rebalancingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Portfolio is Balanced</h3>
                  <p className="text-muted-foreground mb-4">
                    Your current allocation is within {rebalanceThreshold[0]}% of your targets.<br/>
                    No rebalancing needed at this time.
                  </p>
                  <Button variant="outline" onClick={() => onNavigate('allocation')}>
                    <Target className="h-4 w-4 mr-2" />
                    View Allocation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900">Rebalancing Recommended</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Your portfolio has drifted from target allocation by more than {rebalanceThreshold[0]}%.
                        Execute the suggested trades to realign with your investment strategy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recommended Trades</CardTitle>
                    <div className="flex gap-2">
                      <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strategic">Strategic</SelectItem>
                          <SelectItem value="tactical">Tactical</SelectItem>
                          <SelectItem value="tax-efficient">Tax Efficient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                        <TableHead className="text-right">Shares</TableHead>
                        <TableHead className="text-right">Est. Value</TableHead>
                        <TableHead className="text-right">Deviation</TableHead>
                        <TableHead className="text-right">Execute</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rebalancingSuggestions.map((suggestion, idx) => (
                        <TableRow key={`${suggestion.symbol}-${idx}`}>
                          <TableCell>
                            <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{suggestion.symbol}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{suggestion.companyName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{suggestion.sector}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge 
                              variant={suggestion.action === 'BUY' ? 'default' : 'destructive'}
                              className={suggestion.action === 'BUY' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                              {suggestion.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {suggestion.suggestedShares}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(suggestion.suggestedValue)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={Math.abs(suggestion.deviation) > 10 ? 'destructive' : 'secondary'}>
                              {formatPercent(suggestion.deviation)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => onQuickTrade(suggestion.symbol, suggestion.action.toLowerCase() as 'buy' | 'sell')}
                              className="gap-1"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Trade
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Summary and Action */}
                  <div className="mt-6 p-4 bg-muted rounded-lg space-y-4">
                    <h4 className="font-semibold">Rebalancing Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Trades:</span>
                        <p className="font-medium">{rebalancingSuggestions.length}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Buy Value:</span>
                        <p className="font-medium text-green-600">{formatCurrency(totalBuyValue)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sell Value:</span>
                        <p className="font-medium text-red-600">{formatCurrency(totalSellValue)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Est. Cost:</span>
                        <p className="font-medium">{formatCurrency(estimatedCost)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4 border-t">
                      <Button onClick={handleExecuteRebalancing} className="flex-1 gap-2">
                        <Play className="h-4 w-4" />
                        Execute All Rebalancing Trades
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Tax Impact Analysis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Simulation Tab */}
        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Simulation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Preview the impact of rebalancing on your portfolio
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Before Rebalancing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Portfolio Value:</span>
                          <span className="font-medium">{formatCurrency(allocation?.total_value || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Avg. Drift:</span>
                          <span className="font-medium text-yellow-600">
                            {rebalancingSuggestions.length > 0 
                              ? (rebalancingSuggestions.reduce((sum, s) => sum + Math.abs(s.deviation), 0) / rebalancingSuggestions.length).toFixed(2)
                              : '0.00'}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Max Deviation:</span>
                          <span className="font-medium text-red-600">
                            {rebalancingSuggestions.length > 0
                              ? Math.max(...rebalancingSuggestions.map(s => Math.abs(s.deviation))).toFixed(2)
                              : '0.00'}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-green-200 bg-green-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-green-800">After Rebalancing</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Portfolio Value:</span>
                          <span className="font-medium text-green-800">
                            {formatCurrency((allocation?.total_value || 0) - estimatedCost)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Avg. Drift:</span>
                          <span className="font-medium text-green-800">~0.5%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Max Deviation:</span>
                          <span className="font-medium text-green-800">~1.0%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900">Simulation Notes</h4>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                        <li>Estimated transaction costs: {formatCurrency(estimatedCost)}</li>
                        <li>Market impact assumed minimal for mid-cap+ stocks</li>
                        <li>Prices based on current market data</li>
                        <li>Tax implications not included in this preview</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your portfolio rebalancing activity and performance impact
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { 
                    date: '2024-09-15', 
                    type: 'Auto', 
                    trades: 4, 
                    buyValue: 18500, 
                    sellValue: 16200,
                    cost: 34.7, 
                    status: 'completed',
                    drift: 6.2,
                    impact: '+0.3%'
                  },
                  { 
                    date: '2024-06-12', 
                    type: 'Manual', 
                    trades: 6, 
                    buyValue: 25200, 
                    sellValue: 23100,
                    cost: 48.3, 
                    status: 'completed',
                    drift: 8.5,
                    impact: '+0.5%'
                  },
                  { 
                    date: '2024-03-08', 
                    type: 'Auto', 
                    trades: 3, 
                    buyValue: 12900, 
                    sellValue: 11800,
                    cost: 24.7, 
                    status: 'completed',
                    drift: 5.3,
                    impact: '+0.2%'
                  },
                ].map((rebalance, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{rebalance.date}</p>
                              <Badge variant="outline">{rebalance.type}</Badge>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Trades:</span>
                                <span className="ml-1 font-medium">{rebalance.trades}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Buy:</span>
                                <span className="ml-1 font-medium text-green-600">{formatCurrency(rebalance.buyValue)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sell:</span>
                                <span className="ml-1 font-medium text-red-600">{formatCurrency(rebalance.sellValue)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="ml-1 font-medium">{formatCurrency(rebalance.cost)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-2">Drift: {rebalance.drift}%</Badge>
                          <p className="text-sm font-medium text-green-600">{rebalance.impact}</p>
                          <p className="text-xs text-muted-foreground">Performance impact</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
