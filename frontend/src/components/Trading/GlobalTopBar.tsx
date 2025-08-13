import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
  Zap,
  Target,
  Rocket,
  Crown,
  Hexagon,
  Star,
  Activity
} from "lucide-react";
import { AccountBalance } from "@/types/trading";

interface GlobalTopBarProps {
  accountBalance: AccountBalance;
  onQuickTrade: (symbol?: string) => void;
  className?: string;
}

export function GlobalTopBar({ accountBalance, onQuickTrade, className }: GlobalTopBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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
    <div 
      className={`relative overflow-hidden ${className || ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900">
        {/* Floating Geometric Shapes */}
        <div className="absolute top-4 left-10 w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-8 right-20 w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-bounce opacity-40"></div>
        <div className="absolute top-12 left-1/3 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 transform rotate-45 opacity-30 animate-ping"></div>
        <div className="absolute top-6 right-1/4 w-1 h-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-50"></div>
        
        {/* Hexagonal Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-white transform rotate-45 opacity-20"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Floating Metrics Cards */}
          <div className="flex items-center gap-6">
            {/* Total Value - Floating Card with Glow */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative p-4 bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl hover:border-cyan-400/40 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    <DollarSign className="h-4 w-4 text-white relative z-10" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-cyan-300">Total Value</span>
                    <span className="font-bold text-white text-lg">{formatCompactCurrency(accountBalance.totalValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buying Power - Neon Glow Effect */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative p-4 bg-black/40 backdrop-blur-xl border border-emerald-500/20 rounded-2xl hover:border-emerald-400/40 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    <Rocket className="h-4 w-4 text-white relative z-10" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-emerald-300">Buying Power</span>
                    <span className="font-bold text-white text-lg">{formatCompactCurrency(accountBalance.buyingPower)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash - Diamond Effect */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative p-4 bg-black/40 backdrop-blur-xl border border-purple-500/20 rounded-2xl hover:border-purple-400/40 transition-all duration-300 hover:scale-105">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-xl relative overflow-hidden transform rotate-45">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    <Hexagon className="h-4 w-4 text-white relative z-10 transform -rotate-45" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-purple-300">Cash</span>
                    <span className="font-bold text-white text-lg">{formatCompactCurrency(accountBalance.cashBalance)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* P&L - Animated Pulse */}
            <div className="group relative">
              <div className={`absolute -inset-1 rounded-2xl blur transition duration-300 ${
                todayPnL >= 0 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 opacity-30 group-hover:opacity-50' 
                  : 'bg-gradient-to-r from-red-500 to-rose-500 opacity-30 group-hover:opacity-50'
              }`}></div>
              <div className={`relative p-4 bg-black/40 backdrop-blur-xl border rounded-2xl transition-all duration-300 hover:scale-105 ${
                todayPnL >= 0 
                  ? 'border-emerald-500/20 hover:border-emerald-400/40' 
                  : 'border-red-500/20 hover:border-red-400/40'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl relative overflow-hidden ${
                    todayPnL >= 0 
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500' 
                      : 'bg-gradient-to-r from-red-400 to-rose-500'
                  }`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    {todayPnL >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-white relative z-10" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-white relative z-10" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-300">Today's P&L</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${todayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCompactCurrency(todayPnL)}
                      </span>
                      <Badge className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                        todayPnL >= 0 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' 
                          : 'bg-red-500/20 text-red-300 border-red-400/30'
                      }`}>
                        {todayPnL >= 0 ? '+' : ''}{todayPnLPercent.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Floating Search Orb */}
          <div className="flex-1 max-w-lg mx-8 relative">
            <div className="relative group">
              {/* Orb Glow Effect */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
              
              {/* Search Container */}
              <div className="relative bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-full hover:border-blue-400/40 transition-all duration-300">
                <div className="flex items-center px-6 py-4">
                  <div className="p-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mr-4">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search the universe of stocks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent text-white placeholder:text-slate-400 focus:outline-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        onQuickTrade(searchTerm.trim().toUpperCase());
                        setSearchTerm('');
                      }
                    }}
                  />
                  <div className="ml-4 p-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full">
                    <Star className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons with Unique Effects */}
          <div className="flex items-center gap-4">
            {/* Quick Trade - Lightning Effect */}
            <Button
              onClick={() => onQuickTrade()}
              className="relative group overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 text-white font-bold px-8 py-4 rounded-full shadow-2xl shadow-orange-500/25 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/40"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              <div className="relative flex items-center gap-2">
                <Zap className="h-5 w-5 animate-pulse" />
                <span>Quick Trade</span>
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </Button>
            
            {/* Notification - Orbital Effect */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative h-12 w-12 p-0 rounded-full bg-black/40 backdrop-blur-xl border border-pink-500/20 hover:border-pink-400/40 transition-all duration-300 hover:scale-110"
              >
                <Bell className="h-5 w-5 text-pink-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </Button>
            </div>
            
            {/* Settings - Rotating Gear */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative h-12 w-12 p-0 rounded-full bg-black/40 backdrop-blur-xl border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:scale-110 group-hover:rotate-180"
              >
                <Settings className="h-5 w-5 text-cyan-300" />
              </Button>
            </div>

            {/* Crown Badge - Floating */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <div className="relative p-2 bg-black/40 backdrop-blur-xl border border-yellow-500/20 rounded-full hover:border-yellow-400/40 transition-all duration-300 hover:scale-110">
                <Crown className="h-5 w-5 text-yellow-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 animate-pulse"></div>
    </div>
  );
}