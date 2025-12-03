import { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Search,
  Bell,
  Settings,
  HelpCircle,
  User,
  LogOut,
  ChevronDown
} from "lucide-react";
import { AccountBalance } from "../types/trading";
import { AuthUser } from "../hooks/useAuth";
import { SymbolSearchDropdown } from "./SymbolSearchDropdown";
import { formatCurrency } from "../lib/utils";

interface GlobalTopBarProps {
  accountBalance: AccountBalance;
  onQuickTrade: (symbol?: string) => void;
  onOpenChart: (symbol: string) => void;
  onOpenFundamentals: (symbol: string) => void;
  onViewChange?: (view: string) => void;
  user: AuthUser | null;
  onLogout?: () => void;
  className?: string;
}

export function GlobalTopBar({ accountBalance, onQuickTrade, onOpenChart, onOpenFundamentals, onViewChange, user, onLogout, className }: GlobalTopBarProps) {
  const getUserInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserName = () => user?.name || 'User';
  const getUserEmail = () => user?.email || 'user@example.com';
  const [searchTerm, setSearchTerm] = useState('');
  const [now, setNow] = useState<Date>(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Auto-update clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
          <div className="relative w-full overflow-visible">
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

        {/* Right: Actions & User Menu */}
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

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="h-9 px-2 gap-2 hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                  <AvatarImage src="" alt={getUserName()} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                    {getUserInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium text-foreground max-w-[100px] truncate">
                  {getUserName()}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline-block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src="" alt={getUserName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getUserInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getUserName()}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getUserEmail()}
                    </p>
                  </div>
                </div>
              </div>
              <DropdownMenuItem onClick={() => onViewChange?.('account')}>
                <User className="h-4 w-4 mr-2" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange?.('settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange?.('help')}>
                <HelpCircle className="h-4 w-4 mr-2" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  if (confirm('Are you sure you want to sign out?')) {
                    onLogout?.();
                  }
                }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}