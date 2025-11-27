import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  Bell,
  Settings
} from "lucide-react";
import { AccountBalance } from "../types/trading";
import { SymbolSearchDropdown } from "./SymbolSearchDropdown";
import { formatCurrency } from "../lib/utils";

interface GlobalTopBarProps {
  accountBalance: AccountBalance;
  onQuickTrade: (symbol?: string) => void;
  onOpenChart: (symbol: string) => void;
  onOpenFundamentals: (symbol: string) => void;
  className?: string;
}

export function GlobalTopBar({ accountBalance, onQuickTrade, onOpenChart, onOpenFundamentals, className }: GlobalTopBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState<number | 'off'>('off');
  const [now, setNow] = useState<Date>(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Auto-update clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Persist auto-refresh selection
  useEffect(() => {
    try {
      localStorage.setItem('auto_refresh_minutes', String(autoRefresh));
    } catch {}
  }, [autoRefresh]);

  // DSE trading hours: 10:00-14:30 local time (assume Asia/Dhaka)
  const isTradingHours = (() => {
    try {
      const dhakaNow = new Date(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour12: false, hour: '2-digit', minute: '2-digit' }).format(now));
      const hours = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour12: false, hour: '2-digit' }).format(now));
      const minutes = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour12: false, minute: '2-digit' }).format(now));
      const total = hours * 60 + minutes;
      return total >= 10 * 60 && total <= 14 * 60 + 30;
    } catch {
      const h = now.getHours();
      const m = now.getMinutes();
      return h >= 10 && (h < 14 || (h === 14 && m <= 30));
    }
  })();
  const timeLabel = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'medium' }).format(now);
  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  const todayPnL = accountBalance.dayChange ?? 0;
  const todayPnLPercent = accountBalance.dayChangePercent ?? 0;

  // Handle picking chart from dropdown
  const handlePickChart = (symbol: string) => {
    onOpenChart(symbol);
    setSearchTerm('');
    setDropdownOpen(false);
  };

  // Handle picking fundamentals from dropdown
  const handlePickFundamentals = (symbol: string) => {
    onOpenFundamentals(symbol);
    setSearchTerm('');
    setDropdownOpen(false);
  };

  // Handle dropdown close
  const handleCloseDropdown = () => {
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`border-b border-sidebar-border bg-background px-6 py-3 ${className || ''}`}>
      <div className="flex items-center justify-between">
        {/* Left: Title + Time + Trading Hours */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col mr-2">
            <span className="text-sm font-semibold">Market News & Insights</span>
            <span className="text-xs text-muted-foreground">{timeLabel} · {isTradingHours ? 'Market Open (DSE)' : 'Market Closed (DSE)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Total Value</span>
              <span className="font-semibold">{formatCompactCurrency(accountBalance.totalValue)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Buying Power</span>
              <span className="font-semibold">{formatCompactCurrency(accountBalance.buyingPower)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Cash</span>
              <span className="font-semibold">{formatCompactCurrency(accountBalance.cashBalance)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {todayPnL >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Today's P&L</span>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${todayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCompactCurrency(todayPnL)}
                </span>
                <Badge variant="outline" className={`text-xs ${todayPnL >= 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}>
                  {todayPnL >= 0 ? '+' : ''}{todayPnLPercent.toFixed(2)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-8" ref={searchContainerRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <input
              type="text"
              placeholder="Search symbols by ticker or company name"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => {
                if (searchTerm.trim()) {
                  setDropdownOpen(true);
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              onKeyDown={(e) => {
                // Let dropdown handle arrow keys and enter when open
                if (dropdownOpen && searchTerm.trim() && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                  // Dropdown will handle these
                  return;
                }
                // Fallback: Enter with no dropdown opens quick trade
                if (e.key === 'Enter' && searchTerm.trim() && !dropdownOpen) {
                  onQuickTrade(searchTerm.trim().toUpperCase());
                  setSearchTerm('');
                }
              }}
            />
            
            <SymbolSearchDropdown
              query={searchTerm}
              onPickChart={handlePickChart}
              onPickFundamentals={handlePickFundamentals}
              onClose={handleCloseDropdown}
              isOpen={dropdownOpen}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="hidden md:flex items-center gap-2 mr-2">
            <span className="text-xs text-muted-foreground">Auto-refresh</span>
            <select
              value={String(autoRefresh)}
              onChange={(e) => {
                const v = e.target.value;
                setAutoRefresh(v === 'off' ? 'off' : Number(v));
              }}
              className="h-8 text-xs bg-input-background border border-border rounded px-2"
            >
              <option value="off">Off</option>
              <option value="1">1m</option>
              <option value="2">2m</option>
              <option value="5">5m</option>
            </select>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onQuickTrade()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Quick Trade
          </Button>
          
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}