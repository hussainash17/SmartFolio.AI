import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useRouterState } from "@tanstack/react-router";
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
  user: {
    firstName: string;
    lastName: string;
    email: string;
    accountNumber: string;
  };
}

export function TradingSidebar({ user }: TradingSidebarProps) {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const navigation = [
    { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard, color: 'from-cyan-400 to-blue-500', glow: 'cyan' },
    { id: 'trading', label: 'Trading', href: '/trading', icon: TrendingUp, color: 'from-emerald-400 to-green-500', glow: 'emerald' },
    { id: 'portfolio', label: 'Portfolio', href: '/portfolio', icon: PieChart, color: 'from-purple-400 to-violet-500', glow: 'purple' },
    { id: 'market', label: 'Market Data', href: '/market', icon: Activity, color: 'from-orange-400 to-red-500', glow: 'orange' },
    { id: 'orders', label: 'Orders', href: '/orders', icon: FileText, color: 'from-pink-400 to-rose-500', glow: 'pink' },
    { id: 'account', label: 'Account', href: '/account', icon: Wallet, color: 'from-yellow-400 to-amber-500', glow: 'yellow' },
  ];

  const researchTools = [
    { id: 'research', label: 'Research', href: '/research', icon: Search, color: 'from-indigo-400 to-purple-500', glow: 'indigo' },
    { id: 'fundamentals', label: 'Fundamentals', href: '/fundamentals', icon: Brain, color: 'from-blue-400 to-indigo-500', glow: 'blue' },
    { id: 'news', label: 'News & Insights', href: '/news', icon: Globe, color: 'from-green-400 to-emerald-500', glow: 'green' },
  ];

  const riskManagement = [
    { id: 'risk-analysis', label: 'Risk Analysis', href: '/risk', icon: Shield, color: 'from-red-400 to-pink-500', glow: 'red' },
    { id: 'correlation', label: 'Correlation', href: '/correlation', icon: Atom, color: 'from-violet-400 to-purple-500', glow: 'violet' },
    { id: 'rebalancing', label: 'Rebalancing', href: '/rebalancing', icon: Target, color: 'from-orange-400 to-yellow-500', glow: 'orange' },
  ];

  const settings = [
    { id: 'profile', label: 'Profile & KYC', href: '/profile', icon: User, color: 'from-gray-400 to-slate-500', glow: 'gray' },
    { id: 'settings', label: 'Settings', href: '/settings', icon: Settings, color: 'from-slate-400 to-gray-500', glow: 'slate' },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return currentPath === '/';
    }
    return currentPath.startsWith(href);
  };

  const getIconColor = (item: any, isCurrentActive: boolean) => {
    if (isCurrentActive) {
      return `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-${item.glow}-500/25`;
    }
    return 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white';
  };

  const getTextColor = (item: any, isCurrentActive: boolean) => {
    if (isCurrentActive) {
      return 'text-white font-semibold';
    }
    return 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white';
  };

  return (
    <div className="flex flex-col h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">SmartStock</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Trading Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-8">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Trading
            </h3>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isCurrentActive = isActive(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg mr-3 transition-all duration-200",
                      getIconColor(item, isCurrentActive)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "transition-colors duration-200",
                      getTextColor(item, isCurrentActive)
                    )}>
                      {item.label}
                    </span>
                    {isCurrentActive && (
                      <div className="ml-auto">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Research Tools */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Research & Analysis
            </h3>
            <nav className="space-y-1">
              {researchTools.map((item) => {
                const isCurrentActive = isActive(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg mr-3 transition-all duration-200",
                      getIconColor(item, isCurrentActive)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "transition-colors duration-200",
                      getTextColor(item, isCurrentActive)
                    )}>
                      {item.label}
                    </span>
                    {isCurrentActive && (
                      <div className="ml-auto">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Risk Management */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Risk Management
            </h3>
            <nav className="space-y-1">
              {riskManagement.map((item) => {
                const isCurrentActive = isActive(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg mr-3 transition-all duration-200",
                      getIconColor(item, isCurrentActive)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "transition-colors duration-200",
                      getTextColor(item, isCurrentActive)
                    )}>
                      {item.label}
                    </span>
                    {isCurrentActive && (
                      <div className="ml-auto">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              Account
            </h3>
            <nav className="space-y-1">
              {settings.map((item) => {
                const isCurrentActive = isActive(item.href);
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg mr-3 transition-all duration-200",
                      getIconColor(item, isCurrentActive)
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "transition-colors duration-200",
                      getTextColor(item, isCurrentActive)
                    )}>
                      {item.label}
                    </span>
                    {isCurrentActive && (
                      <div className="ml-auto">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              #{user.accountNumber}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}