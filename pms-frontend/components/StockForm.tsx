import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Portfolio, Stock } from "../types/portfolio";
import { useTrading } from "../hooks/useTrading";
import { Loader2 } from "lucide-react";

export type StockFormMode = 'add' | 'edit' | 'buy' | 'sell';

interface StockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (stock: Omit<Stock, 'id'>) => Promise<void> | void;
  initialData?: Stock;
  availableStocks: Array<{
    symbol: string;
    companyName: string;
    currentPrice: number;
    sector?: string;
  }>;
  mode?: StockFormMode;
  portfolioId?: string;
  portfolios?: Portfolio[];
}

export function StockForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  availableStocks,
  mode = 'add',
  portfolioId,
  portfolios = []
}: StockFormProps) {
  const { placeOrder } = useTrading();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(portfolioId || '');

  useEffect(() => {
    if (portfolioId) {
      setSelectedPortfolioId(portfolioId);
    }
  }, [portfolioId]);

  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '');
  const [price, setPrice] = useState(initialData?.purchasePrice?.toString() || '');
  const [date, setDate] = useState(
    initialData?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  // sector and currentPrice are less relevant for simulated trades but kept for edit mode
  const [currentPrice, setCurrentPrice] = useState(initialData?.currentPrice?.toString() || '');
  const [sector, setSector] = useState(initialData?.sector || '');

  // Handle stock selection
  const handleStockSelect = (selectedSymbol: string) => {
    const stock = availableStocks.find(s => s.symbol === selectedSymbol);
    if (stock) {
      setSymbol(stock.symbol);
      setCompanyName(stock.companyName);
      if (mode !== 'edit' && !price) {
        setPrice(stock.currentPrice.toString());
      }
      setCurrentPrice(stock.currentPrice.toString());
      setSector(stock.sector || '');
    }
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setSymbol(initialData.symbol);
        setCompanyName(initialData.companyName);
        if (mode === 'buy' || mode === 'sell') {
          // For buy/sell, we start with empty quantity, but prefill price with current or purchase price
          setQuantity('');
          // For buy/sell, suggest current market price if available, else last purchase price
          setPrice(availableStocks.find(s => s.symbol === initialData.symbol)?.currentPrice.toString() || initialData.currentPrice.toString());
        } else {
          // Edit mode
          setQuantity(initialData.quantity.toString());
          setPrice(initialData.purchasePrice.toString());
        }
        setDate(new Date().toISOString().split('T')[0]); // Default to today for new trades
        setCurrentPrice(initialData.currentPrice.toString());
        setSector(initialData.sector || '');
      } else {
        // Reset for new entry
        setSymbol('');
        setCompanyName('');
        setQuantity('');
        setPrice('');
        setDate(new Date().toISOString().split('T')[0]);
        setCurrentPrice('');
        setSector('');
      }
    }
  }, [initialData, open, mode, availableStocks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !price) return;

    setIsSubmitting(true);
    try {
      if (mode === 'edit') {
        // Legacy edit logic (direct position update)
        await onSubmit({
          symbol: symbol.toUpperCase(),
          companyName,
          quantity: parseInt(quantity),
          purchasePrice: parseFloat(price),
          currentPrice: parseFloat(currentPrice) || parseFloat(price),
          purchaseDate: date,
          sector: sector || undefined,
        });
      } else {
        // Transactional logic (Add, Buy, Sell)
        // Treated as placing a simulated LIMIT order
        const targetPortfolioId = portfolioId || selectedPortfolioId;
        if (!targetPortfolioId) {
          console.error("No portfolio selected");
          return;
        }

        await placeOrder({
          symbol: symbol.toUpperCase(),
          companyName,
          quantity: parseInt(quantity),
          limitPrice: parseFloat(price),
          side: mode === 'sell' ? 'sell' : 'buy',
          orderType: 'limit',
          timeInForce: 'day',
          portfolioId: targetPortfolioId,
          fillDate: date, // Backdating support
          totalValue: parseInt(quantity) * parseFloat(price),
          fees: 0 // Will be calculated by backend
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit stock form", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'buy': return 'Buy More Stock';
      case 'sell': return 'Sell Stock';
      case 'edit': return 'Edit Position';
      case 'add': default: return 'Add New Stock';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'buy': return `Add more shares of ${symbol || 'this stock'} to your portfolio.`;
      case 'sell': return `Reduce your position in ${symbol || 'this stock'}.`;
      case 'edit': return 'Correct the details of this position entry (does not create a trade record).';
      case 'add': default: return 'Add a new stock position with purchase history.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!portfolioId && (
            <div className="space-y-2">
              <Label htmlFor="portfolio-select">Select Portfolio</Label>
              <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a portfolio..." />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-select">Stock</Label>
              {mode === 'add' ? (
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
              ) : (
                <Input value={symbol} disabled readOnly />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {mode === 'sell' ? 'Quantity to Sell' : 'Quantity'}
              </Label>
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
              disabled={mode !== 'add' && mode !== 'edit'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">
                {mode === 'sell' ? 'Selling Price' : 'Purchase Price'}
              </Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                {mode === 'edit' ? 'Purchase Date' : 'Trade Date'}
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {mode === 'edit' && (
            // Only show extra fields in edit mode
            <div className="space-y-2">
              <Label htmlFor="sector">Sector (Optional)</Label>
              <Input
                id="sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'buy' ? 'Buy Stock' : mode === 'sell' ? 'Sell Stock' : mode === 'edit' ? 'Update' : 'Add Stock'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}