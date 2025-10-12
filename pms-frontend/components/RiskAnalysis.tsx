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
  Calculator,
  Eye,
  Gauge,
  Zap
} from "lucide-react";

interface RiskAnalysisProps {
  onNavigate: (view: string) => void;
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
}

interface RiskMetric {
  name: string;
  value: number;
  target: number;
  status: 'low' | 'medium' | 'high';
  description: string;
  change: number;
}

interface CorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
  risk: 'low' | 'medium' | 'high';
}

export function RiskAnalysis({ onNavigate, onQuickTrade }: RiskAnalysisProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y');
  const [selectedRiskType, setSelectedRiskType] = useState('overall');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Enhanced risk metrics with trend data
  const riskMetrics: RiskMetric[] = [
    {
      name: 'Portfolio Volatility',
      value: 16.2,
      target: 15.0,
      status: 'medium',
      description: 'Annual volatility of your portfolio',
      change: +1.3
    },
    {
      name: 'Value at Risk (95%)',
      value: 12450,
      target: 10000,
      status: 'medium',
      description: 'Maximum expected loss in a day (95% confidence)',
      change: +850
    },
    {
      name: 'Maximum Drawdown',
      value: -8.3,
      target: -10.0,
      status: 'low',
      description: 'Largest peak-to-trough decline',
      change: -0.7
    },
    {
      name: 'Sharpe Ratio',
      value: 1.34,
      target: 1.20,
      status: 'low',
      description: 'Risk-adjusted return measure',
      change: +0.08
    },
    {
      name: 'Beta',
      value: 1.08,
      target: 1.00,
      status: 'low',
      description: 'Sensitivity to market movements',
      change: +0.03
    },
    {
      name: 'Tracking Error',
      value: 3.2,
      target: 2.5,
      status: 'medium',
      description: 'Deviation from benchmark returns',
      change: +0.4
    }
  ];

  // Sector concentration data
  const sectorConcentration = [
    { sector: 'Technology', weight: 35.2, risk: 'high', benchmark: 25.0, trend: +2.1 },
    { sector: 'Healthcare', weight: 18.5, risk: 'medium', benchmark: 15.0, trend: -0.8 },
    { sector: 'Financial Services', weight: 15.3, risk: 'medium', benchmark: 20.0, trend: -1.2 },
    { sector: 'Consumer Discretionary', weight: 12.8, risk: 'low', benchmark: 12.0, trend: +0.3 },
    { sector: 'Industrials', weight: 8.7, risk: 'low', benchmark: 10.0, trend: -0.5 },
    { sector: 'Energy', weight: 5.2, risk: 'low', benchmark: 8.0, trend: +1.1 },
    { sector: 'Others', weight: 4.3, risk: 'low', benchmark: 10.0, trend: -0.9 }
  ];

  // Correlation data
  const correlationData: CorrelationData[] = [
    { asset1: 'AAPL', asset2: 'MSFT', correlation: 0.78, risk: 'high' },
    { asset1: 'AAPL', asset2: 'GOOGL', correlation: 0.74, risk: 'high' },
    { asset1: 'MSFT', asset2: 'GOOGL', correlation: 0.71, risk: 'high' },
    { asset1: 'AAPL', asset2: 'TSLA', correlation: 0.45, risk: 'medium' },
    { asset1: 'JPM', asset2: 'BAC', correlation: 0.82, risk: 'high' },
    { asset1: 'AAPL', asset2: 'JPM', correlation: 0.23, risk: 'low' }
  ];

  // Risk alerts
  const riskAlerts = [
    {
      id: 1,
      type: 'high',
      title: 'High Tech Concentration',
      message: 'Technology sector allocation is 10.2% above benchmark',
      action: 'Rebalance',
      actionType: 'rebalancing' as const
    },
    {
      id: 2,
      type: 'medium',
      title: 'Correlation Risk',
      message: 'High correlation detected between major holdings (AAPL, MSFT)',
      action: 'Diversify',
      actionType: 'portfolio' as const
    },
    {
      id: 3,
      type: 'medium',
      title: 'Volatility Spike',
      message: 'Portfolio volatility increased 1.3% this month',
      action: 'Monitor',
      actionType: 'risk' as const
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

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const handleAlertAction = (alert: typeof riskAlerts[0]) => {
    if (alert.actionType === 'rebalancing') {
      onNavigate('rebalancing');
    } else if (alert.actionType === 'portfolio') {
      onNavigate('portfolios');
    }
  };

  const highConcentrationSectors = sectorConcentration.filter(sector => 
    sector.weight > sector.benchmark + 5
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate('risk-profile')}>
            <Settings className="h-4 w-4 mr-2" />
            Risk Settings
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

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Risk Score</CardTitle>
              <Gauge className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">7.2</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Moderate
              </Badge>
              <span className="text-xs text-green-600">↓ 0.3</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Improved from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{riskAlerts.length}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-red-600 border-red-200">
                Attention Needed
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {riskAlerts.filter(a => a.type === 'high').length} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Portfolio VaR</CardTitle>
              <TrendingDown className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">$12.4K</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                95% Confidence
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Daily maximum loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Volatility</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">16.2%</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                Annualized
              </Badge>
              <span className="text-xs text-red-600">↑ 1.3%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Above target of 15%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts Section */}
      {riskAlerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Risk Alerts</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {riskAlerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${getAlertColor(alert.type)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.type === 'high' ? 'text-red-600' : 
                          alert.type === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <h4 className="font-medium">{alert.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleAlertAction(alert)}
                    >
                      {alert.action}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="metrics">Risk Metrics</TabsTrigger>
          <TabsTrigger value="concentration">Concentration</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="scenarios">Stress Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Risk Metrics Tracking</CardTitle>
                  <div className="flex gap-2">
                    {['1M', '3M', '6M', '1Y'].map((period) => (
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskMetrics.map((metric) => (
                  <div key={metric.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${metric.change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {metric.change >= 0 ? '↑' : '↓'} {Math.abs(metric.change)}
                        </span>
                        <Badge variant="outline" className={getRiskColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        Current: {metric.name.includes('$') ? formatCurrency(metric.value) : 
                               metric.name.includes('%') || metric.name.includes('Ratio') ? 
                               formatPercent(metric.value) : metric.value}
                      </span>
                      <span className="text-muted-foreground">
                        Target: {metric.name.includes('$') ? formatCurrency(metric.target) :
                               metric.name.includes('%') || metric.name.includes('Ratio') ?
                               formatPercent(metric.target) : metric.target}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (Math.abs(metric.value) / Math.abs(metric.target)) * 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Timeline Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Risk Timeline Chart</p>
                    <p className="text-xs text-muted-foreground">
                      Historical risk metrics analysis for {selectedTimeframe}
                    </p>
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
                        <span className={`text-xs ${sector.trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {sector.trend >= 0 ? '↑' : '↓'} {Math.abs(sector.trend)}%
                        </span>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onNavigate('rebalancing')}
                          >
                            Diversify
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
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    View Details
                  </Button>
                </div>
                
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-medium text-orange-800">COVID-19 Crash</h4>
                  <p className="text-sm text-orange-600 mt-1">Market down 34%</p>
                  <p className="text-2xl font-bold text-orange-800 mt-2">-24.1%</p>
                  <p className="text-xs text-orange-600">Estimated portfolio impact</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    View Details
                  </Button>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800">Rising Interest Rates</h4>
                  <p className="text-sm text-blue-600 mt-1">+200 basis points</p>
                  <p className="text-2xl font-bold text-blue-800 mt-2">-12.7%</p>
                  <p className="text-xs text-blue-600">Estimated portfolio impact</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    View Details
                  </Button>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-800">Tech Sector Correction</h4>
                  <p className="text-sm text-purple-600 mt-1">Tech down 50%</p>
                  <p className="text-2xl font-bold text-purple-800 mt-2">-17.6%</p>
                  <p className="text-xs text-purple-600">Estimated portfolio impact</p>
                  <Button variant="outline" size="sm" className="mt-2 w-full">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}