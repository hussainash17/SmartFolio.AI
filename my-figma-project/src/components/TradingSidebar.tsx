import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Wallet, 
  Search, 
  FileText, 
  Settings, 
  User,
  LogOut,
  PieChart,
  Activity,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Hexagon,
  Star,
  Target,
  Shield,
  Globe,
  Brain,
  Atom,
  Infinity,
  Moon,
  Sun,
  ArrowRight
} from "lucide-react";

interface TradingSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    accountNumber: string;
  };
}

export function TradingSidebar({ currentView, onViewChange, user }: TradingSidebarProps) {
  const navigation = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-cyan-400 to-blue-500', glow: 'cyan' },
    { id: 'trading', label: 'Trading', icon: TrendingUp, color: 'from-emerald-400 to-green-500', glow: 'emerald' },
    { id: 'portfolios', label: 'Portfolios', icon: PieChart, color: 'from-purple-400 to-violet-500', glow: 'purple' },
    { id: 'market', label: 'Market Data', icon: Activity, color: 'from-orange-400 to-red-500', glow: 'orange' },
    { id: 'orders', label: 'Orders', icon: FileText, color: 'from-pink-400 to-rose-500', glow: 'pink' },
    { id: 'account', label: 'Account', icon: Wallet, color: 'from-yellow-400 to-amber-500', glow: 'yellow' },
  ];

  const secondaryNavigation = [
    { id: 'research', label: 'Research', icon: Search, color: 'from-indigo-400 to-blue-500', glow: 'indigo' },
    { id: 'settings', label: 'Settings', icon: Settings, color: 'from-slate-400 to-gray-500', glow: 'slate' },
    { id: 'profile', label: 'Profile', icon: User, color: 'from-teal-400 to-cyan-500', glow: 'teal' },
  ];

  return (
    <div className="relative flex h-screen w-80 flex-col overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-purple-900/50 to-slate-900">
        {/* Floating Cosmic Elements */}
        <div className="absolute top-20 left-8 w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse opacity-60"></div>
        <div className="absolute top-40 right-12 w-1 h-1 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full animate-bounce opacity-40"></div>
        <div className="absolute top-60 left-16 w-3 h-3 bg-gradient-to-r from-emerald-400 to-green-500 transform rotate-45 opacity-30 animate-ping"></div>
        <div className="absolute top-80 right-8 w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute top-96 left-12 w-1 h-1 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full animate-bounce opacity-30"></div>
        
        {/* Geometric Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-6 gap-8 h-full">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-3 h-3 bg-white transform rotate-45 opacity-20"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header - Floating Logo */}
        <div className="p-8 border-b border-slate-700/20">
          <div className="relative group">
            {/* Logo Glow Effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            
            <div className="relative flex items-center gap-4 p-4 bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl hover:border-blue-400/40 transition-all duration-300">
              <div className="relative p-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <Sparkles className="h-6 w-6 text-white relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  TradePro
                </h1>
                <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
                  <Atom className="h-3 w-3" />
                  AI Trading Platform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info - Cosmic Profile */}
        <div className="px-8 py-6 border-b border-slate-700/20">
          <div className="relative group">
            {/* Profile Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
            
            <div className="relative p-4 bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl hover:border-cyan-400/40 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-cyan-500/30">
                    <AvatarFallback className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                    {user.firstName} {user.lastName}
                    <Crown className="h-3 w-3 text-yellow-400" />
                  </p>
                  <p className="text-xs text-slate-300 truncate flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {user.accountNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation - Floating Orbs */}
        <nav className="flex-1 p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-3">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Navigation
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <div key={item.id} className="relative group">
                    {/* Button Glow */}
                    <div className={`absolute -inset-1 rounded-2xl blur transition duration-300 ${
                      isActive 
                        ? `bg-gradient-to-r ${item.color} opacity-40` 
                        : `bg-gradient-to-r ${item.color} opacity-20 group-hover:opacity-30`
                    }`}></div>
                    
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative w-full justify-start gap-4 h-14 px-4 rounded-2xl transition-all duration-300 group",
                        isActive
                          ? "bg-black/60 text-white border border-white/20 shadow-lg"
                          : "text-slate-300 hover:bg-black/40 hover:text-white hover:border-white/10"
                      )}
                      onClick={() => onViewChange(item.id)}
                    >
                      <div className={`p-2 rounded-xl relative overflow-hidden ${
                        isActive 
                          ? `bg-gradient-to-r ${item.color}` 
                          : `bg-gradient-to-r ${item.color} opacity-60 group-hover:opacity-80`
                      }`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        <Icon className="h-5 w-5 text-white relative z-10" />
                      </div>
                      <span className="font-semibold">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <Star className="h-3 w-3 text-yellow-400 animate-pulse" />
                        </div>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tools Section */}
          <div className="pt-6 mt-6 border-t border-slate-700/20 space-y-4">
            <div className="flex items-center gap-3 px-3">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full animate-pulse"></div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Tools
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-600/50 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <div key={item.id} className="relative group">
                    {/* Button Glow */}
                    <div className={`absolute -inset-1 rounded-2xl blur transition duration-300 ${
                      isActive 
                        ? `bg-gradient-to-r ${item.color} opacity-40` 
                        : `bg-gradient-to-r ${item.color} opacity-20 group-hover:opacity-30`
                    }`}></div>
                    
                    <Button
                      variant="ghost"
                      className={cn(
                        "relative w-full justify-start gap-4 h-12 px-4 rounded-2xl transition-all duration-300 group",
                        isActive
                          ? "bg-black/60 text-white border border-white/20 shadow-lg"
                          : "text-slate-300 hover:bg-black/40 hover:text-white hover:border-white/10"
                      )}
                      onClick={() => onViewChange(item.id)}
                    >
                      <div className={`p-2 rounded-xl relative overflow-hidden ${
                        isActive 
                          ? `bg-gradient-to-r ${item.color}` 
                          : `bg-gradient-to-r ${item.color} opacity-60 group-hover:opacity-80`
                      }`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        <Icon className="h-4 w-4 text-white relative z-10" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Footer - Floating Sign Out */}
        <div className="p-8 border-t border-slate-700/20">
          <div className="relative group">
            {/* Sign Out Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
            
            <Button
              variant="ghost"
              className="relative w-full justify-start gap-4 h-14 px-4 rounded-2xl text-slate-300 hover:bg-black/40 hover:text-red-400 hover:border-red-500/30 transition-all duration-300 group"
            >
              <div className="p-2 bg-gradient-to-r from-red-400 to-rose-500 rounded-xl relative overflow-hidden opacity-60 group-hover:opacity-80">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <LogOut className="h-5 w-5 text-white relative z-10" />
              </div>
              <span className="font-semibold">Sign Out</span>
              <div className="ml-auto">
                <ArrowRight className="h-4 w-4 text-red-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Animated Right Border */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-purple-500 to-pink-500 animate-pulse"></div>
    </div>
  );
}