import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
} from 'recharts'
import type { EquityCurvePoint, TradeRecord } from './BacktestingSimulation'

interface BacktestChartProps {
    equityCurve: EquityCurvePoint[]
    priceData: Array<{
        date: string
        close: number
        marker?: 'buy' | 'sell'
        [key: string]: unknown
    }>
    trades: TradeRecord[]
    symbol: string
}

export function BacktestChart({ equityCurve, priceData, trades, symbol }: BacktestChartProps) {
    const [activeTab, setActiveTab] = useState<'equity' | 'price'>('equity')

    // Format equity curve data for Recharts
    const equityData = useMemo(() => {
        return equityCurve.map((point) => ({
            date: point.time,
            value: point.value,
        }))
    }, [equityCurve])

    // Find buy/sell markers in price data
    const buyMarkers = useMemo(() => {
        return priceData.filter((d) => d.marker === 'buy').map((d) => ({
            date: d.date,
            close: d.close,
        }))
    }, [priceData])

    const sellMarkers = useMemo(() => {
        return priceData.filter((d) => d.marker === 'sell').map((d) => ({
            date: d.date,
            close: d.close,
        }))
    }, [priceData])

    // Format price data for chart
    const chartPriceData = useMemo(() => {
        return priceData.map((d) => ({
            date: d.date,
            close: d.close,
        }))
    }, [priceData])

    // Custom tooltip for equity curve
    const EquityTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold">৳{payload[0].value.toLocaleString()}</p>
                </div>
            )
        }
        return null
    }

    // Custom tooltip for price chart
    const PriceTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const marker = priceData.find(d => d.date === label)?.marker
            return (
                <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold">৳{payload[0].value.toFixed(2)}</p>
                    {marker && (
                        <p className={marker === 'buy' ? 'text-green-500' : 'text-red-500'}>
                            {marker === 'buy' ? '🔼 Buy Signal' : '🔽 Sell Signal'}
                        </p>
                    )}
                </div>
            )
        }
        return null
    }

    // Calculate metrics for display
    const startValue = equityCurve[0]?.value || 0
    const endValue = equityCurve[equityCurve.length - 1]?.value || 0
    const returnPct = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0
    const isPositive = returnPct >= 0

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{symbol} Backtest Results</CardTitle>
                    <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 flex flex-col">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'equity' | 'price')} className="flex-1 flex flex-col">
                    <TabsList className="w-fit mb-2">
                        <TabsTrigger value="equity">Equity Curve</TabsTrigger>
                        <TabsTrigger value="price">Price & Trades</TabsTrigger>
                    </TabsList>

                    <TabsContent value="equity" className="flex-1 min-h-0 mt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor={isPositive ? '#22c55e' : '#ef4444'}
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={isPositive ? '#22c55e' : '#ef4444'}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value)
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    }}
                                    interval="preserveStartEnd"
                                    className="text-muted-foreground"
                                />
                                <YAxis
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => `৳${(value / 1000).toFixed(0)}k`}
                                    className="text-muted-foreground"
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip content={<EquityTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPositive ? '#22c55e' : '#ef4444'}
                                    strokeWidth={2}
                                    fill="url(#equityGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="price" className="flex-1 min-h-0 mt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartPriceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value)
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    }}
                                    interval="preserveStartEnd"
                                    className="text-muted-foreground"
                                />
                                <YAxis
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => `৳${value.toFixed(0)}`}
                                    className="text-muted-foreground"
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip content={<PriceTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="close"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={false}
                                />
                                {/* Buy markers */}
                                {buyMarkers.map((marker, index) => (
                                    <ReferenceDot
                                        key={`buy-${index}`}
                                        x={marker.date}
                                        y={marker.close}
                                        r={6}
                                        fill="#22c55e"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                ))}
                                {/* Sell markers */}
                                {sellMarkers.map((marker, index) => (
                                    <ReferenceDot
                                        key={`sell-${index}`}
                                        x={marker.date}
                                        y={marker.close}
                                        r={6}
                                        fill="#ef4444"
                                        stroke="white"
                                        strokeWidth={2}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </TabsContent>
                </Tabs>

                {/* Legend for price chart */}
                {activeTab === 'price' && (
                    <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Buy ({buyMarkers.length})</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>Sell ({sellMarkers.length})</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
