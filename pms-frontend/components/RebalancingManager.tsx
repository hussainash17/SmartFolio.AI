import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { 
  Target, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play,
  Pause,
  Settings,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap,
  PieChart
} from "lucide-react";

interface RebalancingManagerProps {
  onNavigate: (view: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
}

interface RebalancingSuggestion {
  asset: string;
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  difference: number;
  action: 'buy' | 'sell';
  amount: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

interface AllocationTarget {
  category: string;
  current: number;
  target: number;
  min: number;
  max: number;
  drift: number;
}

export function RebalancingManager({ onNavigate, onQuickTrade }: RebalancingManagerProps) {
  const [autoRebalancing, setAutoRebalancing] = useState(false);
  const [rebalanceThreshold, setRebalanceThreshold] = useState([5]);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('quarterly');
  const [selectedStrategy, setSelectedStrategy] = useState('strategic');

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

  // Rebalancing suggestions with more detailed data
  const rebalancingSuggestions: RebalancingSuggestion[] = [
    {
      asset: 'Technology Sector ETF',
      symbol: 'XLK',
      currentWeight: 35.2,
      targetWeight: 30.0,
      difference: -5.2,
      action: 'sell',
      amount: 26000,
      priority: 'high',
      reason: 'Overweight due to recent tech rally'
    },
    {
      asset: 'International Bonds',
      symbol: 'BNDX',
      currentWeight: 8.5,
      targetWeight: 12.0,
      difference: 3.5,
      action: 'buy',
      amount: 17500,
      priority: 'high',
      reason: 'Underweight, add diversification'
    },
    {
      asset: 'Small Cap Value',
      symbol: 'VBR',
      currentWeight: 10.2,
      targetWeight: 15.0,
      difference: 4.8,
      action: 'buy',
      amount: 24000,
      priority: 'medium',
      reason: 'Strategic underweight position'
    },
    {
      asset: 'Emerging Markets',
      symbol: 'VWO',
      currentWeight: 6.8,
      targetWeight: 8.0,
      difference: 1.2,
      action: 'buy',
      amount: 6000,
      priority: 'low',
      reason: 'Minor tactical adjustment'
    },
    {
      asset: 'REITs',
      symbol: 'VNQ',
      currentWeight: 7.5,
      targetWeight: 5.0,
      difference: -2.5,
      action: 'sell',
      amount: 12500,
      priority: 'medium',
      reason: 'Reduce real estate exposure'
    }
  ];

  // Asset allocation targets
  const allocationTargets: AllocationTarget[] = [
    { category: 'US Large Cap', current: 45.2, target: 40.0, min: 35, max: 45, drift: 5.2 },
    { category: 'US Small Cap', current: 10.2, target: 15.0, min: 10, max: 20, drift: -4.8 },
    { category: 'International Developed', current: 18.5, target: 20.0, min: 15, max: 25, drift: -1.5 },
    { category: 'Emerging Markets', current: 6.8, target: 8.0, min: 5, max: 12, drift: -1.2 },
    { category: 'Bonds', current: 12.3, target: 15.0, min: 10, max: 20, drift: -2.7 },
    { category: 'REITs', current: 7.0, target: 2.0, min: 0, max: 10, drift: 5.0 }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getDriftStatus = (drift: number) => {
    const abs = Math.abs(drift);
    if (abs > 5) return 'high';
    if (abs > 2) return 'medium';
    return 'low';
  };

  const totalRebalanceAmount = rebalancingSuggestions.reduce((sum, suggestion) => {
    return sum + (suggestion.action === 'buy' ? suggestion.amount : 0);
  }, 0);

  const estimatedCost = totalRebalanceAmount * 0.001; // 0.1% transaction cost

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Portfolio Rebalancing</h1>
          <p className="text-muted-foreground">
            Maintain your target allocation with intelligent rebalancing recommendations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('risk-analysis')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Risk Analysis
          </Button>
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Tax Impact
          </Button>
          <Button>
            <Target className="h-4 w-4 mr-2" />
            Execute Rebalance
          </Button>
        </div>
      </div>

      {/* Rebalancing Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Alignment Score</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">82%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Minor Drift
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Portfolio vs target allocation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Rebalance Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{formatCurrency(totalRebalanceAmount)}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-green-600 border-green-200">
                5 Trades
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total trading required
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
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                0.1% of NAV
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Transaction costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Last Rebalance</CardTitle>
              <Clock className="h-4 w-4 text-gray-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">47</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-gray-600 border-gray-200">
                Days Ago
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Next: Auto (90 days)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Rebalancing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Rebalancing Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure automatic portfolio rebalancing rules
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Auto-Rebalancing</label>
                  <p className="text-xs text-muted-foreground">Enable automatic rebalancing</p>
                </div>
                <Switch
                  checked={autoRebalancing}
                  onCheckedChange={setAutoRebalancing}
                />
              </div>
              
              {autoRebalancing && (
                <div className="ml-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">Auto-rebalancing enabled</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Portfolio will rebalance automatically based on your settings
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Drift Threshold</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Rebalance when allocation drifts {rebalanceThreshold[0]}% from target
                </p>
                <Slider
                  value={rebalanceThreshold}
                  onValueChange={setRebalanceThreshold}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1%</span>
                  <span>10%</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rebalance Frequency</label>
                <p className="text-xs text-muted-foreground mb-2">How often to check for rebalancing</p>
                <Select value={rebalanceFrequency} onValueChange={setRebalanceFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="allocation">Target Allocation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rebalancing Recommendations</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Suggested trades to realign your portfolio with target allocation
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
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
              <div className="space-y-4">
                {rebalancingSuggestions.map((suggestion, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{suggestion.asset}</h4>
                            <Badge variant="outline" className="text-xs">
                              {suggestion.symbol}
                            </Badge>
                            <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                              {suggestion.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Current: {suggestion.currentWeight.toFixed(1)}% → 
                            Target: {suggestion.targetWeight.toFixed(1)}% 
                            ({formatPercent(suggestion.difference)})
                          </p>
                          <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={suggestion.action === 'buy' ? 'default' : 'secondary'}>
                            {suggestion.action.toUpperCase()} {formatCurrency(suggestion.amount)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Math.min(100, Math.max(0, (suggestion.currentWeight / suggestion.targetWeight) * 100))} 
                          className="flex-1 h-2" 
                        />
                        <Button 
                          size="sm" 
                          onClick={() => onQuickTrade(suggestion.symbol, suggestion.action)}
                          className={suggestion.action === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          {suggestion.action === 'buy' ? (
                            <TrendingUp className="h-4 w-4 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 mr-1" />
                          )}
                          {suggestion.action === 'buy' ? 'Buy' : 'Sell'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex gap-2 mt-6 pt-6 border-t">
                <Button className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Execute All Trades
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calculator className="h-4 w-4 mr-2" />
                  Preview Tax Impact
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Target Allocation Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Review and adjust your target asset allocation
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {allocationTargets.map((target, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{target.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{target.current.toFixed(1)}%</span>
                        <Badge variant="outline" className={getPriorityColor(getDriftStatus(target.drift))}>
                          {formatPercent(target.drift)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Current: {target.current.toFixed(1)}%</span>
                        <span>Target: {target.target.toFixed(1)}%</span>
                        <span>Range: {target.min}-{target.max}%</span>
                      </div>
                      
                      {/* Current allocation bar */}
                      <div className="relative">
                        <Progress value={target.current} className="h-3" />
                        <div 
                          className="absolute top-0 h-3 bg-primary/20 border-2 border-primary rounded"
                          style={{
                            left: `${target.target}%`,
                            width: '2px'
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">0%</span>
                        <span className="text-muted-foreground">50%</span>
                        <span className="text-muted-foreground">100%</span>
                      </div>
                    </div>
                    
                    {Math.abs(target.drift) > rebalanceThreshold[0] && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-800">
                          {Math.abs(target.drift) > rebalanceThreshold[0] 
                            ? `Drift exceeds ${rebalanceThreshold[0]}% threshold` 
                            : 'Within acceptable range'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your portfolio rebalancing activity and performance
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2024-01-15', type: 'Auto', trades: 4, amount: 28500, cost: 28.5, status: 'completed' },
                  { date: '2023-10-12', type: 'Manual', trades: 6, amount: 45200, cost: 45.2, status: 'completed' },
                  { date: '2023-07-08', type: 'Auto', trades: 3, amount: 18900, cost: 18.9, status: 'completed' },
                  { date: '2023-04-03', type: 'Manual', trades: 5, amount: 32100, cost: 32.1, status: 'completed' }
                ].map((rebalance, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">{rebalance.date}</p>
                          <p className="text-sm text-muted-foreground">
                            {rebalance.type} rebalancing • {rebalance.trades} trades
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(rebalance.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        Cost: {formatCurrency(rebalance.cost)}
                      </p>
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