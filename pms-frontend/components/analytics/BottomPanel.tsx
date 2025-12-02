import { useState, useEffect } from 'react';
import { OrdersService } from '../../src/client';
import { formatPrice, formatPnL, getPnLColor, getStatusColor } from '../../lib/formatting-utils';

interface BottomPanelProps {
    currentSymbol: string;
}

interface Position {
    id: string;
    symbol: string;
    quantity: number;
    avg_price: number;
    current_price?: number;
    unrealized_pnl?: number;
    unrealized_pnl_percent?: number;
    portfolio_name?: string;
}

interface Order {
    id: string;
    symbol: string;
    side: string;
    order_type: string;
    quantity: number;
    price?: number;
    status: string;
    created_at: string;
}

export function BottomPanel({ currentSymbol }: BottomPanelProps) {
    const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history' | 'alerts'>('positions');
    const [positions, setPositions] = useState<Position[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Load positions for current symbol
    useEffect(() => {
        if (currentSymbol && activeTab === 'positions') {
            loadPositions();
        }
    }, [currentSymbol, activeTab]);

    // Load orders
    useEffect(() => {
        if (activeTab === 'orders') {
            loadOrders();
        }
    }, [activeTab]);

    const loadPositions = async () => {
        if (!currentSymbol) return;

        setLoading(true);
        try {
            const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/tradingview/positions/${currentSymbol}`);
            if (response.ok) {
                const data = await response.json();
                setPositions(data || []);
            }
        } catch (error) {
            console.error('Error loading positions:', error);
            setPositions([]);
        } finally {
            setLoading(false);
        }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await OrdersService.getUserOrders({});
            // Transform OrderPublic to Order format
            const transformedOrders: Order[] = data.map((order: any) => ({
                id: order.id,
                symbol: order.stock_id || order.symbol || '',
                side: order.side?.toLowerCase() || '',
                order_type: order.order_type?.toLowerCase() || '',
                quantity: order.quantity || 0,
                price: order.price ? parseFloat(order.price) : undefined,
                status: order.status?.toLowerCase() || '',
                created_at: order.placed_at || order.created_at || new Date().toISOString()
            }));
            setOrders(transformedOrders);
        } catch (error) {
            console.error('Error loading orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border bg-card px-4">
                <button
                    onClick={() => setActiveTab('positions')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'positions'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Positions
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'orders'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Orders
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'history'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    History
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'alerts'
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Alerts
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    </div>
                ) : (
                    <>
                        {/* Positions Tab */}
                        {activeTab === 'positions' && (
                            <div className="overflow-x-auto">
                                {positions.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-background border-b border-border">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Symbol</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Avg Price</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Current</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">P&L</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">P&L %</th>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Portfolio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {positions.map((position) => (
                                                <tr key={position.id} className="hover:bg-accent/50 transition-colors">
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
                                                    <td className="px-4 py-3 text-muted-foreground">{position.portfolio_name || '--'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <p className="text-sm">No positions for {currentSymbol || 'selected symbol'}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === 'orders' && (
                            <div className="overflow-x-auto">
                                {orders.length > 0 ? (
                                    <table className="w-full text-sm">
                                        <thead className="bg-background border-b border-border">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Symbol</th>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Side</th>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Qty</th>
                                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">Price</th>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {orders.map((order) => (
                                                <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                                                    <td className="px-4 py-3 font-semibold">{order.symbol}</td>
                                                    <td className={`px-4 py-3 font-medium ${order.side === 'buy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {order.side.toUpperCase()}
                                                    </td>
                                                    <td className="px-4 py-3 capitalize">{order.order_type}</td>
                                                    <td className="px-4 py-3 text-right font-mono">{order.quantity}</td>
                                                    <td className="px-4 py-3 text-right font-mono">{formatPrice(order.price)}</td>
                                                    <td className={`px-4 py-3 capitalize ${getStatusColor(order.status)}`}>
                                                        {order.status}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                                        {new Date(order.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <p className="text-sm">No orders found</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* History Tab */}
                        {activeTab === 'history' && (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p className="text-sm">Trade history will appear here</p>
                            </div>
                        )}

                        {/* Alerts Tab */}
                        {activeTab === 'alerts' && (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                <p className="text-sm">Price alerts will appear here</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
