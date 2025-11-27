import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { 
  PieChart as PieIcon, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Settings,
  RefreshCw,
  ArrowRight,
  Info,
  Trash2,
  Plus
} from 'lucide-react'
import { OpenAPI, AnalyticsService } from '../src/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queryKeys'
import { usePortfolios } from '../hooks/usePortfolios'
import { toast } from 'sonner'
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrency } from "../lib/utils";

interface AssetAllocationProps {
	portfolioId?: string
	onNavigate: (view: string) => void
}

interface SectorAlloc {
	sector: string
	value: number
	allocation_percent: number
	stock_count: number
	stocks: string[]
}

interface StockAlloc {
	symbol: string
	name: string
	sector: string
	current_value: number
	allocation_percent: number
	quantity: number
	unrealized_pnl: number
	unrealized_pnl_percent: number
}

interface AllocationTargetRow {
	id?: string
	category: string
	category_type: string
	target_percent: number
	min_percent?: number | null
	max_percent?: number | null
}

interface RebalancingSuggestion {
	symbol: string
	action: 'BUY' | 'SELL' | 'HOLD'
	currentAllocation: number
	targetAllocation: number
	deviation: number
	suggestedShares: number
	suggestedValue: number
}

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f97316','#22c55e','#eab308','#06b6d4']

const SECTOR_MAP: Record<string, string> = {
	'1': 'Banking',
	'2': 'NBFI',
	'3': 'Fuel & Power',
	'4': 'Cement',
	'5': 'Ceramics',
	'6': 'Engineering',
	'7': 'Food & Allied',
	'8': 'IT',
	'9': 'Jute',
	'10': 'Miscellaneous',
	'11': 'Paper & Printing',
	'12': 'Pharmaceuticals & Chemicals',
	'13': 'Services & Real Estate',
	'14': 'Tannery',
	'15': 'Telecommunication',
	'16': 'Travel & Leisure',
	'17': 'Textiles',
	'18': 'Mutual Funds',
	'19': 'Insurance',
}

function normalizeSector(value: any): string {
	const v = value == null ? '' : String(value).trim()
	if (!v) return 'Unknown'
	if (/^\d+$/.test(v)) return SECTOR_MAP[v] || 'Unknown'
	return v
}

export function AssetAllocation({ portfolioId: propPortfolioId, onNavigate }: AssetAllocationProps) {
	const queryClient = useQueryClient()
	const [activeTab, setActiveTab] = useState('overview')
	
	// Get portfolios list
	const { portfolios, loading: portfoliosLoading } = usePortfolios()
	
	// Manage selected portfolio internally, default to first portfolio or prop
	const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
	
	// Initialize with prop when it changes
	useEffect(() => {
		if (propPortfolioId) {
			setSelectedPortfolioId(propPortfolioId)
		}
	}, [propPortfolioId])
	
	// Auto-select first portfolio when portfolios load (if no portfolio selected)
	useEffect(() => {
		if (!selectedPortfolioId && !propPortfolioId && portfolios.length > 0) {
			console.log('[AssetAllocation] Auto-selecting first portfolio:', portfolios[0].id)
			setSelectedPortfolioId(portfolios[0].id)
		}
	}, [portfolios, propPortfolioId, selectedPortfolioId])
	
	// Use selected portfolio for queries
	const portfolioId = selectedPortfolioId

	// Debug log the portfolio ID being used
	useEffect(() => {
		console.log('[AssetAllocation] Current portfolioId:', portfolioId, 'selectedPortfolioId:', selectedPortfolioId, 'propPortfolioId:', propPortfolioId)
	}, [portfolioId, selectedPortfolioId, propPortfolioId])

	// Ensure allocation and targets refetch when portfolio selection becomes available
	useEffect(() => {
		if (portfolioId) {
			queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(portfolioId || 'none') })
			queryClient.invalidateQueries({ queryKey: queryKeys.allocationTargets(portfolioId || 'none') })
		}
	}, [portfolioId])

	const { data: allocation = { total_value: 0, sector_wise_allocation: [], stock_wise_allocation: [], concentration_risk: { top_5_holdings: 0, top_10_holdings: 0, largest_holding: 0 } }, isLoading: allocationLoading } = useQuery({
		queryKey: queryKeys.portfolioAllocation(portfolioId || 'none'),
		enabled: !!portfolioId,
		queryFn: async () => {
			if (!portfolioId) return { total_value: 0, sector_wise_allocation: [], stock_wise_allocation: [], concentration_risk: { top_5_holdings: 0, top_10_holdings: 0, largest_holding: 0 } }
			return AnalyticsService.getPortfolioAllocation({ portfolioId }) as any
		},
		refetchOnMount: 'always',
		staleTime: 30 * 1000,
	})

	const { data: targets = [] } = useQuery<AllocationTargetRow[]>({
		queryKey: queryKeys.allocationTargets(portfolioId || 'none'),
		enabled: !!portfolioId,
		queryFn: async () => {
			if (!portfolioId) return []
			const base = (OpenAPI as any).BASE || ''
			const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/portfolio/${portfolioId}/allocation/targets`, {
				headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
				credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
			})
			if (!res.ok) return []
			const rows = await res.json()
			return rows as AllocationTargetRow[]
		},
		refetchOnMount: 'always',
	})

	const [editableTargets, setEditableTargets] = useState<AllocationTargetRow[]>([])
	const [availableSectors, setAvailableSectors] = useState<string[]>([])
	const [newSectorSelect, setNewSectorSelect] = useState<string>('')

	// Fetch available sectors
	const { data: sectorsList = [] } = useQuery<string[]>({
		queryKey: ['analytics', 'sectors'],
		queryFn: async () => {
			const base = (OpenAPI as any).BASE || ''
			const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/sectors`, {
				headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
				credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
			})
			if (!res.ok) return []
			return await res.json()
		},
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	})

	useEffect(() => {
		setAvailableSectors(sectorsList)
	}, [sectorsList])

	useEffect(() => {
		const sectors: SectorAlloc[] = ((allocation as any)?.sector_wise_allocation || []).map((s: any) => ({
			sector: normalizeSector(s.sector),
			value: Number(s.value || 0),
			allocation_percent: Number(s.allocation_percent || 0),
			stock_count: Number(s.stock_count || 0),
			stocks: (s.stocks || []).map(String),
		}))
		if ((targets || []).length > 0) {
			setEditableTargets(targets.map(t => ({ ...t, category: normalizeSector(t.category) })))
		} else if (sectors.length > 0) {
			setEditableTargets(sectors.map(s => ({ category: s.sector, category_type: 'SECTOR', target_percent: Number((s.allocation_percent ?? 0).toFixed(2)) })))
		}
	}, [JSON.stringify(targets), JSON.stringify((allocation as any)?.sector_wise_allocation)])

	const saveTargetsMutation = useMutation({
		mutationFn: async () => {
			if (!portfolioId) return
			const base = (OpenAPI as any).BASE || ''
			const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/portfolio/${portfolioId}/allocation/targets`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					...(OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : {},
				},
				credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
				body: JSON.stringify({ targets: editableTargets.map(t => ({
					category: t.category,
					category_type: t.category_type || 'SECTOR',
					target_percent: Number(t.target_percent || 0),
					min_percent: t.min_percent ?? null,
					max_percent: t.max_percent ?? null,
				})) }),
			})
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({ detail: 'Failed to save targets' }))
				throw new Error(errorData.detail || 'Failed to save targets')
			}
			return await res.json()
		},
		onSuccess: () => {
			toast.success('Allocation targets saved')
			queryClient.invalidateQueries({ queryKey: queryKeys.allocationTargets(portfolioId || 'none') })
		},
		onError: (error: any) => {
			toast.error(error?.message || 'Failed to save targets')
		},
	})

	const sectors: SectorAlloc[] = useMemo(() => {
		const list = ((allocation as any)?.sector_wise_allocation || []) as SectorAlloc[]
		return list.map(s => ({ ...s, sector: normalizeSector(s.sector) }))
	}, [JSON.stringify((allocation as any)?.sector_wise_allocation)])

	const stocks: StockAlloc[] = useMemo(() => {
		return (((allocation as any)?.stock_wise_allocation || []) as StockAlloc[]).map(s => ({
			...s,
			sector: normalizeSector(s.sector)
		}))
	}, [JSON.stringify((allocation as any)?.stock_wise_allocation)])

	const donutData = useMemo(() => sectors.map((s, idx) => ({ 
		name: s.sector, 
		value: Number(s.allocation_percent || 0), 
		fill: PALETTE[idx % PALETTE.length] 
	})), [JSON.stringify(sectors)])

	const driftRows = useMemo(() => {
		const targetMap = new Map<string, number>()
		const sectorMap = new Map<string, SectorAlloc>()
		
		// Map current sectors
		for (const s of sectors) {
			sectorMap.set(s.sector, s)
		}
		
		// Map targets
		for (const t of editableTargets) {
			const normalized = normalizeSector(t.category)
			targetMap.set(normalized, Number(t.target_percent || 0))
		}
		
		// Combine sectors with holdings and targets without holdings
		const result: Array<{ sector: string; current: number; target: number; drift: number }> = []
		
		// Add sectors with current holdings
		for (const s of sectors) {
			result.push({
				sector: s.sector,
				current: Number(s.allocation_percent || 0),
				target: Number(targetMap.get(s.sector) || 0),
				drift: Number((Number(s.allocation_percent || 0) - Number(targetMap.get(s.sector) || 0)).toFixed(2)),
			})
		}
		
		// Add targets that don't have current holdings
		for (const t of editableTargets) {
			const normalized = normalizeSector(t.category)
			if (!sectorMap.has(normalized)) {
				result.push({
					sector: normalized,
					current: 0,
					target: Number(t.target_percent || 0),
					drift: Number((0 - Number(t.target_percent || 0)).toFixed(2)),
				})
			}
		}
		
		return result
	}, [JSON.stringify(sectors), JSON.stringify(editableTargets)])

	// Fetch top liquid stocks for empty sectors (for rebalancing suggestions)
	const emptySectorsWithTargets = useMemo(() => {
		return driftRows.filter(d => d.current === 0 && d.target > 0).map(d => d.sector);
	}, [driftRows]);

	// Fetch liquid stocks for first empty sector (we'll fetch others on demand)
	// For simplicity, we'll fetch all at once using a single query that handles multiple sectors
	const liquidStocksMap = useQuery<Record<string, any[]>>({
		queryKey: ['analytics', 'stocks-by-sector', emptySectorsWithTargets.join(',')],
		queryFn: async () => {
			const base = (OpenAPI as any).BASE || ''
			const map: Record<string, any[]> = {}
			
			// Fetch liquid stocks for each empty sector
			await Promise.all(emptySectorsWithTargets.map(async (sector) => {
				try {
					const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/analytics/stocks/by-sector?sector=${encodeURIComponent(sector)}&limit=3`, {
						headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
						credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
					})
					if (res.ok) {
						map[sector] = await res.json()
					} else {
						map[sector] = []
					}
				} catch {
					map[sector] = []
				}
			}))
			
			return map
		},
		enabled: emptySectorsWithTargets.length > 0,
		staleTime: 5 * 60 * 1000,
	})

	// Calculate rebalancing suggestions
	const rebalancingSuggestions = useMemo(() => {
		if (!editableTargets.length) return [];
		
		const totalValue = allocation.total_value || 0;
		const suggestions: RebalancingSuggestion[] = [];
		
		// Group stocks by sector
		const stocksBySector = new Map<string, StockAlloc[]>();
		stocks.forEach(stock => {
			const sector = normalizeSector(stock.sector);
			if (!stocksBySector.has(sector)) {
				stocksBySector.set(sector, []);
			}
			stocksBySector.get(sector)!.push(stock);
		});

		// Calculate rebalancing for each sector
		driftRows.forEach(drift => {
			// For empty sectors with targets, always suggest (drift will be negative)
			// For sectors with holdings, only suggest if drift > 1%
			const shouldSuggest = drift.current === 0 && drift.target > 0 ? true : Math.abs(drift.drift) > 1;
			
			if (shouldSuggest) {
				const sectorStocks = stocksBySector.get(drift.sector) || [];
				// Use a minimum portfolio value for empty sectors if totalValue is 0
				const effectiveTotalValue = totalValue > 0 ? totalValue : 10000; // Default $10k for empty portfolio
				const targetValue = (drift.target / 100) * effectiveTotalValue;
				const currentValue = (drift.current / 100) * effectiveTotalValue;
				const difference = targetValue - currentValue;

				// Handle sectors with no holdings - recommend top liquid stocks
				if (sectorStocks.length === 0 && drift.current === 0 && drift.target > 0) {
					// Find liquid stocks for this sector
					const liquidStocks = liquidStocksMap.data?.[drift.sector] || [];
					
					if (liquidStocks.length > 0) {
						// Split target value equally across top 3 stocks
						const valuePerStock = targetValue / liquidStocks.length;
						liquidStocks.forEach((stock: any) => {
							if (stock.current_price > 0) {
								const suggestedShares = Math.round(valuePerStock / stock.current_price);
								if (suggestedShares > 0) {
									suggestions.push({
										symbol: stock.symbol,
										action: 'BUY',
										currentAllocation: 0,
										targetAllocation: drift.target,
										deviation: drift.drift,
										suggestedShares,
										suggestedValue: valuePerStock,
									});
								}
							}
						});
					}
				} else if (sectorStocks.length > 0) {
					// Existing logic for sectors with holdings
					sectorStocks.forEach(stock => {
						const stockValue = stock.current_value;
						const stockProportion = sectorStocks.length > 0 
							? stockValue / sectorStocks.reduce((sum, s) => sum + s.current_value, 0)
							: 1;
						
						const suggestedValueChange = difference * stockProportion;
						const currentPrice = stock.current_value / stock.quantity;
						const suggestedShares = Math.round(suggestedValueChange / currentPrice);

						if (Math.abs(suggestedShares) > 0) {
							suggestions.push({
								symbol: stock.symbol,
								action: suggestedShares > 0 ? 'BUY' : 'SELL',
								currentAllocation: stock.allocation_percent,
								targetAllocation: drift.target,
								deviation: drift.drift,
								suggestedShares: Math.abs(suggestedShares),
								suggestedValue: Math.abs(suggestedValueChange),
							});
						}
					});
				}
			}
		});

		return suggestions.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
	}, [stocks, driftRows, editableTargets, allocation.total_value, liquidStocksMap.data]);

	const totalTarget = editableTargets.reduce((sum, t) => sum + Number(t.target_percent || 0), 0)
	const formatNumber = (num: number) => {
		if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
		if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
		if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
		return num.toFixed(0);
	};

	if (!portfolioId) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="text-center py-8 text-muted-foreground">
						Please select a portfolio to view asset allocation
					</div>
				</CardContent>
			</Card>
		);
	}

	if (allocationLoading) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-center py-8">
						<RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-3xl font-semibold text-foreground mb-2">Asset Allocation Analysis</h1>
					<p className="text-muted-foreground text-lg">Interactive asset allocation breakdown with rebalancing recommendations</p>
				</div>
				<div className="flex items-center gap-2">
					<Select value={selectedPortfolioId || ''} onValueChange={setSelectedPortfolioId}>
						<SelectTrigger className="w-[280px]">
							<SelectValue placeholder={portfoliosLoading ? "Loading portfolios..." : "Select portfolio"} />
						</SelectTrigger>
						<SelectContent>
							{portfolios.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.name} {p.description && `- ${p.description}`}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.portfolioAllocation(portfolioId || 'none') })} className="gap-2">
						<RefreshCw className="h-4 w-4" /> Refresh
					</Button>
					<Button variant="outline" onClick={() => onNavigate('rebalancing')} className="gap-2">
						<AlertTriangle className="h-4 w-4" /> Rebalancing Tool
					</Button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatCurrency(allocation.total_value || 0)}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Sectors</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{sectors.length}</div>
						<p className="text-xs text-muted-foreground mt-1">Diversification</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Holdings</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stocks.length}</div>
						<p className="text-xs text-muted-foreground mt-1">Total Stocks</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Largest Position</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{((allocation as any)?.concentration_risk?.largest_holding || 0).toFixed(1)}%</div>
						<p className="text-xs text-muted-foreground mt-1">Concentration</p>
					</CardContent>
				</Card>
			</div>

			{/* Main Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="sectors">Sectors</TabsTrigger>
					<TabsTrigger value="stocks">Stocks</TabsTrigger>
					<TabsTrigger value="targets">Targets</TabsTrigger>
					<TabsTrigger value="rebalancing">
						Rebalancing
						{rebalancingSuggestions.length > 0 && (
							<Badge variant="destructive" className="ml-2">{rebalancingSuggestions.length}</Badge>
						)}
					</TabsTrigger>
				</TabsList>

				{/* Overview Tab */}
				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<PieIcon className="h-5 w-5" /> Sector Allocation
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="h-80">
									<ResponsiveContainer width="100%" height="100%">
										<RechartsPieChart>
											<Pie 
												data={donutData} 
												dataKey="value" 
												nameKey="name" 
												innerRadius={60} 
												outerRadius={100}
												label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
											>
												{donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
											</Pie>
											<Tooltip formatter={(value: any) => `${Number(value).toFixed(2)}%`} />
											<Legend />
										</RechartsPieChart>
									</ResponsiveContainer>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Concentration Risk</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm">Largest Single Holding</span>
										<span className="text-sm font-medium">{((allocation as any)?.concentration_risk?.largest_holding || 0).toFixed(2)}%</span>
									</div>
									<Progress value={Number((allocation as any)?.concentration_risk?.largest_holding || 0)} className="h-2" />
									{((allocation as any)?.concentration_risk?.largest_holding || 0) > 20 && (
										<p className="text-xs text-yellow-600 flex items-center gap-1">
											<Info className="h-3 w-3" />
											Consider reducing exposure to largest holding
										</p>
									)}
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm">Top 5 Holdings</span>
										<span className="text-sm font-medium">{((allocation as any)?.concentration_risk?.top_5_holdings || 0).toFixed(2)}%</span>
									</div>
									<Progress value={Number((allocation as any)?.concentration_risk?.top_5_holdings || 0)} className="h-2" />
									{((allocation as any)?.concentration_risk?.top_5_holdings || 0) > 50 && (
										<p className="text-xs text-yellow-600 flex items-center gap-1">
											<Info className="h-3 w-3" />
											High concentration in top holdings
										</p>
									)}
								</div>

								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-sm">Top 10 Holdings</span>
										<span className="text-sm font-medium">{((allocation as any)?.concentration_risk?.top_10_holdings || 0).toFixed(2)}%</span>
									</div>
									<Progress value={Number((allocation as any)?.concentration_risk?.top_10_holdings || 0)} className="h-2" />
								</div>

								<div className="mt-4 p-3 bg-muted rounded-lg">
									<p className="text-xs text-muted-foreground">
										<strong>Risk Assessment:</strong><br/>
										{((allocation as any)?.concentration_risk?.largest_holding || 0) > 20 
											? "High concentration risk detected" 
											: ((allocation as any)?.concentration_risk?.top_5_holdings || 0) > 60
											? "Moderate concentration risk"
											: "Well diversified portfolio"}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Sector Diversity</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{sectors.length}</div>
								<p className="text-sm text-muted-foreground mt-1">
									Across {stocks.length} holdings
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Target Alignment</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">
									{driftRows.filter(d => Math.abs(d.drift) < 2).length}/{driftRows.length}
								</div>
								<p className="text-sm text-muted-foreground mt-1">
									Sectors within 2% of target
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="text-base">Rebalancing Needed</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold text-yellow-600">
									{rebalancingSuggestions.length}
								</div>
								<p className="text-sm text-muted-foreground mt-1">
									Actions recommended
								</p>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				{/* Sectors Tab */}
				<TabsContent value="sectors" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Sector Breakdown</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
								<div className="h-96">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={sectors.map((s, idx) => ({ ...s, fill: PALETTE[idx % PALETTE.length] }))}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="sector" angle={-45} textAnchor="end" height={100} />
											<YAxis label={{ value: 'Allocation %', angle: -90, position: 'insideLeft' }} />
											<Tooltip />
											<Bar dataKey="allocation_percent" fill="#3b82f6">
												{sectors.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</div>

								<div className="space-y-3">
									{sectors.map((s, idx) => (
										<Card key={s.sector} className="p-4">
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													<div className="w-4 h-4 rounded" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
													<span className="font-medium">{s.sector}</span>
												</div>
												<Badge>{(s.allocation_percent ?? 0).toFixed(2)}%</Badge>
											</div>
											<div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
												<div>Value: {formatCurrency(s.value)}</div>
												<div>Stocks: {s.stock_count}</div>
											</div>
											<Progress value={s.allocation_percent} className="h-2 mt-2" />
										</Card>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Stocks Tab */}
				<TabsContent value="stocks" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Stock-wise Allocation</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Symbol</TableHead>
										<TableHead>Company</TableHead>
										<TableHead>Sector</TableHead>
										<TableHead className="text-right">Quantity</TableHead>
										<TableHead className="text-right">Value</TableHead>
										<TableHead className="text-right">Allocation</TableHead>
										<TableHead className="text-right">P&L</TableHead>
										<TableHead className="text-right">P&L %</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{stocks.map((stock, idx) => (
										<TableRow key={`${stock.symbol}-${idx}`}>
											<TableCell className="font-medium">{stock.symbol}</TableCell>
											<TableCell className="max-w-[200px] truncate">{stock.name}</TableCell>
											<TableCell>
												<Badge variant="outline">{stock.sector}</Badge>
											</TableCell>
											<TableCell className="text-right">{stock.quantity}</TableCell>
											<TableCell className="text-right">{formatCurrency(stock.current_value)}</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end gap-2">
													<Progress value={stock.allocation_percent} className="h-2 w-16" />
													<span className="font-medium">{(stock.allocation_percent ?? 0).toFixed(2)}%</span>
												</div>
											</TableCell>
											<TableCell className={`text-right ${stock.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												{formatCurrency(stock.unrealized_pnl)}
											</TableCell>
											<TableCell className={`text-right ${stock.unrealized_pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												<div className="flex items-center justify-end gap-1">
													{stock.unrealized_pnl_percent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
													{(stock.unrealized_pnl_percent ?? 0).toFixed(2)}%
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Targets Tab */}
				<TabsContent value="targets" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle className="flex items-center gap-2">
									<Target className="h-5 w-5" /> Target Allocation Management
								</CardTitle>
								<div className="flex items-center gap-2">
									<Button variant="outline" size="sm" onClick={() => {
										setEditableTargets(sectors.map(s => ({ 
											category: s.sector, 
											category_type: 'SECTOR', 
											target_percent: Number((s.allocation_percent ?? 0).toFixed(2)) 
										})))
									}}>
										Reset to Current
									</Button>
									<Button variant="outline" size="sm" onClick={() => {
										if (sectors.length === 0) return
										const eq = Number((100 / sectors.length).toFixed(2))
										setEditableTargets(sectors.map(s => ({ 
											category: s.sector, 
											category_type: 'SECTOR', 
											target_percent: eq 
										})))
									}}>
										Equal Weight
									</Button>
									<Button 
										onClick={() => saveTargetsMutation.mutate()} 
										disabled={saveTargetsMutation.isPending || Math.abs(100 - totalTarget) > 0.5}
										className="gap-2"
									>
										<Settings className="h-4 w-4" />
										Save Targets
									</Button>
								</div>
							</div>
							<div className="mt-2">
								<p className="text-sm text-muted-foreground">
									Total target: <span className={`font-medium ${Math.abs(100 - totalTarget) < 0.5 ? 'text-green-600' : 'text-red-600'}`}>
										{totalTarget.toFixed(2)}%
									</span>
									{Math.abs(100 - totalTarget) > 0.5 && (
										<span className="text-red-600 ml-2">(Must equal 100%)</span>
									)}
								</p>
							</div>
						</CardHeader>
						<CardContent>
							{/* Add Sector Control */}
							<div className="mb-4 flex items-center gap-2">
								<Select value={newSectorSelect} onValueChange={setNewSectorSelect}>
									<SelectTrigger className="w-[250px]">
										<SelectValue placeholder="Select sector to add" />
									</SelectTrigger>
									<SelectContent>
										{availableSectors
											.filter(s => !editableTargets.some(t => normalizeSector(t.category) === normalizeSector(s)))
											.map(sector => (
												<SelectItem key={sector} value={sector}>
													{sector}
												</SelectItem>
											))}
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										if (!newSectorSelect) return
										const normalized = normalizeSector(newSectorSelect)
										// Check if already exists
										if (editableTargets.some(t => normalizeSector(t.category) === normalized)) {
											toast.error('Sector already added')
											return
										}
										setEditableTargets(prev => [...prev, {
											category: normalized,
											category_type: 'SECTOR',
											target_percent: 0,
											min_percent: null,
											max_percent: null,
										}])
										setNewSectorSelect('')
									}}
									disabled={!newSectorSelect}
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Add Sector
								</Button>
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Sector</TableHead>
										<TableHead className="text-right">Current %</TableHead>
										<TableHead className="text-right">Target %</TableHead>
										<TableHead className="text-right">Min %</TableHead>
										<TableHead className="text-right">Max %</TableHead>
										<TableHead className="text-right">Drift</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{driftRows.map((row) => {
										const target = editableTargets.find(t => normalizeSector(t.category) === row.sector);
										if (!target) return null
										return (
											<TableRow key={row.sector}>
												<TableCell className="font-medium">{row.sector}</TableCell>
												<TableCell className="text-right">{row.current.toFixed(2)}%</TableCell>
												<TableCell className="text-right">
													<Input
														type="number"
														step="0.1"
														min="0"
														max="100"
														value={Number(target?.target_percent ?? 0).toFixed(2)}
														onChange={(e) => {
															const v = Number(e.target.value || 0)
															setEditableTargets(prev => prev.map(t => normalizeSector(t.category) === row.sector ? { ...t, target_percent: v } : t))
														}}
														className="w-20 h-8 text-right"
													/>
												</TableCell>
												<TableCell className="text-right">
													<Input
														type="number"
														step="0.1"
														min="0"
														max="100"
														value={Number(target?.min_percent ?? 0).toFixed(2)}
														onChange={(e) => {
															const v = Number(e.target.value || 0)
															setEditableTargets(prev => prev.map(t => normalizeSector(t.category) === row.sector ? { ...t, min_percent: v } : t))
														}}
														className="w-20 h-8 text-right"
														placeholder="0"
													/>
												</TableCell>
												<TableCell className="text-right">
													<Input
														type="number"
														step="0.1"
														min="0"
														max="100"
														value={Number(target?.max_percent ?? 0).toFixed(2)}
														onChange={(e) => {
															const v = Number(e.target.value || 0)
															setEditableTargets(prev => prev.map(t => normalizeSector(t.category) === row.sector ? { ...t, max_percent: v } : t))
														}}
														className="w-20 h-8 text-right"
														placeholder="100"
													/>
												</TableCell>
												<TableCell className="text-right">
													<Badge 
														variant={Math.abs(row.drift) < 2 ? 'outline' : Math.abs(row.drift) < 5 ? 'secondary' : 'destructive'}
													>
														{row.drift > 0 ? '+' : ''}{row.drift.toFixed(2)}%
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => {
															setEditableTargets(prev => prev.filter(t => normalizeSector(t.category) !== row.sector))
														}}
														className="h-8 w-8 p-0 text-destructive hover:text-destructive"
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Rebalancing Tab */}
				<TabsContent value="rebalancing" className="space-y-4">
					{rebalancingSuggestions.length === 0 ? (
						<Card>
							<CardContent className="pt-6">
								<div className="text-center py-8">
									<Target className="h-12 w-12 mx-auto text-green-600 mb-4" />
									<h3 className="text-lg font-semibold mb-2">Portfolio is Balanced</h3>
									<p className="text-muted-foreground">
										Your current allocation is within 1% of your targets. No rebalancing needed at this time.
									</p>
								</div>
							</CardContent>
						</Card>
					) : (
						<>
							<Card className="bg-yellow-50 border-yellow-200">
								<CardContent className="pt-6">
									<div className="flex items-start gap-3">
										<AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
										<div>
											<h3 className="font-semibold text-yellow-900">Rebalancing Recommended</h3>
											<p className="text-sm text-yellow-700 mt-1">
												Your portfolio has drifted from target allocation. Consider these actions to realign with your investment strategy.
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Recommended Actions</CardTitle>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Symbol</TableHead>
												<TableHead>Action</TableHead>
												<TableHead className="text-right">Current %</TableHead>
												<TableHead className="text-right">Target %</TableHead>
												<TableHead className="text-right">Deviation</TableHead>
												<TableHead className="text-right">Suggested Shares</TableHead>
												<TableHead className="text-right">Est. Value</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{rebalancingSuggestions.map((suggestion, idx) => (
												<TableRow key={`${suggestion.symbol}-${idx}`}>
													<TableCell className="font-medium">{suggestion.symbol}</TableCell>
													<TableCell>
														<Badge 
															variant={suggestion.action === 'BUY' ? 'default' : 'destructive'}
															className={suggestion.action === 'BUY' ? 'bg-green-600' : ''}
														>
															{suggestion.action}
														</Badge>
													</TableCell>
													<TableCell className="text-right">{suggestion.currentAllocation.toFixed(2)}%</TableCell>
													<TableCell className="text-right">{suggestion.targetAllocation.toFixed(2)}%</TableCell>
													<TableCell className="text-right">
														<Badge variant={Math.abs(suggestion.deviation) > 5 ? 'destructive' : 'secondary'}>
															{suggestion.deviation > 0 ? '+' : ''}{suggestion.deviation.toFixed(2)}%
														</Badge>
													</TableCell>
													<TableCell className="text-right font-medium">
														{suggestion.suggestedShares} shares
													</TableCell>
													<TableCell className="text-right">{formatCurrency(suggestion.suggestedValue)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>

									<div className="mt-4 p-4 bg-muted rounded-lg">
										<h4 className="font-semibold mb-2">Total Rebalancing Impact</h4>
										<div className="grid grid-cols-2 gap-4 text-sm">
											<div>
												<span className="text-muted-foreground">Buy Orders:</span>
												<span className="font-medium ml-2">{rebalancingSuggestions.filter(s => s.action === 'BUY').length}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Sell Orders:</span>
												<span className="font-medium ml-2">{rebalancingSuggestions.filter(s => s.action === 'SELL').length}</span>
											</div>
											<div>
												<span className="text-muted-foreground">Est. Buy Value:</span>
												<span className="font-medium ml-2">
													{formatCurrency(rebalancingSuggestions.filter(s => s.action === 'BUY').reduce((sum, s) => sum + s.suggestedValue, 0))}
												</span>
											</div>
											<div>
												<span className="text-muted-foreground">Est. Sell Value:</span>
												<span className="font-medium ml-2">
													{formatCurrency(rebalancingSuggestions.filter(s => s.action === 'SELL').reduce((sum, s) => sum + s.suggestedValue, 0))}
												</span>
											</div>
										</div>
										<Button className="w-full mt-4 gap-2" onClick={() => onNavigate('rebalancing')}>
											<ArrowRight className="h-4 w-4" />
											Go to Rebalancing Tool
										</Button>
									</div>
								</CardContent>
							</Card>
						</>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
