import { lazy, startTransition, Suspense, useEffect, useMemo, useState } from "react";
import { TradingSidebar } from "./components/TradingSidebar";
import { GlobalTopBar } from "./components/GlobalTopBar";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { usePortfolios } from "./hooks/usePortfolios";
import { useTrading } from "./hooks/useTrading";
import { useAuth } from "./hooks/useAuth";
import { Portfolio, PortfolioSummary, Stock } from "./types/portfolio";
import { Activity, FileText, HelpCircle, Receipt, TrendingUp, User, } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "./hooks/queryKeys";

// Lazy-loaded page components to reduce initial bundle size
const ComprehensiveDashboard = lazy(() => import("./components/ComprehensiveDashboard").then(m => ({ default: m.ComprehensiveDashboard })));
const UnifiedTradingPage = lazy(() => import("./components/UnifiedTradingPage").then(m => ({ default: m.UnifiedTradingPage })));
const MarketData = lazy(() => import("./components/MarketData").then(m => ({ default: m.MarketData })));
const AccountManager = lazy(() => import("./components/AccountManager").then(m => ({ default: m.AccountManager })));
const PortfolioDashboard = lazy(() => import("./components/PortfolioDashboard").then(m => ({ default: m.PortfolioDashboard })));
const PortfolioDetail = lazy(() => import("./components/PortfolioDetail").then(m => ({ default: m.PortfolioDetail })));
const PortfolioForm = lazy(() => import("./components/PortfolioForm").then(m => ({ default: m.PortfolioForm })));
const UploadPortfolioDialog = lazy(() => import("./components/UploadPortfolioDialog").then(m => ({ default: m.UploadPortfolioDialog })));
const StockForm = lazy(() => import("./components/StockForm").then(m => ({ default: m.StockForm })));
const QuickTradeDialog = lazy(() => import("./components/QuickTradeDialog").then(m => ({ default: m.QuickTradeDialog })));
const PortfolioPerformance = lazy(() => import("./components/PortfolioPerformance").then(m => ({ default: m.PortfolioPerformance })));
const StockScreener = lazy(() => import("./components/StockScreener").then(m => ({ default: m.StockScreener })));
const RiskAnalysis = lazy(() => import("./components/RiskAnalysis").then(m => ({ default: m.RiskAnalysis })));
const RebalancingManager = lazy(() => import("./components/RebalancingManager").then(m => ({ default: m.RebalancingManager })));
const RiskManagement = lazy(() => import("./components/RiskManagement").then(m => ({ default: m.RiskManagement })));
const RiskSettings = lazy(() => import("./components/RiskSettings").then(m => ({ default: m.RiskSettings })));
const SignupPage = lazy(() => import("./components/SignupPage").then(m => ({ default: m.SignupPage })));
const LoginPage = lazy(() => import("./components/LoginPage").then(m => ({ default: m.LoginPage })));
const MarketNewsInsights = lazy(() => import("./components/MarketNewsInsights").then(m => ({ default: m.default })));
const InvestmentGoalsEnhanced = lazy(() => import("./components/InvestmentGoalsEnhanced").then(m => ({ default: m.InvestmentGoalsEnhanced })));
const AssetAllocation = lazy(() => import("./components/AssetAllocation").then(m => ({ default: m.AssetAllocation })));
const WatchlistManager = lazy(() => import("./components/WatchlistManager").then(m => ({ default: m.WatchlistManager })));
const Fundamentals = lazy(() => import("./components/Fundamentals").then(m => ({ default: m.Fundamentals })));
const ResearchWorkspace = lazy(() => import("./components/ResearchWorkspace").then(m => ({ default: m.ResearchWorkspace })));
const SettingsView = lazy(() => import("./components/SettingsView").then(m => ({ default: m.SettingsView })));
const HelpSupportView = lazy(() => import("./components/HelpSupportView").then(m => ({ default: m.HelpSupportView })));
const TradingIdeas = lazy(() => import("./components/TradingIdeas").then(m => ({ default: m.TradingIdeas })));

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
    | "chart"
    | "analytics"
    | "ideas";

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
    const [stockFormMode, setStockFormMode] = useState<"add" | "edit" | "buy" | "sell">("add");
    const [targetPortfolioId, setTargetPortfolioId] = useState<string | undefined>(undefined);
    const [isStockFormOpen, setIsStockFormOpen] = useState(false);
    const [isUploadPortfolioOpen, setIsUploadPortfolioOpen] = useState(false);
    const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false);
    const [editingStock, setEditingStock] = useState<Stock | null>(null);
    const [quickTradeSymbol, setQuickTradeSymbol] = useState<string | undefined>();
    const [quickTradeSide, setQuickTradeSide] = useState<"buy" | "sell" | undefined>();
    const [researchChartSymbol, setResearchChartSymbol] = useState<string>("DSEX");
    const [fundamentalsSymbol, setFundamentalsSymbol] = useState<string>("GP");
    const [detailBackTarget, setDetailBackTarget] = useState<View>("portfolios");

    useEffect(() => {
        const applyHashToView = () => {
            const hash = window.location.hash.replace(/^#\/?/, '');
            if (hash) {
                setCurrentView(hash as View);
            }
        };
        applyHashToView();
        window.addEventListener('hashchange', applyHashToView);
        return () => window.removeEventListener('hashchange', applyHashToView);
    }, []);

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

    const marketPriceMap = useMemo(() => {
        const map = new Map<string, number>();
        marketData.forEach((quote) => {
            const symbol = String(quote.symbol || '').toUpperCase();
            if (!symbol) {
                return;
            }
            const price = Number(quote.currentPrice ?? quote.change ?? 0);
            if (!Number.isFinite(price)) {
                return;
            }
            map.set(symbol, price);
        });
        return map;
    }, [marketData]);

    const portfoliosWithLivePricing = useMemo<Portfolio[]>(() => {
        return portfolios.map((portfolio) => {
            const enrichedStocks = portfolio.stocks.map((stock) => {
                const symbolKey = String(stock.symbol || '').toUpperCase();
                const livePrice = marketPriceMap.get(symbolKey) ?? stock.currentPrice;
                return {
                    ...stock,
                    currentPrice: livePrice,
                };
            });

            const stocksMarketValue = enrichedStocks.reduce((sum, stock) => sum + stock.quantity * stock.currentPrice, 0);
            const totalCost = enrichedStocks.reduce((sum, stock) => sum + stock.quantity * stock.purchasePrice, 0);
            const totalValue = stocksMarketValue + portfolio.cash;

            return {
                ...portfolio,
                stocks: enrichedStocks,
                totalCost,
                totalValue,
            };
        });
    }, [portfolios, marketPriceMap]);

    const selectedPortfolioDisplay = useMemo(() => {
        if (!selectedPortfolio) {
            return null;
        }
        return portfoliosWithLivePricing.find((portfolio) => portfolio.id === selectedPortfolio.id) ?? selectedPortfolio;
    }, [selectedPortfolio, portfoliosWithLivePricing]);

    const portfolioSummaryDisplay = useMemo<PortfolioSummary>(() => {
        if (!portfoliosWithLivePricing.length) {
            return portfolioSummary;
        }

        const totalValue = portfoliosWithLivePricing.reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
        const totalCost = portfoliosWithLivePricing.reduce((sum, portfolio) => sum + portfolio.totalCost, 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

        return {
            totalValue,
            totalGainLoss,
            totalGainLossPercent,
            dayChange: portfolioSummary.dayChange,
            dayChangePercent: portfolioSummary.dayChangePercent,
        };
    }, [portfoliosWithLivePricing, portfolioSummary]);

    // Compute positions map (must be before any early returns)
    const positionsBySymbol = useMemo(() => {
        const map: Record<string, { quantity: number; averagePrice: number }> = {};
        (selectedPortfolioDisplay?.stocks || selectedPortfolio?.stocks || []).forEach((s) => {
            map[s.symbol] = { quantity: s.quantity, averagePrice: s.purchasePrice };
        });
        return map;
    }, [selectedPortfolio, selectedPortfolioDisplay]);

    // Show loading screen while checking authentication
    if (authLoading) {
        console.log('⏳ Showing loading screen');
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto overflow-hidden">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-cover animate-pulse" />
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
        console.log('🔐 Showing auth pages:', { authView, hasUser: !!user, isAuthenticated });
        if (authView === "signup") {
            return (
                <Suspense fallback={<div>Loading sign up...</div>}>
                    <SignupPage onSwitchToLogin={() => setAuthView("login")} />
                </Suspense>
            );
        }
        return (
            <Suspense fallback={<div>Loading login...</div>}>
                <LoginPage onSwitchToSignup={() => setAuthView("signup")} />
            </Suspense>
        );
    }

    // Show main app
    console.log('🎉 Showing main app for user:', user?.name || 'Unknown');

    // Main app handlers
    const handleViewChange = (view: string) => {
        startTransition(() => {
            if (view === "portfolio-detail") {
                setDetailBackTarget(currentView);
            }
            setCurrentView(view as View);
            window.location.hash = `/${view}`;
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
        setDetailBackTarget("portfolios");
        setCurrentView("portfolio-detail");
        window.location.hash = "/portfolio-detail";
    };

    const handleBackFromDetail = () => {
        const target = detailBackTarget || "portfolios";
        startTransition(() => {
            setCurrentView(target);
            window.location.hash = `/${target}`;
        });
    };

    const handleAddStock = () => {
        setEditingStock(null);
        setStockFormMode('add');
        setIsStockFormOpen(true);
    };

    const handleEditStock = (stock: Stock) => {
        setEditingStock(stock);
        setStockFormMode('edit');
        setIsStockFormOpen(true);
    };

    const handleTradeStock = (stock: Stock, mode: 'buy' | 'sell', portfolioId?: string) => {
        setEditingStock(stock);
        setStockFormMode(mode);
        // If portfolioId is provided, use it. Otherwise undefined (StockForm will ask if needed).
        setTargetPortfolioId(portfolioId);
        setIsStockFormOpen(true);
    };

    const handleStockSubmit = async (stockData: Omit<Stock, "id">) => {
        if (!selectedPortfolio) return;

        if (editingStock) {
            await updateStock(selectedPortfolio.id, editingStock.id, stockData);
            toast.success("Stock position updated successfully!");
        } else {
            await addStock(selectedPortfolio.id, stockData);
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
            // Place order - backend will auto-fill simulated orders immediately
            await placeOrder(orderData);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: queryKeys.ordersList });
            queryClient.invalidateQueries({ queryKey: queryKeys.portfolios });
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
            queryClient.invalidateQueries({ queryKey: queryKeys.fundsSummary });
            queryClient.invalidateQueries({ queryKey: queryKeys.transactions });

            // Success notification
            toast.success(
                `Order placed and filled! ${orderData.side === 'buy' ? 'Bought' : 'Sold'} ${orderData.quantity} shares of ${orderData.symbol}`
            );
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
        setResearchChartSymbol(symbol);
        setCurrentView("research");
    };

    const handleOpenChart = (symbol: string) => {
        setResearchChartSymbol(symbol);
        setCurrentView("research");
    };

    const handleOpenFundamentals = (symbol: string) => {
        setFundamentalsSymbol(symbol);
        setCurrentView("fundamentals");
    };

    const renderContent = () => {
        switch (currentView) {
            case "dashboard":
                return (
                    <Suspense fallback={<div>Loading Comprehensive Dashboard...</div>}>
                        <ComprehensiveDashboard
                            recentTransactions={transactions.slice(0, 5)}
                            onNavigate={handleViewChange}
                        />
                    </Suspense>
                );

            case "portfolios":
                return (
                    <Suspense fallback={<div>Loading Portfolio Dashboard...</div>}>
                        <PortfolioDashboard
                            onCreatePortfolio={handleCreatePortfolio}
                            onUploadPortfolio={() => setIsUploadPortfolioOpen(true)}
                            onSelectPortfolio={handleSelectPortfolio}
                            onQuickTrade={(symbol, side) => {
                                handleTradeStock({
                                    symbol: symbol || '',
                                    companyName: '',
                                    quantity: 0,
                                    purchasePrice: 0,
                                    currentPrice: 0,
                                    purchaseDate: ''
                                } as Stock, side || 'buy', selectedPortfolioDisplay?.id);
                            }}
                            onTradeStock={handleTradeStock}
                            onChartStock={handleChartStock}
                            portfolios={portfoliosWithLivePricing}
                            portfolioSummary={portfolioSummaryDisplay}
                            selectedPortfolio={selectedPortfolioDisplay}
                        />
                    </Suspense>
                );

            case "portfolio-detail":
                return selectedPortfolioDisplay ? (
                    <Suspense fallback={<div>Loading Portfolio Detail...</div>}>
                        <PortfolioDetail
                            portfolio={selectedPortfolioDisplay}
                            onBack={handleBackFromDetail}
                            onAddStock={handleAddStock}
                            onEditStock={handleEditStock}
                            onDeleteStock={handleDeleteStock}
                            onQuickTrade={handleQuickTrade}
                            onChartStock={handleChartStock}
                            marketData={marketData}
                            onTradeStock={handleTradeStock}
                        />
                    </Suspense>
                ) : null;

            case "performance":
                return (
                    <Suspense fallback={<div>Loading Performance Analytics...</div>}>
                        <PortfolioPerformance />
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
                        <InvestmentGoalsEnhanced />
                    </Suspense>
                );

            // case "trading":
            //     return (
            //         <Suspense fallback={<div>Loading Trading...</div>}>
            //             <UnifiedTradingPage
            //                 marketData={marketData}
            //                 onPlaceOrder={handlePlaceOrder}
            //                 portfolios={portfoliosWithLivePricing}
            //                 selectedPortfolioId={selectedPortfolio?.id}
            //                 orders={orders}
            //                 trades={trades}
            //                 onCancelOrder={handleCancelOrder}
            //             />
            //         </Suspense>
            //     );

            // case "market":
            //     return (
            //         <Suspense fallback={<div>Loading Market Data...</div>}>
            //             <MarketData
            //                 marketData={marketData}
            //                 watchlists={watchlists}
            //                 news={news}
            //                 onAddToWatchlist={addToWatchlist}
            //                 onRemoveFromWatchlist={removeFromWatchlist}
            //                 onQuickTrade={handleQuickTrade}
            //                 onChartStock={handleChartStock}
            //                 heldSymbols={new Set(((selectedPortfolioDisplay ?? selectedPortfolio)?.stocks || []).map(s => s.symbol))}
            //                 onUpdateWatchlistNote={async (watchlistId: string, symbol: string, notes: string) => {
            //                     await updateWatchlistItemNote(watchlistId, symbol, notes);
            //                     toast.success('Note saved');
            //                 }}
            //             />
            //         </Suspense>
            //     );

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
                            onQuickTrade={(symbol, side) => {
                                handleTradeStock({
                                    symbol: symbol || '',
                                    companyName: '',
                                    quantity: 0,
                                    purchasePrice: 0,
                                    currentPrice: 0,
                                    purchaseDate: ''
                                } as Stock, side || 'buy'); // No portfolio ID passed, StockForm will ask
                            }}
                            onChartStock={handleChartStock}
                            onAddToWatchlist={addToWatchlist}
                        />
                    </Suspense>
                );

            case "research":
                return (
                    <Suspense
                        fallback={<div className="flex items-center justify-center h-screen">Loading Charts...</div>}>
                        <ResearchWorkspace
                            defaultSymbol={researchChartSymbol}
                            marketData={marketData}
                            onQuickTrade={handleQuickTrade}
                        />
                    </Suspense>
                );

            case "fundamentals":
                return (
                    <Suspense fallback={<div>Loading Fundamentals...</div>}>
                        <Fundamentals defaultSymbol={fundamentalsSymbol} />
                    </Suspense>
                );

            case "news":
                return (
                    <Suspense fallback={<div>Loading Market News & Insights...</div>}>
                        <MarketNewsInsights />
                    </Suspense>
                );

            case "ideas":
                return (
                    <Suspense fallback={<div>Loading Trading Ideas...</div>}>
                        <TradingIdeas />
                    </Suspense>
                );

            case "risk-analysis":
                return (
                    <Suspense fallback={<div>Loading Risk Analysis...</div>}>
                        <RiskAnalysis onNavigate={handleViewChange} onQuickTrade={handleQuickTrade} selectedPortfolioId={selectedPortfolio?.id} />
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
                    <Suspense fallback={<div>Loading Risk Settings...</div>}>
                        <RiskSettings onNavigate={handleViewChange} />
                    </Suspense>
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Tax Center</h1>
                            <p className="text-muted-foreground text-lg">Tax-loss harvesting, capital gains analysis,
                                and tax-efficient strategies</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Account Statements</h1>
                            <p className="text-muted-foreground text-lg">Download monthly and annual account
                                statements</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold text-foreground mb-2">Transaction History</h1>
                            <p className="text-muted-foreground text-lg">Complete history of all account transactions
                                and transfers</p>
                        </div>
                        <div className="text-center py-12">
                            <div
                                className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                        <AccountManager user={user} accountBalance={accountBalance} transactions={transactions} portfolios={portfoliosWithLivePricing}
                            onDeposit={deposit} onWithdraw={withdraw}
                            onUpdateCreditLimit={updateCreditLimit} />
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
                    <Suspense fallback={<div>Loading Settings...</div>}>
                        <SettingsView />
                    </Suspense>
                );

            case "help":
                return (
                    <Suspense fallback={<div>Loading Help & Support...</div>}>
                        <HelpSupportView />
                    </Suspense>
                );

            default:
                return (
                    <Suspense fallback={<div>Loading Comprehensive Dashboard...</div>}>
                        <ComprehensiveDashboard
                            recentTransactions={transactions.slice(0, 5)}
                            onNavigate={handleViewChange}
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
                <GlobalTopBar
                    accountBalance={accountBalance}
                    onQuickTrade={handleQuickTrade}
                    onOpenChart={handleOpenChart}
                    onOpenFundamentals={handleOpenFundamentals}
                    onViewChange={handleViewChange}
                    user={user}
                    onLogout={handleLogout}
                />

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                <UploadPortfolioDialog
                    open={isUploadPortfolioOpen}
                    onOpenChange={setIsUploadPortfolioOpen}
                />
            </Suspense>

            <Suspense fallback={null}>
                <StockForm
                    open={isStockFormOpen}
                    onOpenChange={setIsStockFormOpen}
                    onSubmit={handleStockSubmit}
                    initialData={editingStock || undefined}
                    availableStocks={marketData}
                    mode={stockFormMode}
                    portfolioId={selectedPortfolio?.id}
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

            <Toaster />
        </div>
    );
}
