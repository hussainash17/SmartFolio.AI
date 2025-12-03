import { useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MarketService } from "../src/client";
import { BarChart3, LineChart, Loader2 } from "lucide-react";

interface SymbolResult {
  symbol: string;
  company_name: string;
  sector?: string;
}

interface SymbolSearchDropdownProps {
  query: string;
  onPickChart: (symbol: string) => void;
  onPickFundamentals: (symbol: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function SymbolSearchDropdown({
  query,
  onPickChart,
  onPickFundamentals,
  onClose,
  isOpen,
}: SymbolSearchDropdownProps) {
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await MarketService.listStocks({
          q: query,
          limit: 10,
          offset: 0,
        });
        const mapped = (data as any[]).map((item: any) => ({
          symbol: item.symbol,
          company_name: item.company_name || item.symbol,
          sector: item.sector || undefined,
        }));
        setResults(mapped);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Error searching symbols:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            onPickChart(results[selectedIndex].symbol);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onPickChart, onClose]);

  // Don't render if not open or no query
  if (!isOpen || !query.trim()) {
    return null;
  }

  return (
    <Card
      ref={dropdownRef}
      className="absolute top-full left-0 w-full mt-1 z-[100] max-h-[400px] overflow-y-auto overflow-x-hidden shadow-lg border border-border bg-popover"
      style={{ minWidth: '100%', maxWidth: '100%' }}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No symbols found matching "{query}"
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="py-2">
          {results.map((result, index) => (
            <div
              key={result.symbol}
              className={`px-4 py-3 hover:bg-accent cursor-pointer ${
                index === selectedIndex ? "bg-accent" : ""
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-base">{result.symbol}</span>
                    {result.sector && (
                      <Badge variant="outline" className="text-xs">
                        {result.sector}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {result.company_name}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-3 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickChart(result.symbol);
                  }}
                >
                  <LineChart className="h-3 w-3 mr-1.5" />
                  Chart
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-3 flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPickFundamentals(result.symbol);
                  }}
                >
                  <BarChart3 className="h-3 w-3 mr-1.5" />
                  Overview
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

