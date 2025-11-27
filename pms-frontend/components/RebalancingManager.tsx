import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
  Zap,
  Info,
  ShoppingCart
} from "lucide-react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../hooks/queryKeys';
import { AnalyticsService, OpenAPI } from '../src/client';
import { toast } from 'sonner';
import { usePortfolios } from '../hooks/usePortfolios';
import { useRebalancing } from '../hooks/useRebalancing';
import type { RebalancingSuggestion } from '../types/rebalancing';
import { formatCurrency, formatPercent } from "../lib/utils";

interface RebalancingManagerProps {
  onNavigate: (view: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  portfolioId?: string;
}

export function RebalancingManager({ onNavigate, onQuickTrade, portfolioId }: RebalancingManagerProps) {
  const queryClient = useQueryClient();
  const [autoRebalancing, setAutoRebalancing] = useState(false);
  const [rebalanceThreshold, setRebalanceThreshold] = useState([5]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('quarterly');
  const [selectedStrategy, setSelectedStrategy] = useState('strategic');
  const [minTradeValue, setMinTradeValue] = useState(100);
  const [settingsInitialized, setSettingsInitialized] = useState(false);
  const lastSavedSettingsRef = useRef<string>('');
  const { portfolios, selectedPortfolio, setSelectedPortfolioId } = usePortfolios();

  // Local current portfolio selection used by this view
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string | null>(
    portfolioId ?? (selectedPortfolio ? selectedPortfolio.id : null)
  );

  // Initialize current portfolio once portfolios load, if not set yet
  useEffect(() => {
    if (!currentPortfolioId) {
      const initial = portfolioId ?? (selectedPortfolio ? selectedPortfolio.id : portfolios[0]?.id);
      if (initial) setCurrentPortfolioId(String(initial));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, selectedPortfolio, portfolios]);

  const historyLimit = 20;
  const historyOffset = 0;

  const {
    settings,
    isSettingsLoading,
    saveSettings,
    isSavingSettings,
    suggestions: apiSuggestions,
    isSuggestionsLoading,
    isSuggestionsFetching,
    refetchSuggestions,
    history,
    isHistoryLoading,
    isHistoryFetching,
    refetchHistory,
    executeRebalancing,
    isExecuting,
  } = useRebalancing({
    portfolioId: currentPortfolioId,
    thresholdPct: rebalanceThreshold[0],
    minTradeValue,
    strategy: selectedStrategy,
    historyLimit,
    historyOffset,
  });

  // Keep global selection in sync (optional)
  useEffect(() => {
    if (currentPortfolioId) setSelectedPortfolioId(currentPortfolioId);
  }, [currentPortfolioId, setSelectedPortfolioId]);

  useEffect(() => {
    if (!settings) {
      return;
    }
    const nextThreshold = Number(settings.thresholdPct ?? 5) || 5;
    const nextFrequency = settings.frequency || 'quarterly';
    const nextMinTradeValue = Number(settings.minTradeValue ?? 100) || 100;

    setAutoRebalancing(Boolean(settings.enabled));
    setRebalanceThreshold([nextThreshold]);
    setRebalanceFrequency(nextFrequency);
    setMinTradeValue(nextMinTradeValue);

    lastSavedSettingsRef.current = JSON.stringify({
      enabled: Boolean(settings.enabled),
      thresholdPct: nextThreshold,
      frequency: nextFrequency,
      minTradeValue: nextMinTradeValue,
    });
    setSettingsInitialized(true);
  }, [settings]);

  useEffect(() => {
    if (!settingsInitialized || !currentPortfolioId) {
      return;
    }

    const snapshot = JSON.stringify({
      enabled: autoRebalancing,
      thresholdPct: rebalanceThreshold[0],
      frequency: rebalanceFrequency,
      minTradeValue,
    });

    if (snapshot === lastSavedSettingsRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      lastSavedSettingsRef.current = snapshot;
      saveSettings({
        enabled: autoRebalancing,
        threshold_pct: rebalanceThreshold[0],
        frequency: rebalanceFrequency,
        min_trade_value: minTradeValue,
      }).catch(() => {
        lastSavedSettingsRef.current = '';
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [autoRebalancing, rebalanceFrequency, rebalanceThreshold, minTradeValue, currentPortfolioId, saveSettings, settingsInitialized]);

  const toNumber = (value: unknown): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Fetch allocation data
  const { data: allocation, isLoading: isAllocationLoading } = useQuery({
    queryKey: queryKeys.portfolioAllocation(currentPortfolioId || 'none'),
    enabled: !!currentPortfolioId,
    queryFn: async () => {
      if (!currentPortfolioId) return null;
      return AnalyticsService.getPortfolioAllocation({ portfolioId: currentPortfolioId }) as any;
    },
    staleTime: 30 * 1000,
  });

  // Fetch targets
  const { data: targets = [] } = useQuery({
    queryKey: queryKeys.allocationTargets(currentPortfolioId || 'none'),
    enabled: !!currentPortfolioId,
    queryFn: async () => {
      if (!currentPortfolioId) return [];
      const base = (OpenAPI as any).BASE || '';
      const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/portfolio/${currentPortfolioId}/allocation/targets`, {
        headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
        credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
      });
      if (!res.ok) return [];
      return await res.json();
    },
  });
  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const sliderThreshold = rebalanceThreshold[0];

  const localSuggestions: RebalancingSuggestion[] = useMemo(() => {
    if (!allocation || !targets.length) return [];

    const totalValue = toNumber(allocation.total_value);
    if (totalValue <= 0) return [];

    const suggestions: RebalancingSuggestion[] = [];
    const stocks = allocation.stock_wise_allocation || [];
    const sectors = allocation.sector_wise_allocation || [];

    const targetMap = new Map<string, number>();
    targets.forEach((t: any) => {
      targetMap.set(t.category, toNumber(t.target_percent));
    });

    const stocksBySector = new Map<string, any[]>();
    stocks.forEach((stock: any) => {
      const sector = stock.sector || 'Unknown';
      if (!stocksBySector.has(sector)) {
        stocksBySector.set(sector, []);
      }
      stocksBySector.get(sector)!.push(stock);
    });

    sectors.forEach((sector: any) => {
      const sectorName = sector.sector;
      const currentPercent = toNumber(sector.allocation_percent);
      const targetPercent = targetMap.get(sectorName) ?? currentPercent;
      const deviation = currentPercent - targetPercent;

      if (Math.abs(deviation) <= sliderThreshold) {
        return;
      }

      const sectorStocks = stocksBySector.get(sectorName) || [];
      if (!sectorStocks.length) {
        return;
      }

      const targetValue = (targetPercent / 100) * totalValue;
      const currentValue = (currentPercent / 100) * totalValue;
      const difference = targetValue - currentValue;
      const sectorTotalValue = sectorStocks.reduce((sum: number, s: any) => sum + toNumber(s.current_value), 0);

      sectorStocks.forEach((stock: any) => {
        const stockValue = toNumber(stock.current_value);
        const stockPercent = sectorTotalValue > 0 ? stockValue / sectorTotalValue : 1;

        const suggestedValueChange = difference * stockPercent;
        const currentPrice = stock.quantity > 0 ? stockValue / stock.quantity : 0;

        if (currentPrice <= 0) {
          return;
        }

        const suggestedShares = Math.abs(Math.round(suggestedValueChange / currentPrice));

        if (suggestedShares > 0 && Math.abs(suggestedValueChange) >= minTradeValue) {
          const priority = Math.abs(deviation) > 10 ? 'high' : Math.abs(deviation) > 5 ? 'medium' : 'low';

          suggestions.push({
            symbol: stock.symbol,
            companyName: stock.name,
            sector: sectorName,
            currentAllocation: toNumber(stock.allocation_percent),
            targetAllocation: targetPercent,
            deviation,
            action: suggestedValueChange > 0 ? 'BUY' : 'SELL',
            suggestedShares,
            suggestedValue: Math.abs(suggestedValueChange),
            currentValue: stockValue,
            priority,
          });
        }
      });
    });

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }, [allocation, targets, sliderThreshold, minTradeValue]);

  const fallbackTotals = useMemo(() => {
    const totalBuy = localSuggestions
      .filter((s) => s.action === 'BUY')
      .reduce((sum, s) => sum + s.suggestedValue, 0);
    const totalSell = localSuggestions
      .filter((s) => s.action === 'SELL')
      .reduce((sum, s) => sum + s.suggestedValue, 0);
    const estimated = (totalBuy + totalSell) * 0.001;

    return {
      buyValue: totalBuy,
      sellValue: totalSell,
      estimatedCost: estimated,
    };
  }, [localSuggestions]);

  const suggestionsData = apiSuggestions ?? null;
  const rebalancingSuggestions = suggestionsData ? suggestionsData.suggestions : localSuggestions;
  const totals = suggestionsData ? suggestionsData.totals : fallbackTotals;

  const totalBuyValue = totals.buyValue ?? 0;
  const totalSellValue = totals.sellValue ?? 0;
  const estimatedCost = totals.estimatedCost ?? (totalBuyValue + totalSellValue) * 0.001;
  const historyRuns = history?.runs ?? [];
  const isUsingFallbackSuggestions = !suggestionsData && rebalancingSuggestions.length > 0;
  const averageDeviation =
    rebalancingSuggestions.length > 0
      ? rebalancingSuggestions.reduce((sum, s) => sum + Math.abs(s.deviation), 0) / rebalancingSuggestions.length
      : 0;
  const maxDeviation =
    rebalancingSuggestions.length > 0
      ? Math.max(...rebalancingSuggestions.map((s) => Math.abs(s.deviation)))
      : 0;
  const projectedAverageDeviation = averageDeviation * 0.2;
  const projectedMaxDeviation = maxDeviation * 0.2;

  const isDataLoading = isAllocationLoading || isSettingsLoading || (isSuggestionsLoading && !suggestionsData);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleExecuteRebalancing = async () => {
    if (!currentPortfolioId) {
      return;
    }
    const actionableSuggestions = rebalancingSuggestions.filter((s) => s.suggestedShares > 0);
    if (actionableSuggestions.length === 0) {
      toast.info('No rebalancing trades to execute');
      return;
    }

    try {
      await executeRebalancing({
        suggestions: actionableSuggestions.map((s) => ({
          symbol: s.symbol,
          action: s.action,
          quantity: s.suggestedShares,
        })),
        simulate: true,
      });
    } catch (error) {
      console.error('Rebalancing execution failed', error);
    }
  };

  const handleRefresh = async () => {
    if (!currentPortfolioId) {
      return;
    }
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(currentPortfolioId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationTargets(currentPortfolioId) }),
      refetchSuggestions(),
      refetchHistory(),
    ]);
  };

  if (!currentPortfolioId) {
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

  if (isDataLoading) {
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
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Portfolio Rebalancing</h1>
          <p className="text-muted-foreground text-lg">Maintain your target allocation with intelligent rebalancing recommendations</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={currentPortfolioId || ''} onValueChange={(v) => setCurrentPortfolioId(v)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => onNavigate('allocation')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Asset Allocation
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isAllocationLoading || isSuggestionsFetching || isHistoryFetching}
          >
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
                  disabled={isSettingsLoading || isSavingSettings}
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
              <div className="text-xs text-muted-foreground space-y-1">
                {settings?.lastRebalanceAt && (
                  <p>Last run: {formatDateTime(settings.lastRebalanceAt)}</p>
                )}
                {settings?.nextRebalanceAt && (
                  <p>Next scheduled: {formatDateTime(settings.nextRebalanceAt)}</p>
                )}
              </div>
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
                disabled={isSettingsLoading || isSavingSettings}
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
              <Select
                value={rebalanceFrequency}
                onValueChange={setRebalanceFrequency}
                disabled={isSettingsLoading || isSavingSettings}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semiannual">Semi-Annual</SelectItem>
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
                disabled={isSettingsLoading || isSavingSettings}
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
                  {isUsingFallbackSuggestions && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                      Using locally computed fallback suggestions while the API response is unavailable.
                    </div>
                  )}
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
                      <Button
                        onClick={handleExecuteRebalancing}
                        className="flex-1 gap-2"
                        disabled={isExecuting || rebalancingSuggestions.length === 0}
                      >
                        {isExecuting ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
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
                            {averageDeviation.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Max Deviation:</span>
                          <span className="font-medium text-red-600">
                            {maxDeviation.toFixed(2)}%
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
                          <span className="font-medium text-green-800">
                            {projectedAverageDeviation.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-700">Max Deviation:</span>
                          <span className="font-medium text-green-800">
                            {projectedMaxDeviation.toFixed(2)}%
                          </span>
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
            {isHistoryLoading || isHistoryFetching ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyRuns.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No rebalancing activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {historyRuns.map((run) => (
                  <Card key={run.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{formatDateTime(run.executedAt)}</p>
                              <Badge variant="outline" className="capitalize">{run.type}</Badge>
                              <Badge variant="secondary">{run.tradesCount} trades</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Buy:</span>
                                <span className="ml-1 font-medium text-green-600">{formatCurrency(run.buyValue)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sell:</span>
                                <span className="ml-1 font-medium text-red-600">{formatCurrency(run.sellValue)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Net Cost:</span>
                                <span className="ml-1 font-medium">{formatCurrency(run.transactionCost)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Trades:</span>
                                <span className="ml-1 font-medium">{run.tradesCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="mb-2">
                            Drift: {formatPercent(run.driftBefore)} → {formatPercent(run.driftAfter)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {run.trades.length > 0 ? `${run.trades[0].action} ${run.trades[0].symbol}` : 'Batch execution'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
