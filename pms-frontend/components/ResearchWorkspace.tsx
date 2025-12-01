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
import type { MarketData } from '../types/trading'
import { Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react'

interface ResearchWorkspaceProps {
  defaultSymbol?: string
  marketData: MarketData[]
  onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void
}

const sanitizeSymbol = (symbol?: string | null) => symbol?.trim().toUpperCase() ?? ''

const INTERVAL_OPTIONS = [
  { value: '1D', label: '1 Day' },
  { value: '1W', label: '1 Week' },
  { value: '1M', label: '1 Month' },
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
  { value: '1Y', label: '1 Year' },
  { value: 'ALL', label: 'All' },
]

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
  const [viewMode, setViewMode] = useState<'analytics' | 'multi'>('analytics')
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
  const [bottomPanelHeight, setBottomPanelHeight] = useState(240)

  const MIN_BOTTOM_HEIGHT = 180
  const MAX_BOTTOM_HEIGHT = 400

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

  const rows = Math.ceil(layoutCount / Math.min(layoutCount, 2))
  const columns = layoutCount === 1 ? 1 : layoutCount === 2 ? 2 : Math.min(layoutCount, 3)

  const handleSymbolChange = (slot: number, value: string) => {
    setSymbols((prev) => {
      const next = [...prev]
      next[slot] = value
      return next
    })
  }

  const handleAddChart = () => {
    setLayoutCount((prev) => Math.min(prev + 1, MAX_LAYOUT))
    setViewMode('multi')
  }

  const handleRemoveChart = () => {
    setLayoutCount((prev) => Math.max(prev - 1, 1))
  }

  const handleBottomPanelResize = (deltaY: number) => {
    setBottomPanelHeight(prev => {
      const newHeight = prev - deltaY
      return Math.min(Math.max(newHeight, MIN_BOTTOM_HEIGHT), MAX_BOTTOM_HEIGHT)
    })
  }

  const renderMultiCharts = () => (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRemoveChart} disabled={layoutCount <= 1}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleAddChart} disabled={layoutCount >= MAX_LAYOUT}>
            <Plus className="h-4 w-4" />
          </Button>
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {layoutCount} {layoutCount === 1 ? 'Chart' : 'Charts'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Interval</span>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        className="grid flex-1 gap-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          minHeight: 0,
        }}
      >
        {symbols.slice(0, layoutCount).map((sym, index) => (
          <Card key={`${index}-${sym}`} className="flex flex-col min-h-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2 w-full">
                <Select value={sym} onValueChange={(value) => handleSymbolChange(index, value)}>
                  <SelectTrigger className="w-full max-w-[220px]">
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {availableSymbols.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => onQuickTrade(sym)}>
                  Trade
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <div className="h-full border rounded-lg overflow-hidden">
                <TradingViewChart
                  key={`multi-${index}-${sym}-${interval}`}
                  symbol={sym}
                  interval={interval}
                  theme="light"
                  autosize
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderSingleChart = () => (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Symbol</span>
          <Select value={symbols[0] || initialDefault} onValueChange={(value) => handleSymbolChange(0, value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {availableSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Interval</span>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => onQuickTrade(symbols[0] || initialDefault)}>
          Quick Trade
        </Button>
      </div>
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <TradingViewChart
          key={`single-${symbols[0] || initialDefault}-${interval}`}
          symbol={symbols[0] || initialDefault}
          interval={interval}
          theme="light"
          autosize
        />
      </div>
    </div>
  )

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

            {/* Right Panel */}
            <div className={`relative transition-all duration-300 ease-in-out ${rightPanelVisible ? 'w-[320px]' : 'w-0'}`}>
              {rightPanelVisible && (
                <SymbolInfoPanel
                  currentSymbol={symbols[0] || initialDefault}
                  onPlaceOrder={onQuickTrade}
                />
              )}

              <button
                onClick={() => setRightPanelVisible(!rightPanelVisible)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-8 bg-card border rounded-md shadow-sm hover:bg-accent transition-colors"
              >
                {rightPanelVisible ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Panel */}
          <div className="relative" style={{ height: `${bottomPanelHeight}px` }}>
            {/* Resize Handle */}
            <div
              className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-accent transition-colors z-10"
              onMouseDown={(e) => {
                e.preventDefault()
                const startY = e.clientY

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaY = startY - moveEvent.clientY
                  handleBottomPanelResize(deltaY)
                }

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }

                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />

            <OrdersPositionsPanel currentSymbol={symbols[0] || initialDefault} />
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
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="multi">Multi Chart</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="flex-1 min-h-0">
          {renderAnalytics()}
        </TabsContent>
        <TabsContent value="multi" className="flex-1 min-h-0">
          <MultiChartGrid />
        </TabsContent>
      </Tabs>
    </div>
  )
}
