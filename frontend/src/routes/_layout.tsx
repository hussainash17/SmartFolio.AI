import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"
import { useState } from "react"

import { TradingSidebar } from "@/components/Trading/TradingSidebar"
import { GlobalTopBar } from "@/components/Trading/GlobalTopBar"
import { QuickTradeDialog } from "@/components/Trading/QuickTradeDialog"
import { isLoggedIn } from "@/hooks/useAuth"
import { useTrading } from "@/hooks/useTrading"
import { Toaster } from "@/components/ui/sonner"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  const [isQuickTradeOpen, setIsQuickTradeOpen] = useState(false)
  const [quickTradeSymbol, setQuickTradeSymbol] = useState<string | undefined>()
  const [quickTradeSide, setQuickTradeSide] = useState<'buy' | 'sell' | undefined>()

  // Trading hooks
  const {
    user,
    orders,
    marketData,
    accountBalance,
    placeOrder,
  } = useTrading()

  const handleQuickTrade = (symbol?: string, side?: 'buy' | 'sell') => {
    setQuickTradeSymbol(symbol)
    setQuickTradeSide(side)
    setIsQuickTradeOpen(true)
  }

  const handlePlaceOrder = (orderData: any) => {
    placeOrder(orderData)
  }

  return (
    <div className="flex h-screen bg-background">
      <TradingSidebar
        user={user}
      />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <GlobalTopBar
          accountBalance={accountBalance}
          onQuickTrade={handleQuickTrade}
        />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </div>
      </div>

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

export default Layout
