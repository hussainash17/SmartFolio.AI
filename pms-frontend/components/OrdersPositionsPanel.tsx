import { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { OrdersService } from '../src/client'

interface OrdersPositionsPanelProps {
    currentSymbol: string
}

interface Position {
    id: string
    symbol: string
    quantity: number
    avg_price: number
    current_price?: number
    unrealized_pnl?: number
    unrealized_pnl_percent?: number
    portfolio_name?: string
}

interface Order {
    id: string
    symbol: string
    side: string
    order_type: string
    quantity: number
    price?: number
    status: string
    created_at: string
}

export function OrdersPositionsPanel({ currentSymbol }: OrdersPositionsPanelProps) {
    const [activeTab, setActiveTab] = useState<'positions' | 'orders'>('positions')
    const [positions, setPositions] = useState<Position[]>([])
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (currentSymbol && activeTab === 'positions') loadPositions()
    }, [currentSymbol, activeTab === 'positions'])

    useEffect(() => {
        if (activeTab === 'orders') loadOrders()
    }, [activeTab === 'orders'])

    const loadPositions = async () => {
        if (!currentSymbol) return

        setLoading(true)
        try {
            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
            const response = await fetch(`${apiUrl}/api/v1/tradingview/positions/${currentSymbol}`)
            if (response.ok) {
                const data = await response.json()
                setPositions(data || [])
            }
        } catch (error) {
            console.error('Error loading positions:', error)
            setPositions([])
        } finally {
            setLoading(false)
        }
    }

    const loadOrders = async () => {
        setLoading(true)
        try {
            const data = await OrdersService.getUserOrders({})
            // Transform OrderPublic to Order format
            const transformedOrders: Order[] = data.map(order => ({
                id: order.id,
                symbol: order.stock_id, // Map stock_id to symbol
                side: order.side.toLowerCase(), // Convert 'BUY'/'SELL' to lowercase
                order_type: order.order_type.toLowerCase(), // Convert to lowercase
                quantity: order.quantity,
                price: order.price ? parseFloat(order.price) : undefined,
                status: order.status.toLowerCase(),
                created_at: order.placed_at // Map placed_at to created_at
            }))
            setOrders(transformedOrders)
        } catch (error) {
            console.error('Error loading orders:', error)
            setOrders([])
        } finally {
            setLoading(false)
        }
    }


    const formatPrice = (price?: number | string) => {
        if (price === undefined || price === null) return '--'
        const numPrice = typeof price === 'string' ? parseFloat(price) : price
        return isNaN(numPrice) ? '--' : numPrice.toFixed(2)
    }

    const formatPnL = (pnl?: number | string) => {
        if (pnl === undefined || pnl === null) return '--'
        const numPnL = typeof pnl === 'string' ? parseFloat(pnl) : pnl
        if (isNaN(numPnL)) return '--'
        const sign = numPnL >= 0 ? '+' : ''
        return `${sign}${numPnL.toFixed(2)}`
    }

    const getPnLColor = (pnl?: number | string) => {
        if (!pnl) return 'text-muted-foreground'
        const numPnL = typeof pnl === 'string' ? parseFloat(pnl) : pnl
        return isNaN(numPnL) ? 'text-muted-foreground' : numPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'filled': return 'text-emerald-500'
            case 'open':
            case 'pending': return 'text-blue-500'
            case 'cancelled':
            case 'rejected': return 'text-rose-500'
            default: return 'text-muted-foreground'
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>

                <CardContent className="flex-1 overflow-auto p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        </div>
                    ) : (
                        <>
                            <TabsContent value="positions" className="mt-0 border-0 p-0">
                                {positions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Symbol</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Qty</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Avg Price</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Current</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">P&L</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">P&L %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {positions.map((position) => (
                                                    <tr key={position.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3 font-semibold">{position.symbol}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{position.quantity}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{formatPrice(position.avg_price)}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{formatPrice(position.current_price)}</td>
                                                        <td className={`px-4 py-3 text-right font-mono font-semibold ${getPnLColor(position.unrealized_pnl)}`}>
                                                            {formatPnL(position.unrealized_pnl)}
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-mono ${getPnLColor(position.unrealized_pnl_percent)}`}>
                                                            {position.unrealized_pnl_percent !== undefined
                                                                ? `${formatPnL(position.unrealized_pnl_percent)}%`
                                                                : '--'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <p className="text-sm">No positions for {currentSymbol || 'selected symbol'}</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="orders" className="mt-0 border-0 p-0">
                                {orders.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Symbol</th>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Side</th>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Type</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Qty</th>
                                                    <th className="px-4 py-2 text-right font-medium text-muted-foreground text-xs">Price</th>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {orders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-3 font-semibold">{order.symbol}</td>
                                                        <td className={`px-4 py-3 font-medium capitalize ${order.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {order.side}
                                                        </td>
                                                        <td className="px-4 py-3 capitalize">{order.order_type}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{order.quantity}</td>
                                                        <td className="px-4 py-3 text-right font-mono">{formatPrice(order.price)}</td>
                                                        <td className={`px-4 py-3 capitalize ${getStatusColor(order.status)}`}>
                                                            {order.status}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <p className="text-sm">No orders found</p>
                                    </div>
                                )}
                            </TabsContent>
                        </>
                    )}
                </CardContent>
            </Tabs>
        </Card>
    )
}
