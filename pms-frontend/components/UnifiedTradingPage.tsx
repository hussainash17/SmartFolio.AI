import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { X, Clock, CheckCircle, XCircle, TrendingUp, TrendingDown, Search } from "lucide-react";
import { MarketData, Order, Trade } from "../types/trading";
import { Portfolio } from "../types/portfolio";
import { formatCurrency, formatPercent } from "../lib/utils";

interface UnifiedTradingPageProps {
    marketData: MarketData[];
    onPlaceOrder: (order: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => void;
    portfolios: Portfolio[];
    selectedPortfolioId?: string;
    orders: Order[];
    trades: Trade[];
    onCancelOrder: (orderId: string) => void;
}

export function UnifiedTradingPage({
    marketData,
    onPlaceOrder,
    portfolios,
    selectedPortfolioId: initialPortfolioId,
    orders,
    trades,
    onCancelOrder
}: UnifiedTradingPageProps) {
    // Trading Interface state
    const [selectedStock, setSelectedStock] = useState<MarketData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(
        initialPortfolioId || (portfolios.length > 0 ? portfolios[0].id : '')
    );
    const [orderDetails, setOrderDetails] = useState({
        side: 'buy' as 'buy' | 'sell',
        orderType: 'market' as 'market' | 'limit' | 'stop' | 'stop-limit',
        quantity: '',
        limitPrice: '',
        stopPrice: '',
        timeInForce: 'day' as 'day' | 'gtc',
    });

    // Get selected portfolio for buying power
    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const portfolioCash = selectedPortfolio?.cash || 0;

    // Update portfolio selection when it changes in parent
    useEffect(() => {
        if (initialPortfolioId && initialPortfolioId !== selectedPortfolioId) {
            setSelectedPortfolioId(initialPortfolioId);
        }
    }, [initialPortfolioId]);

    const filteredStocks = marketData.filter(stock =>
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const estimatedTotal = selectedStock && orderDetails.quantity ?
        parseInt(orderDetails.quantity) * (
            orderDetails.orderType === 'market' ? selectedStock.currentPrice :
                orderDetails.orderType === 'limit' ? parseFloat(orderDetails.limitPrice || '0') :
                    selectedStock.currentPrice
        ) : 0;

    const canAfford = orderDetails.side === 'sell' || estimatedTotal <= portfolioCash;

    const handlePlaceOrder = () => {
        if (!selectedStock || !orderDetails.quantity || !selectedPortfolioId) return;

        const order: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'> = {
            portfolioId: selectedPortfolioId,
            symbol: selectedStock.symbol,
            companyName: selectedStock.companyName,
            side: orderDetails.side,
            orderType: orderDetails.orderType,
            quantity: parseInt(orderDetails.quantity),
            limitPrice: orderDetails.limitPrice ? parseFloat(orderDetails.limitPrice) : undefined,
            stopPrice: orderDetails.stopPrice ? parseFloat(orderDetails.stopPrice) : undefined,
            timeInForce: orderDetails.timeInForce,
            totalValue: estimatedTotal,
            fees: 0,
        };

        onPlaceOrder(order);

        // Reset form
        setOrderDetails({
            side: 'buy',
            orderType: 'market',
            quantity: '',
            limitPrice: '',
            stopPrice: '',
            timeInForce: 'day',
        });
    };

    // Orders Manager utilities
    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusIcon = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            case 'filled':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'cancelled':
                return <XCircle className="h-4 w-4 text-gray-600" />;
            case 'rejected':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    const getStatusVariant = (status: Order['status']) => {
        switch (status) {
            case 'pending':
                return 'secondary' as const;
            case 'filled':
                return 'default' as const;
            case 'cancelled':
                return 'outline' as const;
            case 'rejected':
                return 'destructive' as const;
            default:
                return 'secondary' as const;
        }
    };

    const pendingOrders = orders.filter(order => order.status === 'pending');
    const completedOrders = orders.filter(order => order.status !== 'pending');

    // Calculate order summary stats
    const totalOrderValue = orders.reduce((sum, order) => sum + order.totalValue, 0);
    const filledOrdersToday = orders.filter(order =>
        order.status === 'filled' &&
        new Date(order.fillDate || order.orderDate).toDateString() === new Date().toDateString()
    ).length;

    return (
        <div className="space-y-6">
            {/* Order Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Pending Orders</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingOrders.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatCurrency(pendingOrders.reduce((sum, order) => sum + order.totalValue, 0))} total value
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Filled Today</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filledOrdersToday}</div>
                        <p className="text-xs text-muted-foreground">
                            Orders executed
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Total Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalOrderValue)}</div>
                        <p className="text-xs text-muted-foreground">
                            All time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm">Recent Trades</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{trades.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Executed trades
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Selection and Order Entry */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stock Search and Selection */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Select Stock</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search stocks..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredStocks.map((stock) => (
                                <div
                                    key={stock.symbol}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStock?.symbol === stock.symbol
                                        ? 'border-primary bg-accent'
                                        : 'border-border hover:bg-accent'
                                        }`}
                                    onClick={() => setSelectedStock(stock)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{stock.symbol}</p>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {stock.companyName}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
                                            <div className="flex items-center gap-1">
                                                {stock.change >= 0 ? (
                                                    <TrendingUp className="h-3 w-3 text-green-600" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3 text-red-600" />
                                                )}
                                                <span className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatPercent(stock.changePercent)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Order Entry */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Place Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedStock ? (
                            <div className="space-y-6">
                                {/* Stock Info */}
                                <div className="p-4 bg-accent rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold">{selectedStock.symbol}</h3>
                                            <p className="text-sm text-muted-foreground">{selectedStock.companyName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">{formatCurrency(selectedStock.currentPrice)}</p>
                                            <div className="flex items-center gap-1">
                                                {selectedStock.change >= 0 ? (
                                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                                )}
                                                <span className={selectedStock.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(selectedStock.change)} ({formatPercent(selectedStock.changePercent)})
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Portfolio Selection */}
                                <div className="space-y-2">
                                    <Label>Portfolio</Label>
                                    <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select portfolio" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {portfolios.map(portfolio => (
                                                <SelectItem key={portfolio.id} value={portfolio.id}>
                                                    {portfolio.name} (Cash: {formatCurrency(portfolio.cash)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedPortfolio && (
                                        <p className="text-xs text-muted-foreground">
                                            Available Cash: {formatCurrency(portfolioCash)}
                                        </p>
                                    )}
                                </div>

                                <Separator />

                                <Tabs value={orderDetails.side} onValueChange={(value) => setOrderDetails(prev => ({ ...prev, side: value as 'buy' | 'sell' }))}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="buy" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
                                            Buy
                                        </TabsTrigger>
                                        <TabsTrigger value="sell" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
                                            Sell
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="buy" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Order Type</Label>
                                                <Select
                                                    value={orderDetails.orderType}
                                                    onValueChange={(value) => setOrderDetails(prev => ({ ...prev, orderType: value as any }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="market">Market</SelectItem>
                                                        <SelectItem value="limit">Limit</SelectItem>
                                                        <SelectItem value="stop">Stop</SelectItem>
                                                        <SelectItem value="stop-limit">Stop Limit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Time in Force</Label>
                                                <Select
                                                    value={orderDetails.timeInForce}
                                                    onValueChange={(value) => setOrderDetails(prev => ({ ...prev, timeInForce: value as any }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="day">Day</SelectItem>
                                                        <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                placeholder="Number of shares"
                                                value={orderDetails.quantity}
                                                onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: e.target.value }))}
                                            />
                                        </div>

                                        {orderDetails.orderType === 'limit' && (
                                            <div className="space-y-2">
                                                <Label>Limit Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Limit price per share"
                                                    value={orderDetails.limitPrice}
                                                    onChange={(e) => setOrderDetails(prev => ({ ...prev, limitPrice: e.target.value }))}
                                                />
                                            </div>
                                        )}

                                        {(orderDetails.orderType === 'stop' || orderDetails.orderType === 'stop-limit') && (
                                            <div className="space-y-2">
                                                <Label>Stop Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Stop price"
                                                    value={orderDetails.stopPrice}
                                                    onChange={(e) => setOrderDetails(prev => ({ ...prev, stopPrice: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="sell" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Order Type</Label>
                                                <Select
                                                    value={orderDetails.orderType}
                                                    onValueChange={(value) => setOrderDetails(prev => ({ ...prev, orderType: value as any }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="market">Market</SelectItem>
                                                        <SelectItem value="limit">Limit</SelectItem>
                                                        <SelectItem value="stop">Stop</SelectItem>
                                                        <SelectItem value="stop-limit">Stop Limit</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Time in Force</Label>
                                                <Select
                                                    value={orderDetails.timeInForce}
                                                    onValueChange={(value) => setOrderDetails(prev => ({ ...prev, timeInForce: value as any }))}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="day">Day</SelectItem>
                                                        <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                placeholder="Number of shares"
                                                value={orderDetails.quantity}
                                                onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: e.target.value }))}
                                            />
                                        </div>

                                        {orderDetails.orderType === 'limit' && (
                                            <div className="space-y-2">
                                                <Label>Limit Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Limit price per share"
                                                    value={orderDetails.limitPrice}
                                                    onChange={(e) => setOrderDetails(prev => ({ ...prev, limitPrice: e.target.value }))}
                                                />
                                            </div>
                                        )}

                                        {(orderDetails.orderType === 'stop' || orderDetails.orderType === 'stop-limit') && (
                                            <div className="space-y-2">
                                                <Label>Stop Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Stop price"
                                                    value={orderDetails.stopPrice}
                                                    onChange={(e) => setOrderDetails(prev => ({ ...prev, stopPrice: e.target.value }))}
                                                />
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>

                                {/* Order Summary */}
                                {orderDetails.quantity && (
                                    <div className="p-4 bg-muted rounded-lg space-y-2">
                                        <div className="flex justify-between">
                                            <span>Estimated Total:</span>
                                            <span className="font-semibold">{formatCurrency(estimatedTotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Portfolio Cash:</span>
                                            <span className="font-semibold text-blue-600">{formatCurrency(portfolioCash)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between">
                                            <span>Available After Trade:</span>
                                            <span className={canAfford ? 'text-green-600' : 'text-red-600'}>
                                                {formatCurrency(portfolioCash - estimatedTotal)}
                                            </span>
                                        </div>
                                        {!canAfford && (
                                            <Badge variant="destructive" className="w-full justify-center">
                                                Insufficient Cash in Portfolio
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                <Button
                                    onClick={handlePlaceOrder}
                                    disabled={!orderDetails.quantity || !canAfford}
                                    className={`w-full ${orderDetails.side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {orderDetails.side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">Select a stock to place an order</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Orders and Trades Tabs */}
            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pending">Pending Orders ({pendingOrders.length})</TabsTrigger>
                    <TabsTrigger value="completed">Order History ({completedOrders.length})</TabsTrigger>
                    <TabsTrigger value="trades">Recent Trades ({trades.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingOrders.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Side</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total Value</TableHead>
                                            <TableHead>Time in Force</TableHead>
                                            <TableHead>Order Time</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium">{order.symbol}</span>
                                                        <p className="text-xs text-muted-foreground">{order.companyName}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                                                        {order.side.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {order.orderType.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{order.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {order.orderType === 'market' ? 'Market' :
                                                        order.limitPrice ? formatCurrency(order.limitPrice) :
                                                            order.stopPrice ? formatCurrency(order.stopPrice) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(order.totalValue)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {order.timeInForce.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDateTime(order.orderDate)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onCancelOrder(order.id)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No pending orders</p>
                                    <p className="text-sm text-muted-foreground">Place an order to see it here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {completedOrders.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Side</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Filled</TableHead>
                                            <TableHead className="text-right">Avg Price</TableHead>
                                            <TableHead className="text-right">Total Value</TableHead>
                                            <TableHead className="text-right">Fees</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Fill Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {completedOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>
                                                    <div>
                                                        <span className="font-medium">{order.symbol}</span>
                                                        <p className="text-xs text-muted-foreground">{order.companyName}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={order.side === 'buy' ? 'default' : 'secondary'}>
                                                        {order.side.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {order.orderType.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{order.quantity}</TableCell>
                                                <TableCell className="text-right">{order.filledQuantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {order.avgFillPrice ? formatCurrency(order.avgFillPrice) : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {order.avgFillPrice ?
                                                        formatCurrency(order.filledQuantity * order.avgFillPrice) :
                                                        formatCurrency(order.totalValue)
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(order.fees)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(order.status)}
                                                        <Badge variant={getStatusVariant(order.status)}>
                                                            {order.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {order.fillDate ? formatDateTime(order.fillDate) : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No completed orders</p>
                                    <p className="text-sm text-muted-foreground">Your order history will appear here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="trades" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Trades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {trades.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Symbol</TableHead>
                                            <TableHead>Side</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total Value</TableHead>
                                            <TableHead className="text-right">Fees</TableHead>
                                            <TableHead>Execution Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {trades.map((trade) => (
                                            <TableRow key={trade.id}>
                                                <TableCell className="font-medium">{trade.symbol}</TableCell>
                                                <TableCell>
                                                    <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                                                        {trade.side.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{trade.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(trade.price)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(trade.totalValue)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(trade.fees)}</TableCell>
                                                <TableCell className="text-sm">
                                                    {formatDateTime(trade.timestamp)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8">
                                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No trades yet</p>
                                    <p className="text-sm text-muted-foreground">Your executed trades will appear here</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
