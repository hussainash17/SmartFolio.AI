import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { MarketService } from '../src/client'
import { formatPrice, formatNumber, getChangeColor } from '../lib/formatting-utils'

interface SymbolInfoPanelProps {
    currentSymbol: string
    onPlaceOrder?: (symbol: string, side: 'buy' | 'sell') => void
}

interface SymbolInfo {
    symbol: string
    company_name?: string
    last_trade_price?: number
    change?: number
    change_percent?: number
    high?: number
    low?: number
    volume?: number
    market_cap?: number
    week_52_high?: number
    week_52_low?: number
}

export function SymbolInfoPanel({ currentSymbol, onPlaceOrder }: SymbolInfoPanelProps) {
    const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null)
    const [loading, setLoading] = useState(false)
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
    const [quantity, setQuantity] = useState('')
    const [limitPrice, setLimitPrice] = useState('')

    useEffect(() => {
        if (currentSymbol) loadSymbolInfo()
    }, [currentSymbol])

    const loadSymbolInfo = async () => {
        if (!currentSymbol) return

        setLoading(true)
        try {
            const data = await MarketService.getStock({ symbol: currentSymbol })
            const stockData = (data as any)?.data || data

            setSymbolInfo({
                symbol: currentSymbol,
                company_name: stockData?.company_name,
                last_trade_price: stockData?.last_trade_price ?? stockData?.last,
                change: stockData?.change,
                change_percent: stockData?.change_percent,
                high: stockData?.high ?? stockData?.day_high,
                low: stockData?.low ?? stockData?.day_low,
                volume: stockData?.volume,
                market_cap: stockData?.market_cap,
                week_52_high: stockData?.week_52_high,
                week_52_low: stockData?.week_52_low,
            })
        } catch (error) {
            console.error('Error loading symbol info:', error)
            setSymbolInfo(null)
        } finally {
            setLoading(false)
        }
    }

    const handleBuy = () => {
        if (onPlaceOrder && currentSymbol) onPlaceOrder(currentSymbol, 'buy')
    }

    const handleSell = () => {
        if (onPlaceOrder && currentSymbol) onPlaceOrder(currentSymbol, 'sell')
    }



    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{currentSymbol || 'No Symbol'}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{symbolInfo?.company_name || '--'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={loadSymbolInfo} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-4">
                {symbolInfo && (
                    <>
                        {/* Price Info */}
                        <div className="space-y-1">
                            <div className="text-2xl font-bold font-mono">₹{formatPrice(symbolInfo.last_trade_price)}</div>
                            <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(symbolInfo.change)}`}>
                                {symbolInfo.change !== undefined && typeof symbolInfo.change === 'number' && symbolInfo.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span>
                                    {formatPrice(symbolInfo.change)}
                                    {symbolInfo.change_percent !== undefined && symbolInfo.change_percent !== null ? ` (${formatPrice(symbolInfo.change_percent)}%)` : ''}
                                </span>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <div className="text-muted-foreground">High</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.high)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Low</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.low)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Volume</div>
                                <div className="font-semibold">{formatNumber(symbolInfo.volume)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Mkt Cap</div>
                                <div className="font-semibold">{formatNumber(symbolInfo.market_cap)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">52W High</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.week_52_high)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">52W Low</div>
                                <div className="font-semibold">{formatPrice(symbolInfo.week_52_low)}</div>
                            </div>
                        </div>
                    </>
                )}

                {/* Quick Order Section */}
                <div className="space-y-3 pt-3 border-t">
                    <h4 className="font-semibold text-sm">Quick Order</h4>

                    <div className="space-y-2">
                        <Label className="text-xs">Order Type</Label>
                        <Select value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="market">Market</SelectItem>
                                <SelectItem value="limit">Limit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
                    </div>

                    {orderType === 'limit' && (
                        <div className="space-y-2">
                            <Label className="text-xs">Limit Price</Label>
                            <Input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder="0.00" step="0.01" />
                        </div>
                    )}

                    <div className="p-3 bg-muted rounded text-xs flex justify-between">
                        <span className="text-muted-foreground">Order Value</span>
                        <span className="font-semibold font-mono">
                            ₹{(() => {
                                if (!quantity || !symbolInfo?.last_trade_price) return '0.00'
                                const price = typeof symbolInfo.last_trade_price === 'string'
                                    ? parseFloat(symbolInfo.last_trade_price)
                                    : symbolInfo.last_trade_price
                                const qty = parseFloat(quantity)
                                if (isNaN(price) || isNaN(qty)) return '0.00'
                                return (qty * price).toFixed(2)
                            })()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleBuy} disabled={!currentSymbol || !quantity} className="bg-emerald-500 hover:bg-emerald-600">
                            Buy
                        </Button>
                        <Button onClick={handleSell} disabled={!currentSymbol || !quantity} className="bg-rose-500 hover:bg-rose-600">
                            Sell
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
