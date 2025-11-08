import {lazy, startTransition, Suspense, useEffect, useMemo, useState} from "react";
import {TradingSidebar} from "./components/TradingSidebar";
import {GlobalTopBar} from "./components/GlobalTopBar";
import {Toaster} from "./components/ui/sonner";
import {toast} from "sonner";
import {usePortfolios} from "./hooks/usePortfolios";
import {useTrading} from "./hooks/useTrading";
import {useAuth} from "./hooks/useAuth";
import {Portfolio, Stock} from "./types/portfolio";
import {Activity, FileText, HelpCircle, Receipt, Settings, ShieldCheck, TrendingUp, User,} from "lucide-react";
import {MarketService, PortfolioService} from "./src/client";
import {useQueryClient} from "@tanstack/react-query";
import {queryKeys} from "./hooks/queryKeys";

// Lazy-loaded page components to reduce initial bundle size
const ComprehensiveDashboard = lazy(() => import("./components/ComprehensiveDashboard").then(m => ({default: m.ComprehensiveDashboard})));
const TradingInterface = lazy(() => import("./components/TradingInterface").then(m => ({default: m.TradingInterface})));
const MarketData = lazy(() => import("./components/MarketData").then(m => ({default: m.MarketData})));
const OrdersManager = lazy(() => import("./components/OrdersManager").then(m => ({default: m.OrdersManager})));
const AccountManager = lazy(() => import("./components/AccountManager").then(m => ({default: m.AccountManager})));
const PortfolioDashboard = lazy(() => import("./components/PortfolioDashboard").then(m => ({default: m.PortfolioDashboard})));
const PortfolioDetail = lazy(() => import("./components/PortfolioDetail").then(m => ({default: m.PortfolioDetail})));
const PortfolioForm = lazy(() => import("./components/PortfolioForm").then(m => ({default: m.PortfolioForm})));
const StockForm = lazy(() => import("./components/StockForm").then(m => ({default: m.StockForm})));
const QuickTradeDialog = lazy(() => import("./components/QuickTradeDialog").then(m => ({default: m.QuickTradeDialog})));
const PortfolioPerformance = lazy(() => import("./components/PortfolioPerformance").then(m => ({default: m.PortfolioPerformance})));
const StockScreener = lazy(() => import("./components/StockScreener").then(m => ({default: m.StockScreener})));
const RiskAnalysis = lazy(() => import("./components/RiskAnalysis").then(m => ({default: m.RiskAnalysis})));
const RebalancingManager = lazy(() => import("./components/RebalancingManager").then(m => ({default: m.RebalancingManager})));
const RiskManagement = lazy(() => import("./components/RiskManagement").then(m => ({default: m.RiskManagement})));
const SignupPage = lazy(() => import("./components/SignupPage").then(m => ({default: m.SignupPage})));
const LoginPage = lazy(() => import("./components/LoginPage").then(m => ({default: m.LoginPage})));
const MarketNewsInsights = lazy(() => import("./components/MarketNewsInsights").then(m => ({default: m.default})));
const InvestmentGoalsEnhanced = lazy(() => import("./components/InvestmentGoalsEnhanced").then(m => ({default: m.InvestmentGoalsEnhanced})));
const AssetAllocation = lazy(() => import("./components/AssetAllocation").then(m => ({default: m.AssetAllocation})));
const WatchlistManager = lazy(() => import("./components/WatchlistManager").then(m => ({default: m.WatchlistManager})));
const AddToWatchlistDialog = lazy(() => import("./components/AddToWatchlistDialog").then(m => ({default: m.AddToWatchlistDialog})));
const Fundamentals = lazy(() => import("./components/Fundamentals").then(m => ({default: m.Fundamentals})));
const TradingViewChart = lazy(() => import("./components/TradingViewChart").then(m => ({default: m.TradingViewChart})));
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
    const {user, isAuthenticated, isLoading: authLoading, error: authError, logout} = useAuth();
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
    const [researchChartSymbol, setResearchChartSymbol] = useState<string>("");

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
        deposit,
        withdraw,
        updateCreditLimit,
        createWatchlist,
        createAlert,
        updateWatchlistItemNote,
    } = useTrading();
    const queryClient = useQueryClient();

    // Compute positions map (must be before any early returns)
    const positionsBySymbol = useMemo(() => {
        const map: Record<string, { quantity: number; averagePrice: number }> = {};
        (selectedPortfolio?.stocks || []).forEach((s) => {
            map[s.symbol] = {quantity: s.quantity, averagePrice: s.purchasePrice};
        });
        return map;
    }, [selectedPortfolio]);

    // Show loading screen while checking authentication
    if (authLoading) {
        console.log('⏳ Showing loading screen');
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto">
                        <TrendingUp className="h-7 w-7 text-primary-foreground animate-pulse"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">SmartFolio.AI</h1>
                        <p className="text-muted-foreground">Loading your investment platform...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show authentication pages if user is not logged in
    if (!isAuthenticated) {
        console.log('🔐 Showing auth pages:', {authView, hasUser: !!user, isAuthenticated});
        if (authView === "signup") {
            return (
                <Suspense fallback={<div>Loading sign up...</div>}>
                    <SignupPage onSwitchToLogin={() => setAuthView("login")}/>
                </Suspense>
            );
        }
        return (
            <Suspense fallback={<div>Loading login...</div>}>
                <LoginPage onSwitchToSignup={() => setAuthView("signup")}/>
            </Suspense>
        );
    }

    // Show main app
    console.log('🎉 Showing main app for user:', user?.name || 'Unknown');

    // Main app handlers
    const handleViewChange = (view: string) => {
        startTransition(() => {
            setCurrentView(view as View);
        });
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

    const handlePlaceOrder = async (orderData: any) => {
        try {
            // For real-time trading, get LIVE market price
            let executionPrice = 0;

            if (orderData.orderType === 'market') {
                // Fetch real-time price from API for market orders
                try {
                    const stockData = await MarketService.getStock({symbol: orderData.symbol});
                    executionPrice = Number((stockData as any).last || (stockData as any).close || 0);

                    if (!executionPrice || executionPrice <= 0) {
                        throw new Error('Invalid market price received');
                    }
                } catch (error) {
                    console.error('Error fetching real-time price:', error);
                    toast.error(`Failed to get real-time price for ${orderData.symbol}`);
                    return;
                }
            } else {
                // For limit orders, use the limit price
                executionPrice = orderData.limitPrice || 0;
            }

            if (!executionPrice || executionPrice <= 0) {
                toast.error('Invalid execution price');
                return;
            }

            // Place order with filled status immediately
            const orderId = await placeOrder(orderData);

            // Add trade to the portfolio immediately
            if (orderData.portfolioId && orderData.symbol) {
                try {
                    // Get stock ID from the stocks list
                    const stocks = (await MarketService.listStocks({q: orderData.symbol, limit: 1})) as any[];
                    const stockId = stocks?.[0]?.id;

                    if (!stockId) {
                        toast.error(`Stock ${orderData.symbol} not found in system`);
                        return;
                    }

                    // Calculate trade amounts for real-time trading
                    const totalAmount = executionPrice * orderData.quantity;
                    const commission = orderData.fees || 0;
                    const netAmount = totalAmount + commission;

                    // Add trade to portfolio with real-time execution price
                    await PortfolioService.addTrade({
                        portfolioId: orderData.portfolioId,
                        requestBody: {
                            stock_id: stockId,
                            trade_type: orderData.side.toUpperCase() as 'BUY' | 'SELL',
                            quantity: orderData.quantity,
                            price: executionPrice,
                            total_amount: totalAmount,
                            commission: commission,
                            net_amount: netAmount,
                            trade_date: new Date().toISOString(),
                            notes: `Auto-filled ${orderData.orderType} order at ${executionPrice.toFixed(2)}`,
                            is_simulated: true  // Set to true for demo/testing, change to false for real trading
                        }
                    });

                    // Invalidate queries to refresh portfolio data in real-time
                    queryClient.invalidateQueries({queryKey: queryKeys.portfolios});
                    queryClient.invalidateQueries({queryKey: queryKeys.dashboardSummary});
                    queryClient.invalidateQueries({queryKey: queryKeys.fundsSummary});

                    // Success notification with execution details
                    toast.success(
                        `Order filled! ${orderData.side === 'buy' ? 'Bought' : 'Sold'} ${orderData.quantity} shares of ${orderData.symbol} @ ${formatCurrency(executionPrice)} (Total: ${formatCurrency(totalAmount)})`
                    );
                } catch (error: any) {
                    console.error('Error adding trade to portfolio:', error);
                    toast.error(`Failed to add trade to portfolio: ${error?.message || 'Unknown error'}`);
                }
            } else {
                toast.error('Portfolio ID is required to place order');
            }
        } catch (error: any) {
            console.error('Error placing order:', error);
            toast.error(`Failed to place order: ${error?.message || 'Unknown error'}`);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const handleCancelOrder = (orderId: string) => {
        if (confirm("Are you sure you want to cancel this order?")) {
            cancelOrder(orderId);
            toast.success("Order cancelled successfully!");
        }
    };

    const handleChartStock = (symbol: string) => {
        setSelectedChartStock(symbol);
        setCurrentView("research");
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
                    <Suspense fallback={<div>Loading Performance Analytics...</div>}>
                        <PortfolioPerformance/>
                    </Suspense>
                );

            case "allocation":
                return (
                    <Suspense fallback={<div>Loading Asset Allocation...</div>}>
                        <AssetAllocation
                            portfolioId={selectedPortfolio?.id}
                            onNavigate={handleViewChange}
                        />
                    </Suspense>
                );

            case "goals":
                return (
                    <Suspense fallback={<div>Loading Investment Goals...</div>}>
                        <InvestmentGoalsEnhanced/>
                    </Suspense>
                );

            case "trading":
                return (
                    <Suspense fallback={<div>Loading Trading Interface...</div>}>
                        <TradingInterface
                            marketData={marketData}
                            onPlaceOrder={handlePlaceOrder}
                            portfolios={portfolios}
                            selectedPortfolioId={selectedPortfolio?.id}
                        />
                    </Suspense>
                );

            case "orders":
                return (
                    <Suspense fallback={<div>Loading Orders Manager...</div>}>
                        <OrdersManager orders={orders} trades={trades} onCancelOrder={handleCancelOrder}/>
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
                            heldSymbols={new Set((selectedPortfolio?.stocks || []).map(s => s.symbol))}
                            onUpdateWatchlistNote={async (watchlistId: string, symbol: string, notes: string) => {
                                await updateWatchlistItemNote(watchlistId, symbol, notes);
                                toast.success('Note saved');
                            }}
                        />
                    </Suspense>
                );

            case "watchlist":
                return (
                    <Suspense fallback={<div>Loading Watchlist Manager...</div>}>
                        <WatchlistManager
                            onQuickTrade={handleQuickTrade}
                            onChartStock={handleChartStock}
                        />
                    </Suspense>
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
                    <Suspense
                        fallback={<div className="flex items-center justify-center h-screen">Loading Chart...</div>}>
                        <div style={{
                            height: 'calc(100vh - 64px)',
                            width: '100%',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <TradingViewChart
                                symbol={researchChartSymbol}
                                interval="1D"
                                theme="light"
                                autosize={true}
                                onPlaceOrder={(symbol, side) => handleQuickTrade(symbol, side)}
                                onClosePosition={async (portfolioId, positionId) => {
                                    try {
                                        // Use the API to close position
                                        await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'}/api/v1/portfolio/${portfolioId}/positions/${positionId}`, {
                                            method: 'DELETE',
                                            credentials: 'include',
                                        });
                                        // Refresh portfolios
                                        await queryClient.invalidateQueries({queryKey: ['portfolios']});
                                        toast.success('Position closed successfully');
                                    } catch (error) {
                                        console.error('Error closing position:', error);
                                        toast.error('Failed to close position');
                                    }
                                }}
                                onPositionUpdate={() => {
                                    // Refresh portfolios after position updates
                                    queryClient.invalidateQueries({queryKey: ['portfolios']});
                                }}
                            />
                        </div>
                    </Suspense>
                );

            case "fundamentals":
                return (
                    <Suspense fallback={<div>Loading Fundamentals...</div>}>
                        <Fundamentals/>
                    </Suspense>
                );

            case "news":
                return (
                    <Suspense fallback={<div>Loading Market News & Insights...</div>}>
                        <MarketNewsInsights/>
                    </Suspense>
                );

            case "risk-analysis":
                return (
                    <Suspense fallback={<div>Loading Risk Analysis...</div>}>
                        <RiskAnalysis onNavigate={handleViewChange} onQuickTrade={handleQuickTrade}/>
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
                        <RebalancingManager
                            onNavigate={handleViewChange}
                            onQuickTrade={handleQuickTrade}
                            portfolioId={selectedPortfolio?.id}
                        />
                    </Suspense>
                );

            case "risk-profile":
                return (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Risk Profile Assessment</h1>
                            <p className="text-muted-foreground text-lg">Update your risk tolerance and investment
                                objectives</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Portfolio Reports</h1>
                            <p className="text-muted-foreground text-lg">Generate comprehensive portfolio reports and
                                performance summaries</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Tax Center</h1>
                            <p className="text-muted-foreground text-lg">Tax-loss harvesting, capital gains analysis,
                                and tax-efficient strategies</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Receipt className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Account Statements</h1>
                            <p className="text-muted-foreground text-lg">Download monthly and annual account
                                statements</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Transaction History</h1>
                            <p className="text-muted-foreground text-lg">Complete history of all account transactions
                                and transfers</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Activity className="h-8 w-8 text-primary"/>
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
                        <AccountManager user={user} accountBalance={accountBalance} transactions={transactions}
                                        onDeposit={deposit} onWithdraw={withdraw}
                                        onUpdateCreditLimit={updateCreditLimit}/>
                    </Suspense>
                );

            case "profile":
                return (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">User Profile & KYC</h1>
                            <p className="text-muted-foreground text-lg">Manage your personal information, documents,
                                and KYC compliance</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Platform Settings</h1>
                            <p className="text-muted-foreground text-lg">Customize your platform experience,
                                notifications, and preferences</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Settings className="h-8 w-8 text-primary"/>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Help & Support</h1>
                            <p className="text-muted-foreground text-lg">Documentation, tutorials, and customer support
                                resources</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <HelpCircle className="h-8 w-8 text-primary"/>
                            </div>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Interactive help center with live chat support and comprehensive documentation coming
                                soon.
                            </p>
                        </div>
                    </div>
                );

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
                <GlobalTopBar accountBalance={accountBalance} onQuickTrade={handleQuickTrade}/>

                <div className="flex-1 overflow-y-auto">
                    <div className={currentView === "research" ? "" : "p-8"}>
                        {/* Page Content - Each component manages its own header */}
                        {renderContent()}
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                <PortfolioForm
                    open={isPortfolioFormOpen}
                    onOpenChange={setIsPortfolioFormOpen}
                    onSubmit={handlePortfolioSubmit}
                />
            </Suspense>

            <Suspense fallback={null}>
                <StockForm
                    open={isStockFormOpen}
                    onOpenChange={setIsStockFormOpen}
                    onSubmit={handleStockSubmit}
                    initialData={editingStock || undefined}
                    availableStocks={marketData}
                />
            </Suspense>

            <Suspense fallback={null}>
                <QuickTradeDialog
                    open={isQuickTradeOpen}
                    onOpenChange={(open) => {
                        startTransition(() => {
                            setIsQuickTradeOpen(open);
                            if (!open) {
                                setQuickTradeSymbol(undefined);
                                setQuickTradeSide(undefined);
                            }
                        });
                    }}
                    onPlaceOrder={handlePlaceOrder}
                    marketData={marketData}
                    initialSymbol={quickTradeSymbol}
                    initialSide={quickTradeSide}
                    portfolios={portfolios}
                    selectedPortfolioId={selectedPortfolio?.id}
                />
            </Suspense>

            <Toaster/>
        </div>
    );
}