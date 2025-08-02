import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Stock } from "../types/portfolio";

interface StockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (stock: Omit<Stock, 'id'>) => void;
  initialData?: Stock;
  availableStocks: Array<{
    symbol: string;
    companyName: string;
    currentPrice: number;
    sector?: string;
  }>;
}

export function StockForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  initialData,
  availableStocks 
}: StockFormProps) {
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '');
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [currentPrice, setCurrentPrice] = useState(initialData?.currentPrice?.toString() || '');
  const [sector, setSector] = useState(initialData?.sector || '');

  // Handle stock selection
  const handleStockSelect = (selectedSymbol: string) => {
    const stock = availableStocks.find(s => s.symbol === selectedSymbol);
    if (stock) {
      setSymbol(stock.symbol);
      setCompanyName(stock.companyName);
      setCurrentPrice(stock.currentPrice.toString());
      setSector(stock.sector || '');
      
      // If no purchase price set, use current price
      if (!purchasePrice) {
        setPurchasePrice(stock.currentPrice.toString());
      }
    }
  };

  useEffect(() => {
    if (initialData) {
      setSymbol(initialData.symbol);
      setCompanyName(initialData.companyName);
      setQuantity(initialData.quantity.toString());
      setPurchasePrice(initialData.purchasePrice.toString());
      setPurchaseDate(initialData.purchaseDate);
      setCurrentPrice(initialData.currentPrice.toString());
      setSector(initialData.sector || '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !companyName || !quantity || !purchasePrice || !currentPrice) {
      return;
    }

    onSubmit({
      symbol: symbol.toUpperCase(),
      companyName,
      quantity: parseInt(quantity),
      purchasePrice: parseFloat(purchasePrice),
      currentPrice: parseFloat(currentPrice),
      purchaseDate,
      sector: sector || undefined,
    });

    // Reset form
    setSymbol('');
    setCompanyName('');
    setQuantity('');
    setPurchasePrice('');
    setCurrentPrice('');
    setSector('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] bg-background border shadow-lg"
        style={{
          backgroundColor: 'hsl(var(--background))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          zIndex: 50
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Stock Position' : 'Add Stock Position'}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Update the details of your existing stock position.'
              : 'Add a new stock position to your portfolio with purchase details.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-select">Stock</Label>
              <Select value={symbol} onValueChange={handleStockSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a stock" />
                </SelectTrigger>
                <SelectContent>
                  {availableStocks.map((stock) => (
                    <SelectItem key={stock.symbol} value={stock.symbol}>
                      <div className="flex flex-col items-start">
                        <span>{stock.symbol}</span>
                        <span className="text-xs text-muted-foreground">{stock.companyName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-price">Purchase Price</Label>
              <Input
                id="purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="150.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-price">Current Price</Label>
              <Input
                id="current-price"
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="155.00"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Sector (Optional)</Label>
              <Input
                id="sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Technology"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update' : 'Add'} Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}