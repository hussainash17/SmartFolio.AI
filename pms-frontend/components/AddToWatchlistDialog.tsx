import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Plus } from "lucide-react";
import type { WatchlistPublic } from "../src/client";

interface AddToWatchlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  companyName?: string;
  watchlists: WatchlistPublic[];
  onAdd: (watchlistId: string, notes?: string) => Promise<void>;
  onCreateWatchlist?: (name: string, description?: string) => Promise<string>;
}

export function AddToWatchlistDialog({
  open,
  onOpenChange,
  symbol,
  companyName,
  watchlists,
  onAdd,
  onCreateWatchlist,
}: AddToWatchlistDialogProps) {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [newWatchlistDesc, setNewWatchlistDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default watchlist when dialog opens
  useState(() => {
    if (watchlists.length > 0 && !selectedWatchlistId) {
      const defaultWatchlist = watchlists.find(w => w.is_default) || watchlists[0];
      setSelectedWatchlistId(defaultWatchlist.id);
    }
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isCreatingNew) {
        if (!newWatchlistName.trim()) {
          return;
        }
        if (onCreateWatchlist) {
          const newId = await onCreateWatchlist(newWatchlistName, newWatchlistDesc);
          await onAdd(newId, notes || undefined);
        }
      } else {
        if (!selectedWatchlistId) return;
        await onAdd(selectedWatchlistId, notes || undefined);
      }
      // Reset form
      setNotes("");
      setIsCreatingNew(false);
      setNewWatchlistName("");
      setNewWatchlistDesc("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            Add {symbol} {companyName && `(${companyName})`} to a watchlist
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!isCreatingNew ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="watchlist">Select Watchlist</Label>
                <Select value={selectedWatchlistId} onValueChange={setSelectedWatchlistId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a watchlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {watchlists.map((wl) => (
                      <SelectItem key={wl.id} value={wl.id}>
                        {wl.name} {wl.is_default && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {onCreateWatchlist && (
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingNew(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Watchlist
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="new-watchlist-name">Watchlist Name</Label>
                <Input
                  id="new-watchlist-name"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="My Watchlist"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-watchlist-desc">Description (optional)</Label>
                <Input
                  id="new-watchlist-desc"
                  value={newWatchlistDesc}
                  onChange={(e) => setNewWatchlistDesc(e.target.value)}
                  placeholder="Description..."
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setIsCreatingNew(false)}
                className="w-full"
              >
                Cancel - Select Existing
              </Button>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this stock..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to Watchlist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

