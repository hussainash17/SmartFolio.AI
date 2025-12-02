import { useState, useEffect } from 'react'
import { Card, CardContent } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Activity, Plus, ChevronDown, MoreVertical, Star, Trash2, Edit2, Settings } from 'lucide-react'
import { MarketService } from '../src/client'
import { useWatchlists } from '../hooks/useWatchlists'
import { useWatchlistItems } from '../hooks/useWatchlistItems'
import { Button } from './ui/button'
import { formatPrice, formatChange, getChangeColor, getChangeIcon } from '../lib/formatting-utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface WatchlistPanelProps {
    currentSymbol: string
    onSymbolSelect: (symbol: string) => void
}

interface MarketMover {
    symbol: string
    company_name?: string
    change_percent?: number
    last_trade_price?: number
}

export function WatchlistPanel({ currentSymbol, onSymbolSelect }: WatchlistPanelProps) {
    const [activeTab, setActiveTab] = useState<'watchlist' | 'movers' | 'active'>('watchlist')
    const [topMovers, setTopMovers] = useState<MarketMover[]>([])
    const [mostActive, setMostActive] = useState<MarketMover[]>([])
    const [loading, setLoading] = useState(false)

    // Watchlist hooks
    const {
        watchlists,
        selectedWatchlistId,
        loading: watchlistsLoading,
        selectWatchlist,
        deleteWatchlist,
        setDefaultWatchlist
    } = useWatchlists()

    const {
        items: watchlistItems,
        loading: itemsLoading,
        removeItem
    } = useWatchlistItems(selectedWatchlistId)

    const selectedWatchlist = watchlists.find(w => w.id === selectedWatchlistId)

    useEffect(() => {
        if (activeTab === 'movers') loadTopMovers()
    }, [activeTab === 'movers'])

    useEffect(() => {
        if (activeTab === 'active') loadMostActive()
    }, [activeTab === 'active'])

    const loadTopMovers = async () => {
        setLoading(true)
        try {
            const data = await MarketService.getTopMovers({ limit: 10 }) as any
            // API returns { gainers: [...], losers: [...] }
            const gainers = (data?.gainers || []) as MarketMover[]
            const losers = (data?.losers || []) as MarketMover[]

            // Combine gainers and losers, sorted by absolute change percent
            const allMovers = [...gainers, ...losers].sort((a, b) => {
                const aChange = Math.abs(a.change_percent || 0)
                const bChange = Math.abs(b.change_percent || 0)
                return bChange - aChange
            })

            setTopMovers(allMovers)
        } catch (error) {
            console.error('Error loading top movers:', error)
            setTopMovers([])
        } finally {
            setLoading(false)
        }
    }

    const loadMostActive = async () => {
        setLoading(true)
        try {
            const data = await MarketService.getMostActive({ limit: 10 }) as any
            // Most active usually returns an array directly
            const activeStocks = Array.isArray(data) ? data : []
            setMostActive(activeStocks as MarketMover[])
        } catch (error) {
            console.error('Error loading most active:', error)
            setMostActive([])
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteWatchlist = async () => {
        if (!selectedWatchlistId) return

        if (confirm('Are you sure you want to delete this watchlist?')) {
            try {
                await deleteWatchlist(selectedWatchlistId)
            } catch (err) {
                alert('Failed to delete watchlist')
            }
        }
    }

    const handleSetDefault = async () => {
        if (!selectedWatchlistId) return

        try {
            await setDefaultWatchlist(selectedWatchlistId)
        } catch (err) {
            alert('Failed to set as default')
        }
    }

    const handleRemoveStock = async (itemId: string) => {
        if (confirm('Remove this stock from watchlist?')) {
            try {
                await removeItem(itemId)
            } catch (err) {
                alert('Failed to remove stock')
            }
        }
    }


    const isWatchlistLoading = watchlistsLoading || itemsLoading

    return (
        <Card className="h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
                {/* Tab Headers */}
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
                    <TabsTrigger value="movers">Movers</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                </TabsList>

                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    {/* Watchlist Tab - with dropdown selector */}
                    <TabsContent value="watchlist" className="mt-0 flex-1 flex flex-col overflow-hidden">
                        {/* Watchlist Selector - Only visible in Watchlist tab */}
                        <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="flex-1 justify-between h-9 text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {selectedWatchlist?.is_default && (
                                                <Star className="w-3 h-3 flex-shrink-0 fill-amber-400 text-amber-400" />
                                            )}
                                            <span className="truncate">
                                                {selectedWatchlist?.name || 'Select Watchlist'}
                                            </span>
                                            {watchlistItems.length > 0 && (
                                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                                    ({watchlistItems.length})
                                                </span>
                                            )}
                                        </div>
                                        <ChevronDown className="w-3 h-3 ml-2 opacity-50 flex-shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[240px]">
                                    {watchlists.map((wl) => (
                                        <DropdownMenuItem
                                            key={wl.id}
                                            onClick={() => selectWatchlist(wl.id)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            {wl.is_default && (
                                                <Star className="w-3 h-3 flex-shrink-0 fill-amber-400 text-amber-400" />
                                            )}
                                            <span className="flex-1 truncate text-sm">{wl.name}</span>
                                        </DropdownMenuItem>
                                    ))}
                                    {watchlists.length > 0 && <DropdownMenuSeparator />}
                                    <DropdownMenuItem className="text-primary cursor-pointer">
                                        <Plus className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Create New Watchlist</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[200px]">
                                    <DropdownMenuItem onClick={handleSetDefault} className="cursor-pointer">
                                        <Star className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Set as Default</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Rename</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                        <Settings className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Manage All</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive cursor-pointer"
                                        onClick={handleDeleteWatchlist}
                                        disabled={watchlists.length <= 1}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        <span className="text-sm">Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Watchlist Content */}
                        <div className="flex-1 overflow-y-auto">
                            {isWatchlistLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <div className="text-sm text-muted-foreground">Loading...</div>
                                </div>
                            ) : watchlistItems.length > 0 ? (
                                <>
                                    <div className="divide-y">
                                        {watchlistItems.map((item) => (
                                            <button
                                                key={item.item_id}
                                                onClick={() => onSymbolSelect(item.symbol)}
                                                className={`w-full px-4 py-3 text-left hover:bg-accent transition-colors ${currentSymbol === item.symbol ? 'bg-accent' : ''
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-sm">{item.symbol}</div>
                                                        <div className="text-base font-mono font-medium">
                                                            {formatPrice(item.last_trade_price)}
                                                        </div>
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-xs font-medium ${getChangeColor(item.change)}`}>
                                                        {getChangeIcon(item.change)}
                                                        <span className="whitespace-nowrap">
                                                            {formatChange(item.change, item.change_percent)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        className="w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2 border-t"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Symbol
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full px-4 py-8">
                                    <p className="text-sm text-muted-foreground mb-3 text-center">
                                        {selectedWatchlist ? 'This watchlist is empty' : 'No watchlist selected'}
                                    </p>
                                    {selectedWatchlist && (
                                        <Button variant="outline" size="sm">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Symbols
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Movers Tab - No watchlist dropdown */}
                    <TabsContent value="movers" className="mt-0 flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-sm text-muted-foreground">Loading...</div>
                            </div>
                        ) : topMovers.length > 0 ? (
                            <div className="divide-y">
                                {topMovers.map((mover) => (
                                    <button
                                        key={mover.symbol}
                                        onClick={() => onSymbolSelect(mover.symbol)}
                                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm">{mover.symbol}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {mover.company_name || mover.symbol}
                                                </div>
                                            </div>
                                            <div className={`text-sm font-medium whitespace-nowrap ${getChangeColor(mover.change_percent)}`}>
                                                {mover.change_percent !== undefined && mover.change_percent !== null
                                                    ? `${mover.change_percent >= 0 ? '+' : ''}${mover.change_percent.toFixed(2)}%`
                                                    : '--'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 px-4 text-center text-sm text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </TabsContent>

                    {/* Active Tab - No watchlist dropdown */}
                    <TabsContent value="active" className="mt-0 flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="text-sm text-muted-foreground">Loading...</div>
                            </div>
                        ) : mostActive.length > 0 ? (
                            <div className="divide-y">
                                {mostActive.map((stock) => (
                                    <button
                                        key={stock.symbol}
                                        onClick={() => onSymbolSelect(stock.symbol)}
                                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm">{stock.symbol}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {stock.company_name || stock.symbol}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Activity className="w-3 h-3 flex-shrink-0" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 px-4 text-center text-sm text-muted-foreground">
                                No data available
                            </div>
                        )}
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    )
}
