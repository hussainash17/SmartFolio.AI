import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { PieChart as PieIcon, Target, AlertTriangle } from 'lucide-react'
import { OpenAPI, AnalyticsService } from '../src/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queryKeys'
import { toast } from 'sonner'
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

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

export function AssetAllocation({ portfolioId, onNavigate }: AssetAllocationProps) {
	const queryClient = useQueryClient()

	const { data: allocation = { total_value: 0, sector_wise_allocation: [], stock_wise_allocation: [], concentration_risk: { top_5_holdings: 0, top_10_holdings: 0, largest_holding: 0 } } } = useQuery({
		queryKey: queryKeys.portfolioAllocation(portfolioId || 'none'),
		enabled: !!portfolioId,
		queryFn: async () => {
			if (!portfolioId) return { total_value: 0, sector_wise_allocation: [], stock_wise_allocation: [], concentration_risk: { top_5_holdings: 0, top_10_holdings: 0, largest_holding: 0 } }
			return AnalyticsService.getPortfolioAllocation({ portfolioId }) as any
		},
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
	})

	const [editableTargets, setEditableTargets] = useState<AllocationTargetRow[]>([])

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
			setEditableTargets(sectors.map(s => ({ category: s.sector, category_type: 'SECTOR', target_percent: Number(s.allocation_percent.toFixed(2)) })))
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
			if (!res.ok) throw new Error('Failed to save targets')
			return await res.json()
		},
		onSuccess: () => {
			toast.success('Allocation targets saved')
			queryClient.invalidateQueries({ queryKey: queryKeys.allocationTargets(portfolioId || 'none') })
		},
		onError: () => toast.error('Failed to save targets'),
	})

	const sectors: SectorAlloc[] = useMemo(() => {
		const list = ((allocation as any)?.sector_wise_allocation || []) as SectorAlloc[]
		return list.map(s => ({ ...s, sector: normalizeSector(s.sector) }))
	}, [JSON.stringify((allocation as any)?.sector_wise_allocation)])

	const stocks: StockAlloc[] = useMemo(() => {
		return (((allocation as any)?.stock_wise_allocation || []) as StockAlloc[])
	}, [JSON.stringify((allocation as any)?.stock_wise_allocation)])

	const donutData = useMemo(() => sectors.map((s, idx) => ({ name: s.sector, value: Number(s.allocation_percent || 0), fill: PALETTE[idx % PALETTE.length] })), [JSON.stringify(sectors)])

	const driftRows = useMemo(() => {
		const targetMap = new Map<string, number>()
		for (const t of editableTargets) {
			targetMap.set(normalizeSector(t.category), Number(t.target_percent || 0))
		}
		return sectors.map(s => ({
			sector: s.sector,
			current: Number(s.allocation_percent || 0),
			target: Number(targetMap.get(s.sector) || 0),
			drift: Number((Number(s.allocation_percent || 0) - Number(targetMap.get(s.sector) || 0)).toFixed(2)),
		}))
	}, [JSON.stringify(sectors), JSON.stringify(editableTargets)])

	const totalTarget = editableTargets.reduce((sum, t) => sum + Number(t.target_percent || 0), 0)

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1>Asset Allocation</h1>
					<p className="text-muted-foreground">Interactive allocation visualization and target management</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => onNavigate('rebalancing')} className="gap-2">
						<AlertTriangle className="h-4 w-4" /> Rebalancing
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5" /> Sector Allocation</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<div className="h-72">
								<ResponsiveContainer width="100%" height="100%">
									<RechartsPieChart>
										<Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
											{donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
										</Pie>
										<Tooltip />
										<Legend />
									</RechartsPieChart>
								</ResponsiveContainer>
							</div>
							<div className="space-y-3">
								{sectors.map((s, idx) => (
									<div key={s.sector} className="space-y-2">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<div className="w-3 h-3 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
												<span className="text-sm">{s.sector}</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium">{s.allocation_percent}%</span>
											</div>
										</div>
										<Progress value={Number(s.allocation_percent)} className="h-2" />
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top Holdings</CardTitle>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Symbol</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Sector</TableHead>
									<TableHead className="text-right">Allocation</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(stocks || []).slice(0, 10).map((st, idx) => (
									<TableRow key={`${st.symbol}-${idx}`}>
										<TableCell className="font-medium">{st.symbol}</TableCell>
										<TableCell>{st.name}</TableCell>
										<TableCell>{normalizeSector(st.sector)}</TableCell>
										<TableCell className="text-right">{Number(st.allocation_percent || 0).toFixed(2)}%</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Target Allocation</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between mb-4">
							<div className="text-sm text-muted-foreground">Total target: <span className={`font-medium ${Math.abs(100 - totalTarget) < 0.01 ? 'text-green-600' : 'text-yellow-600'}`}>{totalTarget.toFixed(2)}%</span></div>
							<div className="flex items-center gap-2">
								<Button variant="outline" onClick={() => {
									setEditableTargets(sectors.map(s => ({ category: s.sector, category_type: 'SECTOR', target_percent: Number(s.allocation_percent.toFixed(2)) })))
								}}>Reset to Current</Button>
								<Button variant="outline" onClick={() => {
									if (sectors.length === 0) return
									const eq = Number((100 / sectors.length).toFixed(2))
									setEditableTargets(sectors.map(s => ({ category: s.sector, category_type: 'SECTOR', target_percent: eq })))
								}}>Equal Weight</Button>
								<Button onClick={() => saveTargetsMutation.mutate()} disabled={saveTargetsMutation.isPending}>Save Targets</Button>
							</div>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Sector</TableHead>
									<TableHead className="text-right">Current</TableHead>
									<TableHead className="text-right">Target</TableHead>
									<TableHead className="text-right">Drift</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{driftRows.map((row) => (
									<TableRow key={row.sector}>
										<TableCell className="font-medium">{row.sector}</TableCell>
										<TableCell className="text-right">{row.current.toFixed(2)}%</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center gap-2 justify-end">
												<Input
													type="number"
													step="0.1"
													value={Number((editableTargets.find(t => normalizeSector(t.category) === row.sector)?.target_percent ?? 0).toFixed(2))}
													onChange={(e) => {
														const v = Number(e.target.value || 0)
														setEditableTargets(prev => prev.map(t => normalizeSector(t.category) === row.sector ? { ...t, target_percent: v } : t))
													}}
													className="w-24 h-8 text-right"
												/>
												<span className="text-xs text-muted-foreground">%</span>
											</div>
										</TableCell>
										<TableCell className="text-right">
											<Badge variant={Math.abs(row.drift) < 1 ? 'outline' : 'secondary'} className={Math.abs(row.drift) >= 3 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}>{row.drift > 0 ? '+' : ''}{row.drift.toFixed(2)}%</Badge>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Concentration Risk</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm">Top 5 holdings</span>
								<span className="text-sm font-medium">{Number((allocation as any)?.concentration_risk?.top_5_holdings || 0).toFixed(2)}%</span>
							</div>
							<Progress value={Number((allocation as any)?.concentration_risk?.top_5_holdings || 0)} className="h-2" />
							<div className="flex items-center justify-between">
								<span className="text-sm">Top 10 holdings</span>
								<span className="text-sm font-medium">{Number((allocation as any)?.concentration_risk?.top_10_holdings || 0).toFixed(2)}%</span>
							</div>
							<Progress value={Number((allocation as any)?.concentration_risk?.top_10_holdings || 0)} className="h-2" />
							<div className="flex items-center justify-between">
								<span className="text-sm">Largest holding</span>
								<span className="text-sm font-medium">{Number((allocation as any)?.concentration_risk?.largest_holding || 0).toFixed(2)}%</span>
							</div>
							<Progress value={Number((allocation as any)?.concentration_risk?.largest_holding || 0)} className="h-2" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}