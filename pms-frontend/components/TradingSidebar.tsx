import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Search,
  ShieldCheck,
  FileText,
  Target,
  BarChart3,
  Activity,
  AlertTriangle,
  Calculator,
  Bell,
  LogOut,
  Briefcase,
  DollarSign,
  LineChart,
  BookOpen,
  Receipt,
  Shield,
  ChevronRight,
  Menu,
  X,
  Lightbulb
} from "lucide-react";
import { AuthUser } from "../hooks/useAuth";

interface TradingSidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: AuthUser | null;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  isNew?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function TradingSidebar({ currentView, onViewChange, user, onLogout }: TradingSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
      ]
    },
    {
      title: "Portfolio",
      items: [
        { id: 'portfolios', label: 'My Portfolios', icon: <Briefcase className="h-5 w-5" /> },
        { id: 'performance', label: 'Performance', icon: <TrendingUp className="h-5 w-5" /> },
        { id: 'allocation', label: 'Asset Allocation', icon: <PieChart className="h-5 w-5" /> },
        { id: 'goals', label: 'Investment Goals', icon: <Target className="h-5 w-5" /> },
        { id: 'watchlist', label: 'Watchlists', icon: <BookOpen className="h-5 w-5" /> }
      ]
    },
    // {
    //   title: "Trading",
    //   items: [
    //     { id: 'trading', label: 'Trade', icon: <DollarSign className="h-5 w-5" /> },
    //     { id: 'market', label: 'Market Data', icon: <BarChart3 className="h-5 w-5" /> },
    //     { id: 'watchlist', label: 'Watchlists', icon: <BookOpen className="h-5 w-5" /> },
    //   ]
    // },
    {
      title: "Research",
      items: [
        { id: 'screener', label: 'Stock Screener', icon: <Search className="h-5 w-5" /> },
        { id: 'research', label: 'Analysis Tools', icon: <LineChart className="h-5 w-5" /> },
        { id: 'fundamentals', label: 'Fundamentals', icon: <Calculator className="h-5 w-5" /> },
        { id: 'news', label: 'News & Insights', icon: <Bell className="h-5 w-5" />, badge: '3' },
        { id: 'ideas', label: 'Trading Ideas', icon: <Lightbulb className="h-5 w-5" />, isNew: true },
      ]
    },
    {
      title: "Risk & Reports",
      items: [
        { id: 'risk-analysis', label: 'Risk Management', icon: <Shield className="h-5 w-5" /> },
        { id: 'rebalancing', label: 'Rebalancing', icon: <AlertTriangle className="h-5 w-5" />, badge: '!' },
        { id: 'reports', label: 'Reports', icon: <FileText className="h-5 w-5" /> },
        { id: 'tax-center', label: 'Tax Center', icon: <Receipt className="h-5 w-5" />, isNew: true },
      ]
    }
  ];

  const bottomNavItems: NavItem[] = [];


  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out?')) {
      onLogout();
    }
  };

  const NavItemComponent = ({ item, isActive }: { item: NavItem; isActive: boolean }) => {
    return (
      <div className="relative group">
        <Button
          variant={isActive ? "default" : "ghost"}
          onClick={() => onViewChange(item.id)}
          className={`w-full justify-start h-12 px-4 mb-1 ${isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground'
            } ${isCollapsed ? 'px-2' : ''}`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
            <div className="shrink-0">{item.icon}</div>
            {!isCollapsed && (
              <>
                <span className="truncate text-sm font-medium">{item.label}</span>
                <div className="ml-auto flex items-center gap-2">
                  {item.isNew && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 border-green-200">
                      New
                    </Badge>
                  )}
                  {item.badge && !item.isNew && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </Button>

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
            {item.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-full bg-card border-r border-border flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">SmartFolio.AI</h3>
                <p className="text-xs text-muted-foreground">Investment Platform</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-3">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title} className="mb-6">
              {!isCollapsed && (
                <div className="px-3 mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h4>
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavItemComponent
                    key={item.id}
                    item={item}
                    isActive={currentView === item.id}
                  />
                ))}
              </div>
              {sectionIndex < navigationSections.length - 1 && !isCollapsed && (
                <Separator className="mt-4 mx-3" />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Navigation - Sign Out */}
      <div className="border-t border-border p-3">
        <div className="relative group">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full justify-start h-12 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 ${isCollapsed ? 'px-2' : ''
              }`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} w-full`}>
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
            </div>
          </Button>

          {/* Tooltip for collapsed sign out */}
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
              Sign Out
            </div>
          )}
        </div>
      </div>
    </div>
  );
}