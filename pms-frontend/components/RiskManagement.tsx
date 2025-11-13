import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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
  Loader2,
  Briefcase
} from "lucide-react";
import { usePortfolios } from "../hooks/usePortfolios";
import { 
  useRiskOverview, 
  useRiskMetrics, 
  useSectorConcentration,
  useCorrelationAnalysis,
  useStressTests,
  useRiskAlerts,
  useRebalancingRecommendations,
  useUserRiskProfile
} from "../hooks/useRisk";
import { useQueryClient } from "@tanstack/react-query";

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

export function RiskManagement({ onNavigate, onQuickTrade, defaultTab = 'metrics' }: RiskManagementProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1Y');
  const queryClient = useQueryClient();
  
  // Get portfolios list
  const { portfolios, loading: portfoliosLoading } = usePortfolios();
  
  // Manage selected portfolio internally - default to first portfolio or default portfolio
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  
  // Initialize with default portfolio or first portfolio when portfolios load
  useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      // Try to find default portfolio first
      const defaultPortfolio = portfolios.find(p => p.isDefault);
      if (defaultPortfolio) {
        setSelectedPortfolioId(defaultPortfolio.id);
      } else {
        // Otherwise use first portfolio
        setSelectedPortfolioId(portfolios[0].id);
      }
    }
  }, [portfolios, selectedPortfolioId]);
  
  // Use selected portfolio for queries
  const portfolioId = selectedPortfolioId;
  
  // Get selected portfolio details
  const selectedPortfolio = portfolios.find(p => p.id === portfolioId);

  // Fetch risk data
  const { data: riskOverview, isLoading: overviewLoading, refetch: refetchOverview } = useRiskOverview(
    portfolioId,
    selectedTimeframe
  );
  
  const { data: riskMetrics, isLoading: metricsLoading } = useRiskMetrics(
    portfolioId,
    selectedTimeframe
  );
  
  const { data: sectorData, isLoading: sectorLoading } = useSectorConcentration(
    portfolioId,
    selectedTimeframe
  );
  
  const { data: correlationData, isLoading: correlationLoading } = useCorrelationAnalysis(
    portfolioId,
    selectedTimeframe,
    10
  );
  
  const { data: stressTests, isLoading: stressLoading } = useStressTests(
    portfolioId
  );
  
  const { data: riskAlertsData, isLoading: alertsLoading } = useRiskAlerts(portfolioId, true);
  
  const { data: rebalancingData, isLoading: rebalancingLoading } = useRebalancingRecommendations(portfolioId);
  
  const { data: riskProfile } = useUserRiskProfile();

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

  // Determine risk status
  const getRiskStatus = (value: number, target: number, lowerIsBetter: boolean = false): 'low' | 'medium' | 'high' => {
    const deviation = Math.abs(value - target);
    const percentDeviation = target !== 0 ? (deviation / Math.abs(target)) * 100 : 0;
    
    if (lowerIsBetter) {
      if (value <= target) return 'low';
      if (percentDeviation < 20) return 'medium';
      return 'high';
    } else {
      if (value >= target) return 'low';
      if (percentDeviation < 20) return 'medium';
      return 'high';
    }
  };

  // Build risk metrics from API data
  const riskMetricsList: RiskMetric[] = useMemo(() => {
    if (!riskMetrics || !riskProfile) return [];
    
    const profile = riskProfile;
    
    return [
      {
        name: 'Portfolio Volatility',
        value: riskMetrics.volatilityPct,
        target: Number(profile.max_portfolio_volatility || 15.0),
        status: getRiskStatus(riskMetrics.volatilityPct, Number(profile.max_portfolio_volatility || 15.0), true),
        description: 'Annual volatility of your portfolio'
      },
      {
        name: 'Value at Risk (95%)',
        value: riskMetrics.var95Amt,
        target: 10000,
        status: riskMetrics.var95Amt > 15000 ? 'high' : riskMetrics.var95Amt > 10000 ? 'medium' : 'low',
        description: 'Maximum expected loss in a day (95% confidence)'
      },
      {
        name: 'Maximum Drawdown',
        value: riskMetrics.maxDrawdownPct,
        target: Number(profile.max_drawdown_tolerance || 20.0),
        status: getRiskStatus(riskMetrics.maxDrawdownPct, Number(profile.max_drawdown_tolerance || 20.0), true),
        description: 'Largest peak-to-trough decline'
      },
      {
        name: 'Sharpe Ratio',
        value: riskMetrics.sharpeRatio,
        target: Number(profile.target_sharpe_ratio || 1.2),
        status: getRiskStatus(riskMetrics.sharpeRatio, Number(profile.target_sharpe_ratio || 1.2), false),
        description: 'Risk-adjusted return measure'
      },
      {
        name: 'Beta',
        value: riskMetrics.beta,
        target: 1.0,
        status: Math.abs(riskMetrics.beta - 1.0) > 0.3 ? 'high' : Math.abs(riskMetrics.beta - 1.0) > 0.15 ? 'medium' : 'low',
        description: 'Sensitivity to market movements'
      },
      {
        name: 'Tracking Error',
        value: riskMetrics.trackingErrorPct,
        target: 2.5,
        status: getRiskStatus(riskMetrics.trackingErrorPct, 2.5, true),
        description: 'Deviation from benchmark returns'
      }
    ];
  }, [riskMetrics, riskProfile]);

  const getRiskColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Find sectors with high concentration risk
  const highConcentrationSectors = useMemo(() => {
    return sectorData?.items.filter(sector => 
      Math.abs(sector.deviationPct) > 5
    ) || [];
  }, [sectorData]);

  // Calculate rebalancing alignment percentage
  const rebalancingAlignment = useMemo(() => {
    if (!rebalancingData?.suggestions || rebalancingData.suggestions.length === 0) {
      return 100; // Perfect alignment if no suggestions
    }
    
    // Calculate how many sectors are within 1% of target
    const totalSuggestions = rebalancingData.suggestions.length;
    const alignedSuggestions = rebalancingData.suggestions.filter(s => Math.abs(s.differencePct) <= 1).length;
    
    return Math.round((alignedSuggestions / totalSuggestions) * 100);
  }, [rebalancingData]);

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['risk'] });
    refetchOverview();
  };

  const tabInfo = getTabInfo();
  const isLoading = overviewLoading || metricsLoading || sectorLoading || correlationLoading || stressLoading || alertsLoading || rebalancingLoading;

  // Show loading state while portfolios are loading
  if (portfoliosLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no portfolios
  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Portfolios Found</h3>
        <p className="text-muted-foreground mb-4">Create a portfolio to view risk management analytics.</p>
        <Button onClick={() => onNavigate('portfolios')}>
          Create Portfolio
        </Button>
      </div>
    );
  }

  // Show message if portfolio is selected but still loading
  if (!portfolioId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">{tabInfo.title}</h1>
          <p className="text-muted-foreground text-lg">
            {tabInfo.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Portfolio Selector */}
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={selectedPortfolioId || ''} 
              onValueChange={setSelectedPortfolioId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map((portfolio) => (
                  <SelectItem key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                    {portfolio.isDefault && ' (Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" onClick={() => onNavigate('risk-profile')}>
            <Settings className="h-4 w-4 mr-2" />
            Update Risk Profile
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Risk Report
          </Button>
          <Button onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
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
                <div className="text-3xl font-bold text-orange-600">
                  {riskOverview?.riskScore?.toFixed(1) || '0.0'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    {riskOverview?.riskScore && riskOverview.riskScore < 5 ? 'Low Risk' : 
                     riskOverview?.riskScore && riskOverview.riskScore < 7.5 ? 'Moderate Risk' : 'High Risk'}
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
                <div className="text-3xl font-bold text-red-600">
                  {riskOverview?.activeAlerts || riskAlertsData?.length || 0}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    Requires Attention
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {riskAlertsData?.filter((a: any) => a.severity?.toLowerCase() === 'high').length || 0} high priority alerts
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
                <div className="text-3xl font-bold text-blue-600">{rebalancingAlignment}%</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    {rebalancingAlignment >= 90 ? 'Well Aligned' : 
                     rebalancingAlignment >= 70 ? 'Minor Deviation' : 'Needs Rebalancing'}
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
                    {riskMetricsList.length > 0 ? (
                      riskMetricsList.map((metric) => (
                        <div key={metric.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{metric.name}</span>
                            <Badge variant="outline" className={getRiskColor(metric.status)}>
                              {metric.status} risk
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              Current: {metric.name.includes('VaR') || metric.name.includes('$') ? 
                                formatCurrency(metric.value) :
                                metric.name.includes('%') || metric.name.includes('Ratio') ?
                                formatPercent(metric.value) : metric.value.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              Target: {metric.name.includes('VaR') || metric.name.includes('$') ? 
                                formatCurrency(metric.target) :
                                metric.name.includes('%') || metric.name.includes('Ratio') ?
                                formatPercent(metric.target) : metric.target.toFixed(2)}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, (Math.abs(metric.value) / Math.abs(metric.target || 1)) * 100)}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">{metric.description}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No risk metrics available
                      </p>
                    )}
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

                      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Risk Timeline Chart</p>
                          <p className="text-xs text-muted-foreground">
                            Historical volatility and drawdown analysis for {selectedTimeframe}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Chart visualization coming soon
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
                  {sectorLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : sectorData?.items && sectorData.items.length > 0 ? (
                    <div className="space-y-4">
                      {sectorData.items.map((sector) => (
                        <div key={sector.sector} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{sector.sector}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{sector.weightPct.toFixed(1)}%</span>
                              <Badge variant="outline" className={getRiskColor(sector.risk)}>
                                {sector.risk}
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Your allocation</span>
                              <span>Benchmark: {sector.benchmarkWeightPct.toFixed(1)}%</span>
                            </div>
                            <Progress value={sector.weightPct} className="h-2" />
                            <div className="text-xs text-muted-foreground">
                              Deviation: {sector.deviationPct >= 0 ? '+' : ''}
                              {sector.deviationPct.toFixed(1)}% vs benchmark
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sector data available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* High Concentration Warnings */}
              {highConcentrationSectors.map((sector) => (
                <Alert key={sector.sector}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>High Concentration Warning</AlertTitle>
                  <AlertDescription>
                    Your {sector.sector} allocation ({sector.weightPct.toFixed(1)}%) is significantly different
                    from the benchmark ({sector.benchmarkWeightPct.toFixed(1)}%). Consider diversifying to reduce concentration risk.
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
                  {correlationLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : correlationData?.pairs && correlationData.pairs.length > 0 ? (
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
                        {correlationData.pairs.map((item, index) => (
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
                                <Button variant="outline" size="sm" onClick={() => onNavigate('rebalancing')}>
                                  Consider Diversifying
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No correlation data available
                    </p>
                  )}
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
                  {rebalancingLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : rebalancingData?.suggestions && rebalancingData.suggestions.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {rebalancingData.suggestions.map((suggestion, index) => (
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
                                  value={Math.min(100, (suggestion.currentWeight / (suggestion.targetWeight || 1)) * 100)}
                                  className="flex-1 h-2"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => onQuickTrade(undefined, suggestion.action)}
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
                        <Button className="flex-1" onClick={() => onNavigate('rebalancing')}>
                          <Target className="h-4 w-4 mr-2" />
                          Auto-Rebalance Portfolio
                        </Button>
                        <Button variant="outline">
                          <Calculator className="h-4 w-4 mr-2" />
                          Calculate Tax Impact
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Your portfolio is well-balanced. No rebalancing recommendations at this time.
                      </p>
                    </div>
                  )}
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
                  {stressLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : stressTests?.scenarios && stressTests.scenarios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stressTests.scenarios.map((scenario) => {
                        const isNegative = scenario.portfolioImpactPct < 0;
                        const colorClass = isNegative ? 'red' : 'green';
                        const bgClass = isNegative ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
                        const textClass = isNegative ? 'text-red-800' : 'text-green-800';
                        const textLightClass = isNegative ? 'text-red-600' : 'text-green-600';
                        
                        return (
                          <div key={scenario.key} className={`p-4 ${bgClass} border rounded-lg`}>
                            <h4 className={`font-medium ${textClass}`}>{scenario.label}</h4>
                            <p className={`text-sm ${textLightClass} mt-1`}>
                              {scenario.details.description || scenario.details.method}
                            </p>
                            <p className={`text-2xl font-bold ${textClass} mt-2`}>
                              {scenario.portfolioImpactPct >= 0 ? '+' : ''}{scenario.portfolioImpactPct.toFixed(1)}%
                            </p>
                            <p className={`text-xs ${textLightClass}`}>Estimated portfolio impact</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No stress test data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
