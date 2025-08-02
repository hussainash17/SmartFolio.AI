import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TrendingUp, TrendingDown, Search, Calendar, AlertTriangle } from "lucide-react";
import { MarketData, Order } from "../types/trading";

interface QuickTradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceOrder: (order: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'>) => void;
  marketData: MarketData[];
  buyingPower: number;
  initialSymbol?: string;
}

export function QuickTradeDialog({ 
  open, 
  onOpenChange, 
  onPlaceOrder, 
  marketData, 
  buyingPower,
  initialSymbol 
}: QuickTradeDialogProps) {
  const [selectedStock, setSelectedStock] = useState<MarketData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDetails, setOrderDetails] = useState({
    side: 'buy' as 'buy' | 'sell',
    orderType: 'market' as 'market' | 'limit' | 'stop' | 'stop-limit',
    quantity: '',
    limitPrice: '',
    stopPrice: '',
    timeInForce: 'day' as 'day' | 'gtc',
  });

  // Set initial symbol when dialog opens
  useEffect(() => {
    if (open && initialSymbol && !selectedStock) {
      const stock = marketData.find(s => s.symbol === initialSymbol);
      if (stock) {
        setSelectedStock(stock);
        setSearchTerm('');
      }
    }
  }, [open, initialSymbol, marketData, selectedStock]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedStock(null);
      setSearchTerm('');
      setOrderDetails({
        side: 'buy',
        orderType: 'market',
        quantity: '',
        limitPrice: '',
        stopPrice: '',
        timeInForce: 'day',
      });
    }
  }, [open]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

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

  const canAfford = estimatedTotal <= buyingPower;

  const handlePlaceOrder = () => {
    if (!selectedStock || !orderDetails.quantity) return;

    const order: Omit<Order, 'id' | 'orderDate' | 'status' | 'filledQuantity'> = {
      portfolioId: '1', // Default portfolio
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-6xl max-h-[90vh] overflow-y-auto bg-background border shadow-xl"
        style={{
          backgroundColor: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          zIndex: 50
        }}
      >
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Year-to-Date Return</span>
              </div>
              <div className="text-green-600 font-medium">VS S&P 500: +2.3%</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Quick Trade</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrderDetails(prev => ({ ...prev, side: 'buy' }))}
              className={orderDetails.side === 'buy' ? 'bg-green-50 text-green-700 border-green-200' : ''}
            >
              Buy
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Stock Search and Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search Section */}
            <div className="space-y-4">
              <Label htmlFor="stock-search" className="text-sm font-medium">Search Stock</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stock-search"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Selected Stock Display */}
            {selectedStock && (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold">{selectedStock.symbol}</h3>
                        <Badge variant="outline" className="text-xs">
                          {selectedStock.sector}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedStock.companyName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Risk</span>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="text-right space-y-3">
                      <p className="text-3xl font-bold">{formatCurrency(selectedStock.currentPrice)}</p>
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
                </CardContent>
              </Card>
            )}

            {/* Stock Results */}
            {searchTerm && !selectedStock && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredStocks.slice(0, 10).map((stock) => (
                  <div
                    key={stock.symbol}
                    className="p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => {
                      setSelectedStock(stock);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{stock.symbol}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
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
            )}

            {/* Order Form */}
            {selectedStock && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Order Type</Label>
                    <Select 
                      value={orderDetails.orderType} 
                      onValueChange={(value) => setOrderDetails(prev => ({ ...prev, orderType: value as any }))}
                    >
                      <SelectTrigger className="h-12">
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
                    <Label className="text-sm font-medium">Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Number of shares"
                      value={orderDetails.quantity}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: e.target.value }))}
                      className="h-12"
                    />
                  </div>
                </div>

                {orderDetails.orderType === 'limit' && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Limit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Limit price per share"
                      value={orderDetails.limitPrice}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, limitPrice: e.target.value }))}
                      className="h-12"
                    />
                  </div>
                )}

                {(orderDetails.orderType === 'stop' || orderDetails.orderType === 'stop-limit') && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Stop Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Stop price"
                      value={orderDetails.stopPrice}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, stopPrice: e.target.value }))}
                      className="h-12"
                    />
                  </div>
                )}

                {/* Place Order Button */}
                <Button 
                  onClick={handlePlaceOrder}
                  disabled={!orderDetails.quantity || !canAfford}
                  className={`w-full h-12 text-lg font-semibold ${
                    orderDetails.side === 'buy' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Place Buy Order
                  <span className="ml-2 text-sm opacity-80">Risk Alert</span>
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Risk Score Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Risk Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600 mb-2">7.2</div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Moderate Risk
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Time in Force</Label>
                    <Select 
                      value={orderDetails.timeInForce} 
                      onValueChange={(value) => setOrderDetails(prev => ({ ...prev, timeInForce: value as any }))}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Order Summary */}
                  {orderDetails.quantity && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span className="whitespace-nowrap">Estimated Total:</span>
                        <span className="font-semibold text-right ml-2">{formatCurrency(estimatedTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="whitespace-nowrap">Buying Power:</span>
                        <span className="text-right ml-2">{formatCurrency(buyingPower)}</span>
                      </div>
                      <div className="border-t pt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="whitespace-nowrap">Available After:</span>
                          <span className={`text-right ml-2 ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(buyingPower - estimatedTotal)}
                          </span>
                        </div>
                      </div>
                      {!canAfford && (
                        <Badge variant="destructive" className="w-full justify-center mt-2">
                          Insufficient Buying Power
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}