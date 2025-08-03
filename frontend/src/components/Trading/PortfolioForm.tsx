import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Portfolio } from "@/types/portfolio";

interface PortfolioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (portfolio: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => void;
  initialData?: Portfolio;
}

export function PortfolioForm({ open, onOpenChange, onSubmit, initialData }: PortfolioFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [cash, setCash] = useState(initialData?.cash?.toString() || '10000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      createdDate: initialData?.createdDate || new Date().toISOString().split('T')[0],
      stocks: initialData?.stocks || [],
      cash: parseFloat(cash) || 0,
    });

    // Reset form
    setName('');
    setDescription('');
    setCash('10000');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Portfolio' : 'Create New Portfolio'}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Update your portfolio settings and configuration.'
              : 'Set up a new portfolio to track your equity investments.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Portfolio Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Growth Portfolio"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your investment strategy"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash">Initial Cash</Label>
            <Input
              id="cash"
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="10000"
              min="0"
              step="0.01"
            />
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
              {initialData ? 'Update' : 'Create'} Portfolio
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}