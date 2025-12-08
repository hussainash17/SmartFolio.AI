import { useState, useEffect } from 'react';
import { OrdersService, MarketService } from '../../src/client';
import { formatPrice, formatPnL, getPnLColor, getStatusColor } from '../../lib/formatting-utils';
import {
    generateSmartSummary,
    getTechnicalSignals,
    calculateFundamentalHealth,
    calculateRiskMetrics,
    SmartSummary,
    SmartSignal,
    FundamentalHealth,
    RiskMetrics
} from '../../lib/analytics-utils';
import { Lightbulb, Activity, ShieldAlert, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'insights' | 'history' | 'alerts'>('positions');
    const [positions, setPositions] = useState<Position[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);

    // Insights State
    const [smartSummary, setSmartSummary] = useState<SmartSummary | null>(null);
    const [technicalSignals, setTechnicalSignals] = useState<SmartSignal[]>([]);
    const [fundamentalHealth, setFundamentalHealth] = useState<FundamentalHealth | null>(null);
    const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);

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

    // Load Insights
    useEffect(() => {
        if (currentSymbol && activeTab === 'insights') {
            loadInsights();
        }
    }, [currentSymbol, activeTab]);

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

    const loadInsights = async () => {
        if (!currentSymbol) return;
        setLoading(true);
        try {
            // Fetch basic data to generate insights
            const data = await MarketService.getStock({ symbol: currentSymbol });
            const stockData = (data as any)?.data || data;

            // Generate Smart Summary
            const price = Number(stockData?.last_trade_price || 100);
            const changePercent = Number(stockData?.change_percent || 0);

            const summary = generateSmartSummary(
                currentSymbol,
                price,
                changePercent,
                55, // Mock RSI
                price * 0.95, // Mock MA50
                price * 0.90  // Mock MA200
            );
            setSmartSummary(summary);

            // Get Signals
            const signals = getTechnicalSignals(
                price,
                55, // RSI
                0.5 // Mock MACD
            );
            setTechnicalSignals(signals);

            // Get Fundamental Health
            const health = calculateFundamentalHealth(
                Number(stockData?.market_cap || 1000000),
                Number(stockData?.pe_ratio || 15),
                Number(stockData?.eps || 5)
            );
            setFundamentalHealth(health);

            // Get Risk Metrics
            const risk = calculateRiskMetrics(
                1.2, // Beta
                15 // Volatility
            );
            setRiskMetrics(risk);

        } catch (error) {
            console.error('Error loading insights:', error);
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
                    onClick={() => setActiveTab('insights')}
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'insights'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Lightbulb className="w-3 h-3" />
                    Insights
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
            <div className="flex-1 overflow-auto bg-card">
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
                                        <thead className="bg-muted/30 border-b border-border">
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
                                        <thead className="bg-muted/30 border-b border-border">
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

                        {/* Insights Tab */}
                        {activeTab === 'insights' && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Smart Summary */}
                                <div className="md:col-span-2 space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-primary" />
                                        Smart Summary
                                    </h3>
                                    {smartSummary ? (
                                        <div className="p-4 bg-muted/30 rounded-lg border border-border">
                                            <h4 className="font-bold text-lg mb-1">{smartSummary.headline}</h4>
                                            <p className="text-sm text-muted-foreground mb-3">{smartSummary.details}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${smartSummary.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    smartSummary.sentiment === 'negative' ? 'bg-rose-500/10 text-rose-500' :
                                                        'bg-gray-500/10 text-gray-500'
                                                    }`}>
                                                    {smartSummary.sentiment.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">Select a symbol to generate summary</div>
                                    )}
                                </div>

                                {/* Technical Signals */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-blue-500" />
                                        Technical Signals
                                    </h3>
                                    <div className="space-y-2">
                                        {technicalSignals.map((signal, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-border">
                                                <span className="text-xs font-medium">{signal.label}</span>
                                                <div className="flex items-center gap-1">
                                                    {signal.type === 'bullish' ? <TrendingUp className="w-3 h-3 text-emerald-500" /> :
                                                        signal.type === 'bearish' ? <TrendingDown className="w-3 h-3 text-rose-500" /> :
                                                            <div className="w-3 h-0.5 bg-gray-400" />}
                                                </div>
                                            </div>
                                        ))}
                                        {technicalSignals.length === 0 && (
                                            <div className="text-xs text-muted-foreground">No signals detected</div>
                                        )}
                                    </div>
                                </div>

                                {/* Health & Risk */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-orange-500" />
                                        Health & Risk
                                    </h3>
                                    <div className="space-y-2">
                                        {fundamentalHealth && (
                                            <div className="p-2 bg-muted/30 rounded border border-border">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">Health Score</span>
                                                    <span className="font-bold">{fundamentalHealth.score}/100</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${fundamentalHealth.score > 70 ? 'bg-emerald-500' :
                                                            fundamentalHealth.score > 40 ? 'bg-yellow-500' : 'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${fundamentalHealth.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {riskMetrics && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-2 bg-muted/30 rounded border border-border text-center">
                                                    <div className="text-[10px] text-muted-foreground">Volatility</div>
                                                    <div className="text-xs font-bold">{riskMetrics.volatility}%</div>
                                                </div>
                                                <div className="p-2 bg-muted/30 rounded border border-border text-center">
                                                    <div className="text-[10px] text-muted-foreground">Beta</div>
                                                    <div className="text-xs font-bold">{riskMetrics.beta}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
