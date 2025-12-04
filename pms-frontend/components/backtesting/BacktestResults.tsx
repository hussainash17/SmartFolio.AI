import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import { TrendingUp, TrendingDown, BarChart3, Target, Percent, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { BacktestMetrics, TradeRecord } from './BacktestingSimulation'

interface BacktestResultsProps {
    metrics: BacktestMetrics | undefined
    trades: TradeRecord[]
    isLoading: boolean
}

interface MetricCardProps {
    label: string
    value: string | number | null
    icon: React.ReactNode
    trend?: 'positive' | 'negative' | 'neutral'
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className={`p-2 rounded-md ${trend === 'positive' ? 'bg-green-500/10 text-green-500' :
                    trend === 'negative' ? 'bg-red-500/10 text-red-500' :
                        'bg-muted text-muted-foreground'
                }`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{label}</p>
                <p className={`text-lg font-semibold ${trend === 'positive' ? 'text-green-500' :
                        trend === 'negative' ? 'text-red-500' :
                            ''
                    }`}>
                    {value ?? '—'}
                </p>
            </div>
        </div>
    )
}

export function BacktestResults({ metrics, trades, isLoading }: BacktestResultsProps) {
    if (isLoading) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Results</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (!metrics) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Results</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground text-center text-sm">
                        Run a backtest to see performance metrics
                    </p>
                </CardContent>
            </Card>
        )
    }

    const returnTrend = metrics.total_return_pct >= 0 ? 'positive' : 'negative'
    const profitTrend = metrics.total_profit >= 0 ? 'positive' : 'negative'

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <MetricCard
                        label="Total Return"
                        value={`${metrics.total_return_pct.toFixed(2)}%`}
                        icon={returnTrend === 'positive' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        trend={returnTrend}
                    />
                    <MetricCard
                        label="Total Profit"
                        value={`৳${metrics.total_profit.toLocaleString()}`}
                        icon={<BarChart3 className="h-4 w-4" />}
                        trend={profitTrend}
                    />
                    <MetricCard
                        label="Max Drawdown"
                        value={`${metrics.max_drawdown_pct.toFixed(2)}%`}
                        icon={<TrendingDown className="h-4 w-4" />}
                        trend="negative"
                    />
                    <MetricCard
                        label="Sharpe Ratio"
                        value={metrics.sharpe?.toFixed(2) ?? '—'}
                        icon={<Activity className="h-4 w-4" />}
                        trend={metrics.sharpe && metrics.sharpe > 1 ? 'positive' : 'neutral'}
                    />
                    <MetricCard
                        label="Win Rate"
                        value={metrics.win_rate ? `${metrics.win_rate.toFixed(1)}%` : '—'}
                        icon={<Target className="h-4 w-4" />}
                        trend={metrics.win_rate && metrics.win_rate > 50 ? 'positive' : metrics.win_rate ? 'negative' : 'neutral'}
                    />
                    <MetricCard
                        label="Total Trades"
                        value={metrics.total_trades}
                        icon={<Percent className="h-4 w-4" />}
                        trend="neutral"
                    />
                </div>

                {/* Trade List */}
                <div className="flex-1 min-h-0">
                    <h4 className="text-sm font-medium mb-2">Trade History</h4>
                    <ScrollArea className="h-[calc(100%-28px)] border rounded-lg">
                        {trades.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                No trades executed
                            </div>
                        ) : (
                            <div className="divide-y">
                                {trades.map((trade, index) => (
                                    <div key={index} className="p-2 text-xs">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-muted-foreground">
                                                {trade.entry_time} → {trade.exit_time || 'Open'}
                                            </span>
                                            <Badge variant={trade.pnl >= 0 ? 'default' : 'destructive'} className="text-xs">
                                                {trade.pnl >= 0 ? (
                                                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                                ) : (
                                                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                                                )}
                                                {trade.return_pct.toFixed(2)}%
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span>
                                                Entry: ৳{trade.entry_price.toFixed(2)} ({trade.size} shares)
                                            </span>
                                            <span className={trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                ৳{trade.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    )
}
