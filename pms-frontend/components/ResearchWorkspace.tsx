import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { TradingViewChart } from './TradingViewChart'
import { WatchlistPanel } from './WatchlistPanel'
import { MultiChartGrid } from './MultiChartGrid'
import { PaperTradingSimulation } from './PaperTradingSimulation'
import { BacktestingSimulation } from './backtesting/BacktestingSimulation'
import type { MarketData } from '../types/trading'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState<'trade-decision' | 'multi' | 'paper-trading' | 'backtesting'>('trade-decision')
  const [layoutCount, setLayoutCount] = useState<number>(4)
  const [symbols, setSymbols] = useState<string[]>(() => {
    const base = [initialDefault]
    const others = availableSymbols.filter((sym) => sym !== initialDefault)
    return [...base, ...others.slice(0, MAX_LAYOUT - 1)]
  })

  // Analytics mode state
  const [leftPanelVisible, setLeftPanelVisible] = useState(true)

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

  return (
    <div
      className="p-4 h-full"
      style={{ height: 'calc(100vh - 64px)', width: '100%' }}
    >
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="h-full flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="trade-decision">Trade Decision</TabsTrigger>
          <TabsTrigger value="multi">Multi Chart</TabsTrigger>
          <TabsTrigger value="paper-trading">Paper Trading</TabsTrigger>
          <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
        </TabsList>
        <TabsContent value="trade-decision" className="flex-1 min-h-0">
          <AnalyticsToolLayout />
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
