import { useState } from "react";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
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
import { AccountBalance } from "../../types/trading";

interface GlobalTopBarProps {
  accountBalance: AccountBalance;
  onQuickTrade: (symbol?: string) => void;
  className?: string;
}

export function GlobalTopBar({ accountBalance, onQuickTrade, className }: GlobalTopBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  // Mock daily P&L (1.5% gain)
  const todayPnL = accountBalance.totalValue * 0.015;
  const todayPnLPercent = 1.5;

  return (
    <div className={`border-b border-sidebar-border bg-background px-6 py-3 ${className || ''}`}>
      <div className="flex items-center justify-between">
        {/* Left: Financial Metrics */}
        <div className="flex items-center gap-6">
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
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search stocks, ETFs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  onQuickTrade(searchTerm.trim().toUpperCase());
                  setSearchTerm('');
                }
              }}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
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