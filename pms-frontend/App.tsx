import { useState, useEffect, Suspense, lazy } from "react";
import { TradingSidebar } from "./components/TradingSidebar";
import { GlobalTopBar } from "./components/GlobalTopBar";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { usePortfolios } from "./hooks/usePortfolios";
import { useTrading } from "./hooks/useTrading";
import { useAuth } from "./hooks/useAuth";
import { Portfolio, Stock } from "./types/portfolio";
import {
  PieChart,
  Target,
  BookOpen,
  Calculator,
  Bell,
  ShieldCheck,
  FileText,
  Receipt,
  Activity,
  User,
  Settings,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

// Lazy-loaded page components to reduce initial bundle size
const ComprehensiveDashboard = lazy(() => import("./components/ComprehensiveDashboard").then(m => ({ default: m.ComprehensiveDashboard })));
const TradingInterface = lazy(() => import("./components/TradingInterface").then(m => ({ default: m.TradingInterface })));
const MarketData = lazy(() => import("./components/MarketData").then(m => ({ default: m.MarketData })));
const OrdersManager = lazy(() => import("./components/OrdersManager").then(m => ({ default: m.OrdersManager })));
const AccountManager = lazy(() => import("./components/AccountManager").then(m => ({ default: m.AccountManager })));
const PortfolioDashboard = lazy(() => import("./components/PortfolioDashboard").then(m => ({ default: m.PortfolioDashboard })));
const PortfolioDetail = lazy(() => import("./components/PortfolioDetail").then(m => ({ default: m.PortfolioDetail })));
const PortfolioForm = lazy(() => import("./components/PortfolioForm").then(m => ({ default: m.PortfolioForm })));
const StockForm = lazy(() => import("./components/StockForm").then(m => ({ default: m.StockForm })));
const QuickTradeDialog = lazy(() => import("./components/QuickTradeDialog").then(m => ({ default: m.QuickTradeDialog })));
const TradingViewChart = lazy(() => import("./components/TradingViewChart").then(m => ({ default: m.TradingViewChart })));
const StockScreener = lazy(() => import("./components/StockScreener").then(m => ({ default: m.StockScreener })));
const RiskAnalysis = lazy(() => import("./components/RiskAnalysis").then(m => ({ default: m.RiskAnalysis })));
const RebalancingManager = lazy(() => import("./components/RebalancingManager").then(m => ({ default: m.RebalancingManager })));
const RiskManagement = lazy(() => import("./components/RiskManagement").then(m => ({ default: m.RiskManagement })));
const SignupPage = lazy(() => import("./components/SignupPage").then(m => ({ default: m.SignupPage })));
const LoginPage = lazy(() => import("./components/LoginPage").then(m => ({ default: m.LoginPage })));
const MarketNewsInsights = lazy(() => import("./components/MarketNewsInsights").then(m => ({ default: m.default })));

type View =
  | "dashboard"
  | "portfolios"
  | "portfolio-detail"
  | "performance"
  | "allocation"
  | "goals"
  | "trading"
  | "orders"
  | "market"
  | "watchlist"
  | "screener"
  | "research"
  | "fundamentals"
  | "news"
  | "risk-analysis"
  | "correlation"
  | "rebalancing"
  | "risk-profile"
  | "reports"
  | "tax-center"
  | "statements"
  | "transactions"
  | "account"
  | "profile"
  | "settings"
  | "help"
  | "chart";

type AuthView = "login" | "signup";

export default function App() {
  // Authentication state
  const { user, isAuthenticated, isLoading: authLoading, error: authError, logout } = useAuth();
  const [authView, setAuthView] = useState<AuthView>("login");

  // Debug logging
  console.log('🏠 App render:', { 
    hasUser: !!user, 
    userName: user?.name,
    isAuthenticated, 
    authLoading, 
    hasAuthError: !!authError,
    authView
  });

  // Track authentication state changes
  useEffect(() => {
    console.log('🔄 Authentication state changed:', {
      isAuthenticated,
      hasUser: !!user,
      userName: user?.name,
      isLoading: authLoading
    });
  }, [isAuthenticated, user, authLoading]);

  // App state
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [isPortfolioFormOpen, setIsPortfolioFormOpen] = useState(false);
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [quickTradeSymbol, setQuickTradeSymbol] = useState<string | undefined>();
  const [quickTradeSide, setQuickTradeSide] = useState<"buy" | "sell" | undefined>();
  const [selectedChartStock, setSelectedChartStock] = useState<string>("AAPL");

  // Portfolio hooks
  const {
    portfolios,
    selectedPortfolio,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addStock,
    updateStock,
    removeStock,
    setSelectedPortfolioId,
    getAvailableStocks,
    portfolioSummary,
  } = usePortfolios();

  // Trading hooks
  const {
    orders,
    trades,
    watchlists,
    transactions,
    news,
    marketData,
    accountBalance,
    placeOrder,
    cancelOrder,
    addToWatchlist,
    removeFromWatchlist,
    getMarketData,
  } = useTrading();

  // Show loading screen while checking authentication
  if (authLoading) {
    console.log('⏳ Showing loading screen');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto">
            <TrendingUp className="h-7 w-7 text-primary-foreground animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">PortfolioMax</h1>
            <p className="text-muted-foreground">Loading your investment platform...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication pages if user is not logged in
  if (!isAuthenticated) {
    console.log('🔐 Showing auth pages:', { authView, hasUser: !!user, isAuthenticated });
    if (authView === "signup") {
      return <SignupPage onSwitchToLogin={() => setAuthView("login")} />;
    }
    return <LoginPage onSwitchToSignup={() => setAuthView("signup")} />;
  }

  // Show main app
  console.log('🎉 Showing main app for user:', user?.name || 'Unknown');

  // Main app handlers
  const handleViewChange = (view: string) => {
    setCurrentView(view as View);
  };

  const handleLogout = () => {
    logout();
    toast.success("Successfully signed out!");
  };

  const handleQuickTrade = (symbol?: string, side?: "buy" | "sell") => {
    setQuickTradeSymbol(symbol);
    setQuickTradeSide(side);
    setIsQuickTradeOpen(true);
  };

  const handleCreatePortfolio = () => {
    setIsPortfolioFormOpen(true);
  };

  const handlePortfolioSubmit = (
    portfolioData: Omit<Portfolio, "id" | "totalValue" | "totalCost">,
  ) => {
    addPortfolio(portfolioData);
    toast.success("Portfolio created successfully!");
  };

  const handleSelectPortfolio = (portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id);
    setCurrentView("portfolio-detail");
  };

  const handleBackToPortfolios = () => {
    setCurrentView("portfolios");
  };

  const handleAddStock = () => {
    setEditingStock(null);
    setIsStockFormOpen(true);
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setIsStockFormOpen(true);
  };

  const handleStockSubmit = (stockData: Omit<Stock, "id">) => {
    if (!selectedPortfolio) return;

    if (editingStock) {
      updateStock(selectedPortfolio.id, editingStock.id, stockData);
      toast.success("Stock position updated successfully!");
    } else {
      addStock(selectedPortfolio.id, stockData);
      toast.success("Stock position added successfully!");
    }
  };

  const handleDeleteStock = (stockId: string) => {
    if (!selectedPortfolio) return;

    if (confirm("Are you sure you want to remove this stock position?")) {
      removeStock(selectedPortfolio.id, stockId);
      toast.success("Stock position removed successfully!");
    }
  };

  const handlePlaceOrder = (orderData: any) => {
    const orderId = placeOrder(orderData);
    toast.success(`Order placed successfully! Order ID: ${orderId.slice(0, 8)}...`);
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelOrder(orderId);
      toast.success("Order cancelled successfully!");
    }
  };

  const handleChartStock = (symbol: string) => {
    setSelectedChartStock(symbol);
    setCurrentView("chart");
  };

  const getPageTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard";
      case "portfolios":
        return "My Portfolios";
      case "portfolio-detail":
        return "Portfolio Details";
      case "performance":
        return "Portfolio Performance Analytics";
      case "allocation":
        return "Asset Allocation Analysis";
      case "goals":
        return "Investment Goals Tracker";
      case "trading":
        return "Trading Interface";
      case "orders":
        return "Orders & Trades";
      case "market":
        return "Market Data";
      case "watchlist":
        return "Watchlists";
      case "screener":
        return "Stock Screener";
      case "research":
        return "Research & Analysis";
      case "fundamentals":
        return "Fundamental Analysis";
      case "news":
        return "Market News & Insights";
      case "risk-analysis":
        return "Risk Management";
      case "correlation":
        return "Correlation Analysis";
      case "rebalancing":
        return "Portfolio Rebalancing";
      case "risk-profile":
        return "Risk Profile Assessment";
      case "reports":
        return "Portfolio Reports";
      case "tax-center":
        return "Tax Center";
      case "statements":
        return "Account Statements";
      case "transactions":
        return "Transaction History";
      case "account":
        return "Account Management";
      case "profile":
        return "User Profile & KYC";
      case "settings":
        return "Platform Settings";
      case "help":
        return "Help & Support";
      case "chart":
        return "Chart Analysis";
      default:
        return "Dashboard";
    }
  };

  const getPageDescription = () => {
    switch (currentView) {
      case "dashboard":
        return "Comprehensive view of your investment portfolio and financial goals";
      case "portfolios":
        return "Manage and monitor your investment portfolios";
      case "performance":
        return "Detailed performance analysis with benchmarking, attribution, and risk-adjusted returns";
      case "allocation":
        return "Interactive asset allocation breakdown with rebalancing recommendations";
      case "goals":
        return "Track progress towards your financial goals with automated recommendations";
      case "trading":
        return "Execute trades with market, limit, and stop orders";
      case "orders":
        return "View and manage your order history and active trades";
      case "market":
        return "Real-time market data, news, and watchlists";
      case "watchlist":
        return "Organize and monitor stocks you're interested in with custom watchlists";
      case "screener":
        return "Find stocks that match your investment criteria using fundamental and technical filters";
      case "research":
        return "Advanced charting and technical analysis tools";
      case "fundamentals":
        return "Deep dive into company financials, ratios, and valuation metrics";
      case "news":
        return "Stay updated with market news, analyst reports, and investment insights";
      case "risk-analysis":
        return "Comprehensive risk monitoring and analysis for your portfolio";
      case "correlation":
        return "Analyze correlations between portfolio holdings to identify concentration risks";
      case "rebalancing":
        return "Maintain your target allocation with intelligent rebalancing recommendations";
      case "risk-profile":
        return "Update your risk tolerance and investment objectives";
      case "reports":
        return "Generate comprehensive portfolio reports and performance summaries";
      case "tax-center":
        return "Tax-loss harvesting, capital gains analysis, and tax-efficient strategies";
      case "statements":
        return "Download monthly and annual account statements";
      case "transactions":
        return "Complete history of all account transactions and transfers";
      case "account":
        return "Manage your account details, balances, and settings";
      case "profile":
        return "Manage your personal information, documents, and KYC compliance";
      case "settings":
        return "Customize your platform experience, notifications, and preferences";
      case "help":
        return "Documentation, tutorials, and customer support resources";
      case "chart":
        return "Advanced charting with technical indicators and drawing tools";
      default:
        return "Comprehensive view of your investment portfolio and financial goals";
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Suspense fallback={<div>Loading Comprehensive Dashboard...</div>}>
            <ComprehensiveDashboard
              accountBalance={accountBalance}
              recentOrders={orders.slice(0, 5)}
              recentTransactions={transactions.slice(0, 5)}
              news={news}
              marketData={marketData}
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
              onNavigate={handleViewChange}
              selectedPortfolioId={selectedPortfolio?.id}
            />
          </Suspense>
        );

      case "portfolios":
        return (
          <Suspense fallback={<div>Loading Portfolio Dashboard...</div>}>
            <PortfolioDashboard
              onCreatePortfolio={handleCreatePortfolio}
              onSelectPortfolio={handleSelectPortfolio}
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
              portfolios={portfolios}
              portfolioSummary={portfolioSummary}
            />
          </Suspense>
        );

      case "portfolio-detail":
        return selectedPortfolio ? (
          <Suspense fallback={<div>Loading Portfolio Detail...</div>}>
            <PortfolioDetail
              portfolio={selectedPortfolio}
              onBack={handleBackToPortfolios}
              onAddStock={handleAddStock}
              onEditStock={handleEditStock}
              onDeleteStock={handleDeleteStock}
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
            />
          </Suspense>
        ) : null;

      case "performance":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {marketData.slice(0, 3).map((stock) => (
                <TradingViewChart
                  key={stock.symbol}
                  stock={stock}
                  onQuickTrade={handleQuickTrade}
                  className="h-80"
                />
              ))}
            </div>
          </div>
        );

      case "allocation":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PieChart className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Interactive asset allocation visualization with detailed breakdown and rebalancing
                suggestions coming soon.
              </p>
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Goal-based investment planning and progress tracking tools coming soon.
              </p>
            </div>
          </div>
        );

      case "trading":
        return (
          <Suspense fallback={<div>Loading Trading Interface...</div>}>
            <TradingInterface
              marketData={marketData}
              onPlaceOrder={handlePlaceOrder}
              buyingPower={accountBalance.buyingPower}
            />
          </Suspense>
        );

      case "orders":
        return (
          <Suspense fallback={<div>Loading Orders Manager...</div>}>
            <OrdersManager orders={orders} trades={trades} onCancelOrder={handleCancelOrder} />
          </Suspense>
        );

      case "market":
        return (
          <Suspense fallback={<div>Loading Market Data...</div>}>
            <MarketData
              marketData={marketData}
              watchlists={watchlists}
              news={news}
              onAddToWatchlist={addToWatchlist}
              onRemoveFromWatchlist={removeFromWatchlist}
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
            />
          </Suspense>
        );

      case "watchlist":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Custom watchlist management and advanced stock monitoring tools coming soon.
              </p>
            </div>
          </div>
        );

      case "screener":
        return (
          <Suspense fallback={<div>Loading Stock Screener...</div>}>
            <StockScreener
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
              onAddToWatchlist={addToWatchlist}
            />
          </Suspense>
        );

      case "research":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {marketData.slice(0, 4).map((stock) => (
                <TradingViewChart
                  key={stock.symbol}
                  stock={stock}
                  onQuickTrade={handleQuickTrade}
                />
              ))}
            </div>
          </div>
        );

      case "fundamentals":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Comprehensive fundamental analysis tools with financial ratios and valuation models
                coming soon.
              </p>
            </div>
          </div>
        );

      case "news":
        return (
          <Suspense fallback={<div>Loading Market News & Insights...</div>}>
            <MarketNewsInsights />
          </Suspense>
        );

      case "risk-analysis":
        return (
          <Suspense fallback={<div>Loading Risk Analysis...</div>}>
            <RiskAnalysis onNavigate={handleViewChange} onQuickTrade={handleQuickTrade} />
          </Suspense>
        );

      case "correlation":
        return (
          <Suspense fallback={<div>Loading Risk Management...</div>}>
            <RiskManagement
              onNavigate={handleViewChange}
              onQuickTrade={handleQuickTrade}
              defaultTab="correlation"
            />
          </Suspense>
        );

      case "rebalancing":
        return (
          <Suspense fallback={<div>Loading Rebalancing Manager...</div>}>
            <RebalancingManager onNavigate={handleViewChange} onQuickTrade={handleQuickTrade} />
          </Suspense>
        );

      case "risk-profile":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Interactive risk assessment questionnaire and profile management coming soon.
              </p>
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Automated report generation with customizable templates and scheduling coming soon.
              </p>
            </div>
          </div>
        );

      case "tax-center":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Advanced tax optimization tools with automated harvesting and gain-loss analysis
                coming soon.
              </p>
            </div>
          </div>
        );

      case "statements":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Digital statement management with download and email delivery options coming soon.
              </p>
            </div>
          </div>
        );

      case "transactions":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Advanced transaction search and filtering with export capabilities coming soon.
              </p>
            </div>
          </div>
        );

      case "account":
        return (
          <Suspense fallback={<div>Loading Account Manager...</div>}>
            <AccountManager user={user} accountBalance={accountBalance} transactions={transactions} />
          </Suspense>
        );

      case "profile":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Comprehensive profile management with document upload and KYC verification coming
                soon.
              </p>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Personalized platform settings with notification preferences and theme customization
                coming soon.
              </p>
            </div>
          </div>
        );

      case "help":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                Interactive help center with live chat support and comprehensive documentation coming
                soon.
              </p>
            </div>
          </div>
        );

      case "chart":
        const chartStock = getMarketData(selectedChartStock);
        return chartStock ? (
          <div className="space-y-6">
            <TradingViewChart stock={chartStock} onQuickTrade={handleQuickTrade} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {marketData
                .filter((s) => s.symbol !== selectedChartStock)
                .slice(0, 3)
                .map((stock) => (
                  <TradingViewChart
                    key={stock.symbol}
                    stock={stock}
                    onQuickTrade={handleQuickTrade}
                    className="h-64"
                  />
                ))}
            </div>
          </div>
        ) : null;

      default:
        return (
          <Suspense fallback={<div>Loading Comprehensive Dashboard...</div>}>
            <ComprehensiveDashboard
              accountBalance={accountBalance}
              recentOrders={orders.slice(0, 5)}
              recentTransactions={transactions.slice(0, 5)}
              news={news}
              marketData={marketData}
              onQuickTrade={handleQuickTrade}
              onChartStock={handleChartStock}
              onNavigate={handleViewChange}
              selectedPortfolioId={selectedPortfolio?.id}
            />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <TradingSidebar 
        currentView={currentView} 
        onViewChange={handleViewChange} 
        user={user} 
        onLogout={handleLogout}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <GlobalTopBar accountBalance={accountBalance} onQuickTrade={handleQuickTrade} />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-foreground mb-2">{getPageTitle()}</h1>
              <p className="text-muted-foreground text-lg">{getPageDescription()}</p>
            </div>

            {/* Page Content */}
            {renderContent()}
          </div>
        </div>
      </div>

      <PortfolioForm
        open={isPortfolioFormOpen}
        onOpenChange={setIsPortfolioFormOpen}
        onSubmit={handlePortfolioSubmit}
      />

      <StockForm
        open={isStockFormOpen}
        onOpenChange={setIsStockFormOpen}
        onSubmit={handleStockSubmit}
        initialData={editingStock || undefined}
        availableStocks={marketData}
      />

      <QuickTradeDialog
        open={isQuickTradeOpen}
        onOpenChange={(open) => {
          setIsQuickTradeOpen(open);
          if (!open) {
            setQuickTradeSymbol(undefined);
            setQuickTradeSide(undefined);
          }
        }}
        onPlaceOrder={handlePlaceOrder}
        marketData={marketData}
        buyingPower={accountBalance.buyingPower}
        initialSymbol={quickTradeSymbol}
      />

      <Toaster />
    </div>
  );
}