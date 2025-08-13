import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Trade</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="stock-search">Search Stock</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stock-search"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Selected Stock Display */}
            {selectedStock && (
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{selectedStock.symbol}</h3>
                    <p className="text-sm text-muted-foreground">{selectedStock.companyName}</p>
                    <p className="text-xs text-muted-foreground">{selectedStock.sector}</p>
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
            )}

            {/* Stock Results */}
            {searchTerm && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredStocks.slice(0, 10).map((stock) => (
                  <div
                    key={stock.symbol}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStock?.symbol === stock.symbol
                        ? 'border-primary bg-accent'
                        : 'border-border hover:bg-accent'
                    }`}
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
          </div>

          {/* Order Form */}
          <div className="space-y-4">
            {selectedStock ? (
              <>
                <Tabs value={orderDetails.side} onValueChange={(value) => setOrderDetails(prev => ({ ...prev, side: value as 'buy' | 'sell' }))}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="buy" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
                      Buy
                    </TabsTrigger>
                    <TabsTrigger value="sell" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
                      Sell
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="buy" className="space-y-4 mt-4">
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

                  <TabsContent value="sell" className="space-y-4 mt-4">
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
                      <span>Buying Power:</span>
                      <span>{formatCurrency(buyingPower)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span>Available After Trade:</span>
                      <span className={canAfford ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(buyingPower - estimatedTotal)}
                      </span>
                    </div>
                    {!canAfford && (
                      <Badge variant="destructive" className="w-full justify-center">
                        Insufficient Buying Power
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
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Search and select a stock to place an order</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}