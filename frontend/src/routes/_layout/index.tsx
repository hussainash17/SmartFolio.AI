import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ComprehensiveDashboard } from "@/components/Portfolio/ComprehensiveDashboard"
import { TradingSidebar } from "@/components/Portfolio/TradingSidebar"
import { GlobalTopBar } from "@/components/Portfolio/GlobalTopBar"
import { QuickTradeDialog } from "@/components/Portfolio/QuickTradeDialog"
import { PortfolioForm } from "@/components/Portfolio/PortfolioForm"
import { StockForm } from "@/components/Portfolio/StockForm"
import { usePortfolios } from "@/hooks/usePortfolios"
import { useTrading } from "@/hooks/useTrading"
import { Portfolio, Stock } from "@/types/portfolio"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

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

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [isPortfolioFormOpen, setIsPortfolioFormOpen] = useState(false)
  const [isStockFormOpen, setIsStockFormOpen] = useState(false)
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false)
  const [editingStock, setEditingStock] = useState<Stock | null>(null)
  const [quickTradeSymbol, setQuickTradeSymbol] = useState<string | undefined>()
  const [quickTradeSide, setQuickTradeSide] = useState<"buy" | "sell" | undefined>()
  const [selectedChartStock, setSelectedChartStock] = useState<string>("AAPL")

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
  } = usePortfolios()

  // Trading hooks
  const {
    user,
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
  } = useTrading()

  const handleViewChange = (view: string) => {
    setCurrentView(view as View)
  }

  const handleQuickTrade = (symbol?: string, side?: "buy" | "sell") => {
    setQuickTradeSymbol(symbol)
    setQuickTradeSide(side)
    setIsQuickTradeOpen(true)
  }

  const handleCreatePortfolio = () => {
    setIsPortfolioFormOpen(true)
  }

  const handlePortfolioSubmit = (portfolioData: Omit<Portfolio, "id" | "totalValue" | "totalCost">) => {
    addPortfolio(portfolioData)
    toast.success("Portfolio created successfully!")
  }

  const handleSelectPortfolio = (portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id)
    setCurrentView("portfolio-detail")
  }

  const handleBackToPortfolios = () => {
    setCurrentView("portfolios")
  }

  const handleAddStock = () => {
    setEditingStock(null)
    setIsStockFormOpen(true)
  }

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock)
    setIsStockFormOpen(true)
  }

  const handleStockSubmit = (stockData: Omit<Stock, "id">) => {
    if (!selectedPortfolio) return

    if (editingStock) {
      updateStock(selectedPortfolio.id, editingStock.id, stockData)
      toast.success("Stock position updated successfully!")
    } else {
      addStock(selectedPortfolio.id, stockData)
      toast.success("Stock position added successfully!")
    }
  }

  const handleDeleteStock = (stockId: string) => {
    if (!selectedPortfolio) return

    if (window.confirm("Are you sure you want to remove this stock position?")) {
      removeStock(selectedPortfolio.id, stockId)
      toast.success("Stock position removed successfully!")
    }
  }

  const handlePlaceOrder = (orderData: any) => {
    const orderId = placeOrder(orderData)
    toast.success(`Order placed successfully! Order ID: ${orderId.slice(0, 8)}...`)
  }

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      cancelOrder(orderId)
      toast.success("Order cancelled successfully!")
    }
  }

  const handleChartStock = (symbol: string) => {
    setSelectedChartStock(symbol)
    setCurrentView("chart")
  }

  const getPageTitle = () => {
    switch (currentView) {
      case "dashboard":
        return "Dashboard"
      case "portfolios":
        return "My Portfolios"
      case "portfolio-detail":
        return "Portfolio Details"
      case "performance":
        return "Portfolio Performance Analytics"
      case "allocation":
        return "Asset Allocation Analysis"
      case "goals":
        return "Investment Goals Tracker"
      case "trading":
        return "Trading Interface"
      case "orders":
        return "Orders & Trades"
      case "market":
        return "Market Data"
      case "watchlist":
        return "Watchlists"
      case "screener":
        return "Stock Screener"
      case "research":
        return "Research & Analysis"
      case "fundamentals":
        return "Fundamental Analysis"
      case "news":
        return "Market News & Insights"
      case "risk-analysis":
        return "Risk Management"
      case "correlation":
        return "Correlation Analysis"
      case "rebalancing":
        return "Portfolio Rebalancing"
      case "risk-profile":
        return "Risk Profile Assessment"
      case "reports":
        return "Portfolio Reports"
      case "tax-center":
        return "Tax Center"
      case "statements":
        return "Account Statements"
      case "transactions":
        return "Transaction History"
      case "account":
        return "Account Management"
      case "profile":
        return "User Profile & KYC"
      case "settings":
        return "Platform Settings"
      case "help":
        return "Help & Support"
      case "chart":
        return "Chart Analysis"
      default:
        return "Dashboard"
    }
  }

  const getPageDescription = () => {
    switch (currentView) {
      case "dashboard":
        return "Comprehensive view of your investment portfolio and financial goals"
      case "portfolios":
        return "Manage and monitor your investment portfolios"
      case "performance":
        return "Detailed performance analysis with benchmarking, attribution, and risk-adjusted returns"
      case "allocation":
        return "Interactive asset allocation breakdown with rebalancing recommendations"
      case "goals":
        return "Track progress towards your financial goals with automated recommendations"
      case "trading":
        return "Execute trades with market, limit, and stop orders"
      case "orders":
        return "View and manage your order history and active trades"
      case "market":
        return "Real-time market data, news, and watchlists"
      case "watchlist":
        return "Organize and monitor stocks you're interested in with custom watchlists"
      case "screener":
        return "Find stocks that match your investment criteria using fundamental and technical filters"
      case "research":
        return "Advanced charting and technical analysis tools"
      case "fundamentals":
        return "Deep dive into company financials, ratios, and valuation metrics"
      case "news":
        return "Stay updated with market news, analyst reports, and investment insights"
      case "risk-analysis":
        return "Monitor and manage your portfolio risk with comprehensive analytics and recommendations"
      case "correlation":
        return "Analyze correlations between portfolio holdings to identify concentration risks"
      case "rebalancing":
        return "Review and execute rebalancing recommendations to maintain target allocation"
      case "risk-profile":
        return "Update your risk tolerance and investment objectives"
      case "reports":
        return "Generate comprehensive portfolio reports and performance summaries"
      case "tax-center":
        return "Tax-loss harvesting, capital gains analysis, and tax-efficient strategies"
      case "statements":
        return "Download monthly and annual account statements"
      case "transactions":
        return "Complete history of all account transactions and transfers"
      case "account":
        return "Manage your account details, balances, and settings"
      case "profile":
        return "Manage your personal information, documents, and KYC compliance"
      case "settings":
        return "Customize your platform experience, notifications, and preferences"
      case "help":
        return "Documentation, tutorials, and customer support resources"
      case "chart":
        return "Advanced charting with technical indicators and drawing tools"
      default:
        return "Comprehensive view of your investment portfolio and financial goals"
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <ComprehensiveDashboard
            accountBalance={accountBalance}
            recentOrders={orders.slice(0, 5)}
            recentTransactions={transactions.slice(0, 5)}
            news={news}
            marketData={marketData}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
            onNavigate={handleViewChange}
          />
        )
      default:
        return (
          <ComprehensiveDashboard
            accountBalance={accountBalance}
            recentOrders={orders.slice(0, 5)}
            recentTransactions={transactions.slice(0, 5)}
            news={news}
            marketData={marketData}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
            onNavigate={handleViewChange}
          />
        )
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <TradingSidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        user={user}
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <GlobalTopBar
          accountBalance={accountBalance}
          onQuickTrade={handleQuickTrade}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-foreground mb-2">
                {getPageTitle()}
              </h1>
              <p className="text-muted-foreground text-lg">
                {getPageDescription()}
              </p>
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
        availableStocks={getAvailableStocks()}
      />

      <QuickTradeDialog
        open={isQuickTradeOpen}
        onOpenChange={(open) => {
          setIsQuickTradeOpen(open)
          if (!open) {
            setQuickTradeSymbol(undefined)
            setQuickTradeSide(undefined)
          }
        }}
        onPlaceOrder={handlePlaceOrder}
        marketData={marketData}
        buyingPower={accountBalance.buyingPower}
        initialSymbol={quickTradeSymbol}
      />

      <Toaster />
    </div>
  )
}
