import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Calendar,
    BarChart3,
    Target
} from 'lucide-react'
import type { SimulationHook } from '../../hooks/useSimulationReducer'

interface PositionPanelProps {
    simulation: SimulationHook
}

export function PositionPanel({ simulation }: PositionPanelProps) {
    const {
        state,
        currentCandle,
        currentPrice,
        positionValue,
        totalValue,
        totalReturn,
        totalReturnPercent,
        daysSimulated,
        totalDays,
        progress,
    } = simulation

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value)
    }

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const isProfit = totalReturn >= 0
    const isUnrealizedProfit = state.pnl.unrealized >= 0

    if (!state.isSimulationActive) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Position & P&L</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
                        <p className="text-sm">Start a simulation to see your portfolio performance</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="h-full overflow-auto">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>Position & P&L</span>
                    {currentCandle && (
                        <Badge variant="outline" className="font-normal">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(currentCandle.time)}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Account Summary */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Account Summary</h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Wallet className="h-3 w-3" />
                                Starting Cash
                            </div>
                            <div className="font-semibold">{formatCurrency(state.startingCash)}</div>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Wallet className="h-3 w-3" />
                                Current Cash
                            </div>
                            <div className="font-semibold">{formatCurrency(state.currentCash)}</div>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Target className="h-3 w-3" />
                                Position Value
                            </div>
                            <div className="font-semibold">{formatCurrency(positionValue)}</div>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <BarChart3 className="h-3 w-3" />
                                Total Value
                            </div>
                            <div className="font-semibold">{formatCurrency(totalValue)}</div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Total Return */}
                <div className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">Total Return</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                        {formatCurrency(totalReturn)}
                        <span className="text-sm font-normal">
                            ({isProfit ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
                        </span>
                    </div>
                </div>

                {/* P&L Breakdown */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">P&L Breakdown</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Realized P&L</div>
                            <div className={`font-semibold ${state.pnl.realized >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {state.pnl.realized >= 0 ? '+' : ''}{formatCurrency(state.pnl.realized)}
                            </div>
                        </div>
                        <div className="p-3 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Unrealized P&L</div>
                            <div className={`font-semibold ${isUnrealizedProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isUnrealizedProfit ? '+' : ''}{formatCurrency(state.pnl.unrealized)}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Current Position */}
                {state.position ? (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Open Position
                            <Badge variant="secondary">{state.position.symbol}</Badge>
                        </h4>
                        <div className="p-3 border rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Entry Price</span>
                                <span className="font-medium">{formatCurrency(state.position.entryPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Quantity</span>
                                <span className="font-medium">{state.position.quantity}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Entry Date</span>
                                <span className="font-medium">{state.position.entryDate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Current Price</span>
                                <span className="font-medium">{formatCurrency(currentPrice)}</span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Market Value</span>
                                <span className="font-medium">{formatCurrency(positionValue)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Unrealized P&L</span>
                                <span className={`font-medium ${isUnrealizedProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {isUnrealizedProfit ? '+' : ''}{formatCurrency(state.pnl.unrealized)}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Open Position</h4>
                        <div className="p-4 border rounded-lg text-center text-sm text-muted-foreground">
                            No open position
                        </div>
                    </div>
                )}

                <Separator />

                {/* Progress */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex justify-between">
                        <span>Simulation Progress</span>
                        <span className="font-normal">{daysSimulated} / {totalDays} days</span>
                    </h4>
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                        {progress.toFixed(1)}% complete
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
