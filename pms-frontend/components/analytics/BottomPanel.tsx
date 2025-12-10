import { useState, useEffect } from 'react';
import { MarketService } from '../../src/client';
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
import { Lightbulb, Activity, ShieldAlert, TrendingUp, TrendingDown, Bell, Plus, Trash2 } from 'lucide-react';
import { useUserAlerts } from '../../hooks/useUserAlerts';
import { useSymbolMarketSummary } from '../../hooks/useSymbolFundamentals';
import { useTradingViewPositions } from '../../hooks/useTradingViewPositions';
import { useOrders } from '../../hooks/useOrders';

interface BottomPanelProps {
    currentSymbol: string;
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

    // Insights State
    const [smartSummary, setSmartSummary] = useState<SmartSummary | null>(null);
    const [technicalSignals, setTechnicalSignals] = useState<SmartSignal[]>([]);
    const [fundamentalHealth, setFundamentalHealth] = useState<FundamentalHealth | null>(null);
    const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);

    // Positions hook
    const { 
        data: positionsData = [], 
        isLoading: positionsLoading 
    } = useTradingViewPositions({
        symbol: currentSymbol || '',
        enabled: !!currentSymbol && activeTab === 'positions',
    });

    // Orders hook
    const { 
        data: ordersData = [], 
        isLoading: ordersLoading 
    } = useOrders({
        enabled: activeTab === 'orders',
    });

    // Alerts hook
    const { 
        alerts, 
        isLoading: alertsLoading, 
        deleteAlert, 
        isDeleting 
    } = useUserAlerts({ enabled: activeTab === 'alerts' });

    // Fundamental data for insights
    const { data: fundamentalsData } = useSymbolMarketSummary({
        symbol: currentSymbol,
        enabled: !!currentSymbol && activeTab === 'insights',
    });

    // Transform positions data to match component interface
    const positions = positionsData.map((pos) => ({
        id: pos.id,
        symbol: pos.symbol,
        quantity: pos.quantity,
        avg_price: pos.price,
        current_price: pos.quantity > 0 ? pos.current_value / pos.quantity : pos.price,
        unrealized_pnl: pos.unrealized_pnl,
        unrealized_pnl_percent: pos.unrealized_pnl_percent,
        portfolio_name: pos.portfolio_name,
    }));

    // Transform orders data to match component interface
    const orders: Order[] = ordersData.map((order: any) => ({
        id: order.id,
        symbol: order.stock_id || order.symbol || '',
        side: order.side?.toLowerCase() || '',
        order_type: order.order_type?.toLowerCase() || '',
        quantity: order.quantity || 0,
        price: order.price ? parseFloat(order.price) : undefined,
        status: order.status?.toLowerCase() || '',
        created_at: order.placed_at || order.created_at || new Date().toISOString()
    }));

    const loading = positionsLoading || ordersLoading;

    // Load Insights
    useEffect(() => {
        if (currentSymbol && activeTab === 'insights') {
            loadInsights();
        }
    }, [currentSymbol, activeTab, fundamentalsData]);

    const loadInsights = async () => {
        if (!currentSymbol) return;
        try {
            // Fetch basic data to generate insights
            const data = await MarketService.getStock({ symbol: currentSymbol });
            const stockData = (data as any)?.data || data;

            // Generate Smart Summary
            const price = Number(stockData?.last_trade_price || 100);
            const changePercent = Number(stockData?.change_percent || 0);

            // Use real fundamentals data if available
            const peRatio = fundamentalsData?.pe_ratio ?? Number(stockData?.pe_ratio || 15);
            const marketCap = fundamentalsData?.market_cap ?? Number(stockData?.market_cap || 1000000);
            const eps = fundamentalsData?.eps ?? Number(stockData?.eps || 5);

            // Calculate technical indicators (using available data)
            // In a real implementation, these would come from a technical analysis API
            const rsi = 50 + (changePercent * 2); // Simplified RSI approximation
            const ma50 = price * (1 - changePercent / 200); // Simplified MA50
            const ma200 = price * (1 - changePercent / 100); // Simplified MA200

            const summary = generateSmartSummary(
                currentSymbol,
                price,
                changePercent,
                rsi,
                ma50,
                ma200
            );
            setSmartSummary(summary);

            // Get Signals
            const macd = changePercent > 0 ? 0.5 : -0.5; // Simplified MACD
            const signals = getTechnicalSignals(price, rsi, macd);
            setTechnicalSignals(signals);

            // Get Fundamental Health with real data
            const health = calculateFundamentalHealth(marketCap, peRatio, eps);
            setFundamentalHealth(health);

            // Get Risk Metrics
            // Beta and volatility would ideally come from analytics API
            const risk = calculateRiskMetrics(1.0, 15);
            setRiskMetrics(risk);

        } catch (error) {
            console.error('Error loading insights:', error);
        }
    };

    const handleDeleteAlert = async (alertId: string) => {
        try {
            await deleteAlert(alertId);
        } catch (error) {
            console.error('Error deleting alert:', error);
        }
    };

    // Filter alerts for current symbol
    const symbolAlerts = alerts.filter(alert => {
        // Check if alert is for current symbol
        return !currentSymbol || alert.stock_id === currentSymbol;
    });

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
                    className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'alerts'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Bell className="w-3 h-3" />
                    Alerts
                    {alerts.length > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                            {alerts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-card">
                {(loading || alertsLoading) ? (
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
                            <div className="p-4">
                                {alerts.length > 0 ? (
                                    <div className="space-y-2">
                                        {alerts.map((alert) => (
                                            <div 
                                                key={alert.id} 
                                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                                    alert.status === 'triggered' 
                                                        ? 'bg-primary/5 border-primary' 
                                                        : 'bg-muted/30 border-border'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Bell className={`w-4 h-4 ${alert.status === 'triggered' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                    <div>
                                                        <div className="text-sm font-medium">
                                                            {alert.alert_type} Alert
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {alert.condition} {alert.target_value}
                                                            {alert.current_value && (
                                                                <span className="ml-2">
                                                                    (Current: {Number(alert.current_value).toFixed(2)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                        alert.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        alert.status === 'triggered' ? 'bg-primary/10 text-primary' :
                                                        'bg-gray-500/10 text-gray-500'
                                                    }`}>
                                                        {alert.status}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteAlert(alert.id)}
                                                        disabled={isDeleting}
                                                        className="p-1 text-muted-foreground hover:text-rose-500 transition-colors"
                                                        title="Delete alert"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                        <Bell className="w-8 h-8 mb-2 opacity-50" />
                                        <p className="text-sm">No price alerts set</p>
                                        <p className="text-xs mt-1">Create alerts from the chart to get notified</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
