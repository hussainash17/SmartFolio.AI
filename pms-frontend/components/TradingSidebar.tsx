import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  LayoutDashboard, 
  PieChart, 
  TrendingUp, 
  Search,
  ShieldCheck,
  FileText,
  Settings,
  User,
  Target,
  BarChart3,
  Activity,
  AlertTriangle,
  Calculator,
  Bell,
  HelpCircle,
  LogOut,
  Briefcase,
  DollarSign,
  LineChart,
  BookOpen,
  Receipt,
  Shield,
  ChevronRight,
  Menu,
  X
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
      ]
    },
    {
      title: "Trading",
      items: [
        { id: 'trading', label: 'Trade', icon: <DollarSign className="h-5 w-5" /> },
        { id: 'orders', label: 'Orders & Trades', icon: <Activity className="h-5 w-5" /> },
        { id: 'market', label: 'Market Data', icon: <BarChart3 className="h-5 w-5" /> },
        { id: 'watchlist', label: 'Watchlists', icon: <BookOpen className="h-5 w-5" /> },
      ]
    },
    {
      title: "Research",
      items: [
        { id: 'screener', label: 'Stock Screener', icon: <Search className="h-5 w-5" /> },
        { id: 'research', label: 'Analysis Tools', icon: <LineChart className="h-5 w-5" /> },
        { id: 'fundamentals', label: 'Fundamentals', icon: <Calculator className="h-5 w-5" /> },
        { id: 'news', label: 'News & Insights', icon: <Bell className="h-5 w-5" />, badge: '3' },
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

  const bottomNavItems = [
    { id: 'account', label: 'Account', icon: <User className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle className="h-5 w-5" /> },
  ];

  const getUserInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserName = () => user?.name || 'User';
  const getUserEmail = () => user?.email || 'user@example.com';
  const getUserAccountType = () => 'Individual'; // Default for AuthUser
  const getVerifiedStatus = () => user?.isVerified ? 'Verified' : 'Pending';

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
          className={`w-full justify-start h-12 px-4 mb-1 ${
            isActive
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
    <div className={`${isCollapsed ? 'w-20' : 'w-72'} h-full bg-card border-r border-border flex flex-col transition-all duration-300`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">PortfolioMax</h3>
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

      {/* User Profile */}
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <Card className="p-4 bg-accent/50 border-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarImage src="" alt={getUserName()} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getUserInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {getUserName()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {getUserEmail()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize">
                    {getUserAccountType()}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2 py-0.5 ${
                      user?.isVerified 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}
                  >
                    {user?.isVerified ? '✓ Verified' : '⏳ Pending'}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

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

      {/* Bottom Navigation */}
      <div className="border-t border-border p-3 space-y-2">
        {bottomNavItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            isActive={currentView === item.id}
          />
        ))}
        
        <Separator className="my-3" />
        
        <div className="relative group">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className={`w-full justify-start h-12 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 ${
              isCollapsed ? 'px-2' : ''
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