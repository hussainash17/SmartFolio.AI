import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  RefreshCw,
  Download,
  Settings,
  Calculator
} from "lucide-react";

interface RiskManagementProps {
  onNavigate: (view: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
  defaultTab?: 'metrics' | 'concentration' | 'correlation' | 'rebalancing' | 'scenarios';
}

interface RiskMetric {
  name: string;
  value: number;
  target: number;
  status: 'low' | 'medium' | 'high';
  description: string;
}

interface CorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
  risk: 'low' | 'medium' | 'high';
}

interface RebalancingSuggestion {
  asset: string;
  currentWeight: number;
  targetWeight: number;
  difference: number;
  action: 'buy' | 'sell';
  amount: number;
}

export function RiskManagement({ onNavigate, onQuickTrade, defaultTab = 'metrics' }: RiskManagementProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y');
  const [riskTolerance, setRiskTolerance] = useState('moderate');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '' : ''}${percent.toFixed(2)}%`;
  };

  // Mock risk metrics
  const riskMetrics: RiskMetric[] = [
    {
      name: 'Portfolio Volatility',
      value: 16.2,
      target: 15.0,
      status: 'medium',
      description: 'Annual volatility of your portfolio'
    },
    {
      name: 'Value at Risk (95%)',
      value: 12450,
      target: 10000,
      status: 'medium',
      description: 'Maximum expected loss in a day (95% confidence)'
    },
    {
      name: 'Maximum Drawdown',
      value: -8.3,
      target: -10.0,
      status: 'low',
      description: 'Largest peak-to-trough decline'
    },
    {
      name: 'Sharpe Ratio',
      value: 1.34,
      target: 1.20,
      status: 'low',
      description: 'Risk-adjusted return measure'
    },
    {
      name: 'Beta',
      value: 1.08,
      target: 1.00,
      status: 'low',
      description: 'Sensitivity to market movements'
    },
    {
      name: 'Correlation to S&P 500',
      value: 0.82,
      target: 0.70,
      status: 'medium',
      description: 'How closely your portfolio tracks the market'
    }
  ];

  // Mock sector concentration data
  const sectorConcentration = [
    { sector: 'Technology', weight: 35.2, risk: 'high', benchmark: 25.0 },
    { sector: 'Healthcare', weight: 18.5, risk: 'medium', benchmark: 15.0 },
    { sector: 'Financial Services', weight: 15.3, risk: 'medium', benchmark: 20.0 },
    { sector: 'Consumer Discretionary', weight: 12.8, risk: 'low', benchmark: 12.0 },
    { sector: 'Industrials', weight: 8.7, risk: 'low', benchmark: 10.0 },
    { sector: 'Energy', weight: 5.2, risk: 'low', benchmark: 8.0 },
    { sector: 'Others', weight: 4.3, risk: 'low', benchmark: 10.0 }
  ];

  // Mock correlation data
  const correlationData: CorrelationData[] = [
    { asset1: 'AAPL', asset2: 'MSFT', correlation: 0.78, risk: 'high' },
    { asset1: 'AAPL', asset2: 'GOOGL', correlation: 0.74, risk: 'high' },
    { asset1: 'MSFT', asset2: 'GOOGL', correlation: 0.71, risk: 'high' },
    { asset1: 'AAPL', asset2: 'TSLA', correlation: 0.45, risk: 'medium' },
    { asset1: 'JPM', asset2: 'BAC', correlation: 0.82, risk: 'high' },
    { asset1: 'AAPL', asset2: 'JPM', correlation: 0.23, risk: 'low' }
  ];

  // Mock rebalancing suggestions
  const rebalancingSuggestions: RebalancingSuggestion[] = [
    {
      asset: 'Technology Sector',
      currentWeight: 35.2,
      targetWeight: 30.0,
      difference: -5.2,
      action: 'sell',
      amount: 26000
    },
    {
      asset: 'International Bonds',
      currentWeight: 8.5,
      targetWeight: 12.0,
      difference: 3.5,
      action: 'buy',
      amount: 17500
    },
    {
      asset: 'Small Cap Stocks',
      currentWeight: 10.2,
      targetWeight: 15.0,
      difference: 4.8,
      action: 'buy',
      amount: 24000
    }
  ];

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getCorrelationRisk = (correlation: number): 'low' | 'medium' | 'high' => {
    if (Math.abs(correlation) > 0.7) return 'high';
    if (Math.abs(correlation) > 0.4) return 'medium';
    return 'low';
  };

  // Find sectors with high concentration risk
  const highConcentrationSectors = sectorConcentration.filter(sector =>
    sector.weight > sector.benchmark + 5
  );

  // Get the page title and description based on the default tab
  const getTabInfo = () => {
    switch (defaultTab) {
      case 'correlation':
        return {
          title: 'Correlation Analysis',
          description: 'Analyze correlations between portfolio holdings to identify concentration risks'
        };
      case 'rebalancing':
        return {
          title: 'Portfolio Rebalancing',
          description: 'Review and execute rebalancing recommendations to maintain target allocation'
        };
      case 'concentration':
        return {
          title: 'Concentration Analysis',
          description: 'Monitor sector and asset concentration to manage portfolio risk'
        };
      case 'scenarios':
        return {
          title: 'Stress Testing',
          description: 'Analyze portfolio performance under various market stress scenarios'
        };
      default:
        return {
          title: 'Risk Management',
          description: 'Monitor and manage your portfolio risk with comprehensive analytics and recommendations'
        };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>{tabInfo.title}</h1>
          <p className="text-muted-foreground">
            {tabInfo.description}
          </p>
        </div>
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" onClick={() => onNavigate('risk-profile')}>
            <Settings className="h-4 w-4 mr-2" />
            Update Risk Profile
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Risk Report
          </Button>
          <Button>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Overall Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">7.2</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Moderate Risk
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on volatility, concentration, and correlation analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Risk Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">3</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-red-600 border-red-200">
                Requires Attention
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              High sector concentration and correlation risks detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Rebalancing Status</CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">85%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Minor Deviation
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Portfolio alignment with target allocation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
          <TabsTrigger value="concentration">Concentration</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskMetrics.map((metric) => (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <Badge variant="outline" className={getRiskColor(metric.status)}>
                        {metric.status} risk
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Current: {metric.name.includes('$') ? formatCurrency(metric.value) :
                             metric.name.includes('%') || metric.name.includes('Ratio') ?
                             formatPercent(metric.value) : metric.value}</span>
                      <span className="text-muted-foreground">
                        Target: {metric.name.includes('$') ? formatCurrency(metric.target) :
                               metric.name.includes('%') || metric.name.includes('Ratio') ?
                               formatPercent(metric.target) : metric.target}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (metric.value / metric.target) * 100)}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {['1M', '3M', '6M', '1Y', '3Y'].map((period) => (
                      <Button
                        key={period}
                        variant={selectedTimeframe === period ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTimeframe(period)}
                      >
                        {period}
                      </Button>
                    ))}
                  </div>

                  {/* Mock risk chart visualization */}
                  <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Risk Timeline Chart</p>
                      <p className="text-xs text-muted-foreground">
                        Historical volatility and drawdown analysis for {selectedTimeframe}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="concentration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sector Concentration Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor sector allocation vs benchmark to identify concentration risks
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorConcentration.map((sector) => (
                  <div key={sector.sector} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{sector.sector}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{sector.weight.toFixed(1)}%</span>
                        <Badge variant="outline" className={getRiskColor(sector.risk)}>
                          {sector.risk}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Your allocation</span>
                        <span>Benchmark: {sector.benchmark}%</span>
                      </div>
                      <Progress value={sector.weight} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        Deviation: {(sector.weight - sector.benchmark) >= 0 ? '+' : ''}
                        {(sector.weight - sector.benchmark).toFixed(1)}% vs benchmark
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* High Concentration Warnings */}
          {highConcentrationSectors.map((sector) => (
            <Alert key={sector.sector}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>High Concentration Warning</AlertTitle>
              <AlertDescription>
                Your {sector.sector} allocation ({sector.weight.toFixed(1)}%) is significantly above
                the benchmark ({sector.benchmark}%). Consider diversifying to reduce concentration risk.
              </AlertDescription>
            </Alert>
          ))}
        </TabsContent>

        <TabsContent value="correlation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Correlation Matrix</CardTitle>
              <p className="text-sm text-muted-foreground">
                High correlations between holdings can increase portfolio risk during market stress
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset 1</TableHead>
                    <TableHead>Asset 2</TableHead>
                    <TableHead className="text-right">Correlation</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correlationData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.asset1}</TableCell>
                      <TableCell className="font-medium">{item.asset2}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.correlation.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRiskColor(item.risk)}>
                          {item.risk} correlation
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.risk === 'high' && (
                          <Button variant="outline" size="sm">
                            Consider Diversifying
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rebalancing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rebalancing Recommendations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Suggestions to realign your portfolio with target allocation
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rebalancingSuggestions.map((suggestion, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{suggestion.asset}</h4>
                          <p className="text-sm text-muted-foreground">
                            Current: {suggestion.currentWeight.toFixed(1)}% →
                            Target: {suggestion.targetWeight.toFixed(1)}%
                          </p>
                        </div>
                        <Badge variant={suggestion.action === 'buy' ? 'default' : 'secondary'}>
                          {suggestion.action.toUpperCase()} {formatCurrency(suggestion.amount)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(suggestion.currentWeight / suggestion.targetWeight) * 100}
                          className="flex-1 h-2"
                        />
                        <Button
                          size="sm"
                          onClick={() => onQuickTrade()}
                          className={suggestion.action === 'buy' ? '' : 'bg-red-600 hover:bg-red-700'}
                        >
                          {suggestion.action === 'buy' ? 'Buy' : 'Sell'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <Button className="flex-1">
                  <Target className="h-4 w-4 mr-2" />
                  Auto-Rebalance Portfolio
                </Button>
                <Button variant="outline">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculate Tax Impact
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stress Test Scenarios</CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze how your portfolio might perform under different market conditions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800">2008 Financial Crisis</h4>
                  <p className="text-sm text-red-600 mt-1">Market down 37%</p>
                  <p className="text-2xl font-bold text-red-800 mt-2">-28.4%</p>
                  <p className="text-xs text-red-600">Estimated portfolio impact</p>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800">COVID-19 Crash</h4>
                  <p className="text-sm text-orange-600 mt-1">Market down 34%</p>
                  <p className="text-2xl font-bold text-orange-800 mt-2">-24.1%</p>
                  <p className="text-xs text-orange-600">Estimated portfolio impact</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800">Rising Interest Rates</h4>
                  <p className="text-sm text-blue-600 mt-1">+200 basis points</p>
                  <p className="text-2xl font-bold text-blue-800 mt-2">-12.7%</p>
                  <p className="text-xs text-blue-600">Estimated portfolio impact</p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800">Tech Sector Correction</h4>
                  <p className="text-sm text-purple-600 mt-1">Tech down 50%</p>
                  <p className="text-2xl font-bold text-purple-800 mt-2">-17.6%</p>
                  <p className="text-xs text-purple-600">Estimated portfolio impact</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}