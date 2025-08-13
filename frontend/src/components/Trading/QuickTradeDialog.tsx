import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  DollarSign, 
  Target, 
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  AlertCircle
} from "lucide-react";
import { MarketData, Order } from "@/types/trading";

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
      routing: 'smart',
    };

    onPlaceOrder(order);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-xl border-slate-200/50">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-slate-900">Quick Trade</DialogTitle>
              <p className="text-sm text-slate-600">Execute trades with lightning speed</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
          {/* Stock Selection - Left Column */}
          <div className="xl:col-span-1 space-y-6">
            {/* Search */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Search Stock</Label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Search by symbol or company name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300/50 transition-all duration-200"
                />
              </div>
            </div>

            {/* Selected Stock Display */}
            {selectedStock && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100/50 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{selectedStock.symbol[0]}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{selectedStock.symbol}</h3>
                        <p className="text-sm text-slate-600 font-medium">{selectedStock.companyName}</p>
                        <Badge className="mt-1 bg-slate-100 text-slate-700 border-slate-200">
                          {selectedStock.sector}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-blue-100/50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">Current Price</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(selectedStock.currentPrice)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-blue-100/50">
                      <div className="flex items-center gap-2">
                        {selectedStock.change >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium text-slate-700">Today's Change</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${selectedStock.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(selectedStock.change)}
                        </div>
                        <div className={`text-sm ${selectedStock.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatPercent(selectedStock.changePercent)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Results */}
            {searchTerm && (
              <Card className="bg-white/80 backdrop-blur-sm border-slate-200/50 shadow-lg">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Search Results</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredStocks.slice(0, 8).map((stock) => (
                      <div
                        key={stock.symbol}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedStock?.symbol === stock.symbol
                            ? 'border-blue-300 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          setSelectedStock(stock);
                          setSearchTerm('');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">{stock.symbol[0]}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{stock.symbol}</p>
                              <p className="text-xs text-slate-600 truncate max-w-[150px]">
                                {stock.companyName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(stock.currentPrice)}</p>
                            <div className="flex items-center gap-1">
                              {stock.change >= 0 ? (
                                <TrendingUp className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              )}
                              <span className={`text-xs font-medium ${stock.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
            )}
          </div>

          {/* Order Form - Right Columns */}
          <div className="xl:col-span-2 space-y-6">
            {selectedStock ? (
              <>
                {/* Buy/Sell Tabs */}
                <Tabs value={orderDetails.side} onValueChange={(value) => setOrderDetails(prev => ({ ...prev, side: value as 'buy' | 'sell' }))}>
                  <TabsList className="grid w-full grid-cols-2 h-14 bg-slate-100 p-1 rounded-2xl">
                    <TabsTrigger 
                      value="buy" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sell" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="buy" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Order Type</Label>
                        <Select 
                          value={orderDetails.orderType} 
                          onValueChange={(value) => setOrderDetails(prev => ({ ...prev, orderType: value as any }))}
                        >
                          <SelectTrigger className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="market">Market Order</SelectItem>
                            <SelectItem value="limit">Limit Order</SelectItem>
                            <SelectItem value="stop">Stop Order</SelectItem>
                            <SelectItem value="stop-limit">Stop Limit Order</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Time in Force</Label>
                        <Select 
                          value={orderDetails.timeInForce} 
                          onValueChange={(value) => setOrderDetails(prev => ({ ...prev, timeInForce: value as any }))}
                        >
                          <SelectTrigger className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day Order</SelectItem>
                            <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Quantity (Shares)</Label>
                      <Input
                        type="number"
                        placeholder="Enter number of shares"
                        value={orderDetails.quantity}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: e.target.value }))}
                        className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                      />
                    </div>

                    {orderDetails.orderType === 'limit' && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Limit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter limit price per share"
                          value={orderDetails.limitPrice}
                          onChange={(e) => setOrderDetails(prev => ({ ...prev, limitPrice: e.target.value }))}
                          className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                        />
                      </div>
                    )}

                    {(orderDetails.orderType === 'stop' || orderDetails.orderType === 'stop-limit') && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Stop Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter stop price"
                          value={orderDetails.stopPrice}
                          onChange={(e) => setOrderDetails(prev => ({ ...prev, stopPrice: e.target.value }))}
                          className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                        />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sell" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Order Type</Label>
                        <Select 
                          value={orderDetails.orderType} 
                          onValueChange={(value) => setOrderDetails(prev => ({ ...prev, orderType: value as any }))}
                        >
                          <SelectTrigger className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="market">Market Order</SelectItem>
                            <SelectItem value="limit">Limit Order</SelectItem>
                            <SelectItem value="stop">Stop Order</SelectItem>
                            <SelectItem value="stop-limit">Stop Limit Order</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Time in Force</Label>
                        <Select 
                          value={orderDetails.timeInForce} 
                          onValueChange={(value) => setOrderDetails(prev => ({ ...prev, timeInForce: value as any }))}
                        >
                          <SelectTrigger className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day Order</SelectItem>
                            <SelectItem value="gtc">Good Till Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Quantity (Shares)</Label>
                      <Input
                        type="number"
                        placeholder="Enter number of shares"
                        value={orderDetails.quantity}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, quantity: e.target.value }))}
                        className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                      />
                    </div>

                    {orderDetails.orderType === 'limit' && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Limit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter limit price per share"
                          value={orderDetails.limitPrice}
                          onChange={(e) => setOrderDetails(prev => ({ ...prev, limitPrice: e.target.value }))}
                          className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                        />
                      </div>
                    )}

                    {(orderDetails.orderType === 'stop' || orderDetails.orderType === 'stop-limit') && (
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">Stop Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter stop price"
                          value={orderDetails.stopPrice}
                          onChange={(e) => setOrderDetails(prev => ({ ...prev, stopPrice: e.target.value }))}
                          className="h-12 bg-white/80 backdrop-blur-sm border-slate-200/50 rounded-xl text-lg font-semibold"
                        />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Order Summary */}
                {orderDetails.quantity && (
                  <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200/50 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Target className="h-5 w-5 text-slate-600" />
                        <h3 className="text-lg font-bold text-slate-900">Order Summary</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white/60 rounded-xl border border-slate-200/50">
                            <div className="text-sm text-slate-600 mb-1">Estimated Total</div>
                            <div className="text-xl font-bold text-slate-900">{formatCurrency(estimatedTotal)}</div>
                          </div>
                          <div className="p-3 bg-white/60 rounded-xl border border-slate-200/50">
                            <div className="text-sm text-slate-600 mb-1">Buying Power</div>
                            <div className="text-xl font-bold text-slate-900">{formatCurrency(buyingPower)}</div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="p-3 bg-white/60 rounded-xl border border-slate-200/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-slate-600" />
                              <span className="text-sm font-medium text-slate-700">Available After Trade</span>
                            </div>
                            <span className={`text-lg font-bold ${canAfford ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(buyingPower - estimatedTotal)}
                            </span>
                          </div>
                        </div>
                        
                        {!canAfford && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">Insufficient buying power for this trade</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Place Order Button */}
                <Button 
                  onClick={handlePlaceOrder}
                  disabled={!orderDetails.quantity || !canAfford}
                  className={`w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all duration-200 ${
                    orderDetails.side === 'buy' 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/25' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  {orderDetails.side === 'buy' ? 'Place Buy Order' : 'Place Sell Order'}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Stock</h3>
                <p className="text-slate-600 max-w-md">
                  Search and select a stock from the left panel to start placing your trade order
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}