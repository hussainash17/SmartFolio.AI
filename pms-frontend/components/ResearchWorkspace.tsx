import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { TradingViewChart } from './TradingViewChart'
import { WatchlistPanel } from './WatchlistPanel'
import { SymbolInfoPanel } from './SymbolInfoPanel'
import { OrdersPositionsPanel } from './OrdersPositionsPanel'
import { MultiChartGrid } from './MultiChartGrid'
import { PaperTradingSimulation } from './PaperTradingSimulation'
import { BacktestingSimulation } from './backtesting/BacktestingSimulation'
import type { MarketData } from '../types/trading'
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnalyticsToolLayout } from './analytics'

interface ResearchWorkspaceProps {
  defaultSymbol?: string
  marketData: MarketData[]
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void
}

const sanitizeSymbol = (symbol?: string | null) => symbol?.trim().toUpperCase() ?? ''

const MAX_LAYOUT = 6

export function ResearchWorkspace({ defaultSymbol, marketData, onQuickTrade }: ResearchWorkspaceProps) {
  const availableSymbols = useMemo(() => {
    const seen = new Set<string>()
    const symbols: string[] = []
    marketData.forEach((item) => {
      const sym = sanitizeSymbol(item.symbol)
      if (sym && !seen.has(sym)) {
        seen.add(sym)
        symbols.push(sym)
      }
    })
    return symbols.length ? symbols : [sanitizeSymbol(defaultSymbol) || 'DSEX']
  }, [marketData, defaultSymbol])

  const initialDefault = sanitizeSymbol(defaultSymbol) || availableSymbols[0] || ''
  const [viewMode, setViewMode] = useState<'analytics' | 'multi' | 'paper-trading' | 'backtesting'>('analytics')
  const [layoutCount, setLayoutCount] = useState<number>(4)
  const [interval, setInterval] = useState<string>('1D')
  const [symbols, setSymbols] = useState<string[]>(() => {
    const base = [initialDefault]
    const others = availableSymbols.filter((sym) => sym !== initialDefault)
    return [...base, ...others.slice(0, MAX_LAYOUT - 1)]
  })

  // Analytics mode state
  const [leftPanelVisible, setLeftPanelVisible] = useState(true)
  const [rightPanelVisible, setRightPanelVisible] = useState(true)

  useEffect(() => {
    setSymbols((prev) => {
      const next = [...prev]
      if (!next.length) {
        next.push(initialDefault)
      } else if (!next[0]) {
        next[0] = initialDefault
      }
      return next
    })
  }, [initialDefault])

  useEffect(() => {
    setSymbols((prev) => {
      const next = [...prev]
      if (next.length > layoutCount) {
        return next.slice(0, layoutCount)
      }
      const availablePool = availableSymbols.filter((sym) => !next.includes(sym))
      while (next.length < layoutCount) {
        next.push(availablePool.shift() || availableSymbols[0] || '')
      }
      return next
    })
  }, [layoutCount, availableSymbols])

  const handleSymbolChange = (slot: number, value: string) => {
    setSymbols((prev) => {
      const next = [...prev]
      next[slot] = value
      return next
    })
  }

  const renderAnalytics = () => (
    <div className="flex flex-col h-full">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Left Panel */}
        <div className={`relative transition-all duration-300 ease-in-out ${leftPanelVisible ? 'w-[280px]' : 'w-0'}`}>
          {leftPanelVisible && (
            <WatchlistPanel
              currentSymbol={symbols[0] || initialDefault}
              onSymbolSelect={(symbol) => handleSymbolChange(0, symbol)}
            />
          )}

          <button
            onClick={() => setLeftPanelVisible(!leftPanelVisible)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-8 bg-card border rounded-md shadow-sm hover:bg-accent transition-colors"
          >
            {leftPanelVisible ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Chart + Right Panel Container */}
        <div className="flex flex-1 flex-col overflow-hidden gap-4">
          {/* Chart + Right Panel Row */}
          <div className="flex flex-1 overflow-hidden gap-4">
            {/* Chart Area */}
            <div className="flex-1 border rounded-lg overflow-hidden">
              <TradingViewChart
                key={`analytics-${symbols[0] || initialDefault}-${interval}`}
                symbol={symbols[0] || initialDefault}
                interval={interval}
                theme="light"
                autosize
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="p-4 h-full"
      style={{ height: 'calc(100vh - 64px)', width: '100%' }}
    >
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="h-full flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="trade-decision">TradeDecision</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="multi">Multi Chart</TabsTrigger>
          <TabsTrigger value="paper-trading">Paper Trading</TabsTrigger>
          <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
        </TabsList>
        <TabsContent value="trade-decision" className="flex-1 min-h-0">
          <AnalyticsToolLayout />
        </TabsContent>
        <TabsContent value="analytics" className="flex-1 min-h-0">
          {renderAnalytics()}
        </TabsContent>
        <TabsContent value="multi" className="flex-1 min-h-0">
          <MultiChartGrid />
        </TabsContent>
        <TabsContent value="paper-trading" className="flex-1 min-h-0">
          <PaperTradingSimulation
            availableSymbols={availableSymbols}
            defaultSymbol={initialDefault}
          />
        </TabsContent>
        <TabsContent value="backtesting" className="flex-1 min-h-0">
          <BacktestingSimulation
            availableSymbols={availableSymbols}
            defaultSymbol={initialDefault}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
