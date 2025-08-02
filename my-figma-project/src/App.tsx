import { useState } from 'react';
import { TradingSidebar } from './components/TradingSidebar';
import { GlobalTopBar } from './components/GlobalTopBar';
import { QuickTradeDialog } from './components/QuickTradeDialog';
import { TradingDashboard } from './components/TradingDashboard';
import { TradingInterface } from './components/TradingInterface';
import { MarketData } from './components/MarketData';
import { OrdersManager } from './components/OrdersManager';
import { AccountManager } from './components/AccountManager';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { PortfolioDetail } from './components/PortfolioDetail';
import { PortfolioForm } from './components/PortfolioForm';
import { StockForm } from './components/StockForm';
import { TradingViewChart } from './components/TradingViewChart';
import { usePortfolios } from './hooks/usePortfolios';
import { useTrading } from './hooks/useTrading';
import { Portfolio, Stock } from './types/portfolio';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type View = 'dashboard' | 'trading' | 'portfolios' | 'portfolio-detail' | 'market' | 'orders' | 'account' | 'research' | 'settings' | 'profile' | 'chart';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isPortfolioFormOpen, setIsPortfolioFormOpen] = useState(false);
  const [isStockFormOpen, setIsStockFormOpen] = useState(false);
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [quickTradeSymbol, setQuickTradeSymbol] = useState<string | undefined>();
  const [quickTradeSide, setQuickTradeSide] = useState<'buy' | 'sell' | undefined>();
  const [selectedChartStock, setSelectedChartStock] = useState<string>('AAPL');

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
    getAvailableStocks
  } = usePortfolios();

  // Trading hooks
  const {
    user,
    orders,
    trades,
    watchlists,
    transactions,
    news,
    marketData,
    positions,
    marketIndexes,
    orderBook,
    timeAndSales,
    technicalAnalysis,
    riskMetrics,
    portfolioAnalytics,
    marketMovers,
    sectorPerformance,
    accountBalance,
    placeOrder,
    cancelOrder,
    addToWatchlist,
    removeFromWatchlist,
    getMarketData,
  } = useTrading();

  const handleViewChange = (view: string) => {
    setCurrentView(view as View);
  };

  const handleQuickTrade = (symbol?: string, side?: 'buy' | 'sell') => {
    setQuickTradeSymbol(symbol);
    setQuickTradeSide(side);
    setIsQuickTradeOpen(true);
  };

  const handleCreatePortfolio = () => {
    setIsPortfolioFormOpen(true);
  };

  const handlePortfolioSubmit = (portfolioData: Omit<Portfolio, 'id' | 'totalValue' | 'totalCost'>) => {
    addPortfolio(portfolioData);
    toast.success('Portfolio created successfully!');
  };

  const handleSelectPortfolio = (portfolio: Portfolio) => {
    setSelectedPortfolioId(portfolio.id);
    setCurrentView('portfolio-detail');
  };

  const handleBackToPortfolios = () => {
    setCurrentView('portfolios');
  };

  const handleAddStock = () => {
    setEditingStock(null);
    setIsStockFormOpen(true);
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setIsStockFormOpen(true);
  };

  const handleStockSubmit = (stockData: Omit<Stock, 'id'>) => {
    if (!selectedPortfolio) return;

    if (editingStock) {
      updateStock(selectedPortfolio.id, editingStock.id, stockData);
      toast.success('Stock position updated successfully!');
    } else {
      addStock(selectedPortfolio.id, stockData);
      toast.success('Stock position added successfully!');
    }
  };

  const handleDeleteStock = (stockId: string) => {
    if (!selectedPortfolio) return;
    
    if (window.confirm('Are you sure you want to remove this stock position?')) {
      removeStock(selectedPortfolio.id, stockId);
      toast.success('Stock position removed successfully!');
    }
  };

  const handlePlaceOrder = (orderData: any) => {
    placeOrder(orderData);
    toast.success(`Order placed successfully!`);
  };

  const handleCancelOrder = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrder(orderId);
      toast.success('Order cancelled successfully!');
    }
  };

  const handleChartStock = (symbol: string) => {
    setSelectedChartStock(symbol);
    setCurrentView('chart');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <TradingDashboard
            accountBalance={accountBalance}
            recentOrders={orders.slice(0, 5)}
            recentTransactions={transactions.slice(0, 5)}
            news={news}
            marketData={marketData}
            positions={positions}
            marketIndexes={marketIndexes}
            orderBook={orderBook}
            timeAndSales={timeAndSales}
            technicalAnalysis={technicalAnalysis}
            riskMetrics={riskMetrics}
            portfolioAnalytics={portfolioAnalytics}
            marketMovers={marketMovers}
            sectorPerformance={sectorPerformance}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
          />
        );
      
      case 'trading':
        return (
          <TradingInterface
            marketData={marketData}
            onPlaceOrder={handlePlaceOrder}
            buyingPower={accountBalance.buyingPower}
          />
        );
      
      case 'portfolios':
        return (
          <PortfolioDashboard
            onCreatePortfolio={handleCreatePortfolio}
            onSelectPortfolio={handleSelectPortfolio}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
          />
        );
      
      case 'portfolio-detail':
        return selectedPortfolio ? (
          <PortfolioDetail
            portfolio={selectedPortfolio}
            onBack={handleBackToPortfolios}
            onAddStock={handleAddStock}
            onEditStock={handleEditStock}
            onDeleteStock={handleDeleteStock}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
          />
        ) : null;
      
      case 'market':
        return (
          <MarketData
            marketData={marketData}
            watchlists={watchlists}
            news={news}
            onAddToWatchlist={addToWatchlist}
            onRemoveFromWatchlist={removeFromWatchlist}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
          />
        );
      
      case 'orders':
        return (
          <OrdersManager
            orders={orders}
            trades={trades}
            onCancelOrder={handleCancelOrder}
          />
        );
      
      case 'account':
        return (
          <AccountManager
            user={user}
            accountBalance={accountBalance}
            transactions={transactions}
          />
        );

      case 'chart':
        const chartStock = getMarketData(selectedChartStock);
        return chartStock ? (
          <div className="space-y-6">
            <TradingViewChart
              stock={chartStock}
              onQuickTrade={handleQuickTrade}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {marketData.filter(s => s.symbol !== selectedChartStock).slice(0, 3).map((stock) => (
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
      
      case 'research':
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
      
      case 'settings':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl mb-4">Platform Settings</h2>
            <p className="text-muted-foreground">Trading platform configuration options coming soon...</p>
          </div>
        );
      
      case 'profile':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl mb-4">User Profile</h2>
            <p className="text-muted-foreground">Profile management options coming soon...</p>
          </div>
        );
      
      default:
        return (
          <TradingDashboard
            accountBalance={accountBalance}
            recentOrders={orders.slice(0, 5)}
            recentTransactions={transactions.slice(0, 5)}
            news={news}
            marketData={marketData}
            positions={positions}
            marketIndexes={marketIndexes}
            orderBook={orderBook}
            timeAndSales={timeAndSales}
            technicalAnalysis={technicalAnalysis}
            riskMetrics={riskMetrics}
            portfolioAnalytics={portfolioAnalytics}
            marketMovers={marketMovers}
            sectorPerformance={sectorPerformance}
            onQuickTrade={handleQuickTrade}
            onChartStock={handleChartStock}
          />
        );
    }
  };

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
          <div className="p-6">
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