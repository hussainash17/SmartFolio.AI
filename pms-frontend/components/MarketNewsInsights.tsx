import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queryKeys'
import { useApi } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { TrendingUp, TrendingDown, Activity, Gauge, Calendar, Newspaper, BarChart3 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import { HoverCard, HoverCardTrigger, HoverCardContent } from './ui/hover-card'

const NEWS_CATEGORY_OPTIONS = [
	{ label: 'All', value: 'all' },
	{ label: 'Market', value: 'market' },
	{ label: 'Company', value: 'company' },
	{ label: 'Economy', value: 'economy' },
	{ label: 'Sector', value: 'sector' },
]

const NEWS_DAYS_OPTIONS = [1, 3, 7, 14, 30]
const NEWS_LIMIT_OPTIONS = [10, 20, 30, 50]

export default function MarketNewsInsights() {
	const queryClient = useQueryClient()
	// Market overview
	const { data: indices } = useApi<any>(`/api/v1/market/indices`, queryKeys.indices)
	const { data: summary } = useApi<any>(`/api/v1/market/summary`, queryKeys.dashboardSummary)
	const { data: movers } = useApi<any>(`/api/v1/market/top-movers?limit=5`, queryKeys.topMovers)
	const { data: mostActive } = useApi<any[]>(`/api/v1/market/most-active?limit=5`, queryKeys.mostActive)
	const { data: turnover } = useApi<any>(`/api/v1/market/turnover/compare`, queryKeys.turnoverCompare)
	const { data: sector } = useApi<any>(`/api/v1/research/market/sectors`, queryKeys.sectorAnalysis)

	// News & sentiment
	const [newsCategory, setNewsCategory] = useState<string>('all')
	const [newsSymbol, setNewsSymbol] = useState<string>('')
	const [newsDays, setNewsDays] = useState<number>(7)
	const [newsLimit, setNewsLimit] = useState<number>(30)

	const newsQueryKey = useMemo(
		() => queryKeys.newsList(newsLimit, 0, newsCategory === 'all' ? undefined : newsCategory, newsSymbol || undefined, newsDays),
		[newsLimit, newsCategory, newsSymbol, newsDays],
	)
	const newsQueryPath = useMemo(() => {
		const params = new URLSearchParams({
			limit: String(newsLimit),
			days: String(newsDays),
		})
		if (newsCategory !== 'all') params.set('category', newsCategory)
		const trimmedSymbol = newsSymbol.trim()
		if (trimmedSymbol) params.set('symbol', trimmedSymbol.toUpperCase())
		return `/api/v1/news?${params.toString()}`
	}, [newsLimit, newsDays, newsCategory, newsSymbol])

	const { data: newsList } = useApi<any[]>(newsQueryPath, newsQueryKey)
	const { data: sentiment } = useApi<any>(`/api/v1/analytics/sentiment/market`, queryKeys.marketSentiment)

	// Insights
	const { data: sod } = useApi<any>(`/api/v1/research/stock-of-the-day`, queryKeys.stockOfTheDay)
	const { data: picks } = useApi<any[]>(`/api/v1/research/analyst-picks?limit=5`, queryKeys.analystPicks)
	const { data: earnings } = useApi<any[]>(`/api/v1/research/earnings-highlights?limit=6`, queryKeys.earningsHighlights)
	const { data: themes } = useApi<any>(`/api/v1/research/themes`, queryKeys.themes)

	// Events & flows & macro
	const { data: events } = useApi<any>(`/api/v1/market/events/upcoming?limit=12`, queryKeys.upcomingEvents)
	const { data: flows } = useApi<any>(`/api/v1/market/flows`, queryKeys.marketFlows)
	const { data: macro } = useApi<any>(`/api/v1/market/macro`, queryKeys.macroSnapshot)

	// Auto-refresh based on GlobalTopBar selection persisted in localStorage
	useEffect(() => {
		let timer: any
		function setup() {
			if (timer) clearInterval(timer)
			let v: string | null = null
			try { v = localStorage.getItem('auto_refresh_minutes') } catch {}
			if (v && v !== 'off') {
				const ms = Math.max(1, Number(v)) * 60 * 1000
				timer = setInterval(() => {
					queryClient.invalidateQueries({ queryKey: queryKeys.indices })
					queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary })
					queryClient.invalidateQueries({ queryKey: queryKeys.topMovers })
					queryClient.invalidateQueries({ queryKey: queryKeys.mostActive })
					queryClient.invalidateQueries({ queryKey: queryKeys.turnoverCompare })
					queryClient.invalidateQueries({ queryKey: queryKeys.sectorAnalysis })
					queryClient.invalidateQueries({ queryKey: newsQueryKey })
					queryClient.invalidateQueries({ queryKey: queryKeys.marketSentiment })
					queryClient.invalidateQueries({ queryKey: queryKeys.stockOfTheDay })
					queryClient.invalidateQueries({ queryKey: queryKeys.analystPicks })
					queryClient.invalidateQueries({ queryKey: queryKeys.earningsHighlights })
					queryClient.invalidateQueries({ queryKey: queryKeys.upcomingEvents })
					queryClient.invalidateQueries({ queryKey: queryKeys.marketFlows })
					queryClient.invalidateQueries({ queryKey: queryKeys.macroSnapshot })
				}, ms)
			}
		}
		setup()
		const onStorage = (e: StorageEvent) => { if (e.key === 'auto_refresh_minutes') setup() }
		window.addEventListener('storage', onStorage)
		return () => { if (timer) clearInterval(timer); window.removeEventListener('storage', onStorage) }
	}, [queryClient, newsQueryKey])

	const formatPct = (v?: number) => v == null ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
	const formatNum = (n?: number) => n == null ? '—' : n >= 1e9 ? `${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : `${n}`

	return (
		<div className="space-y-6">
			{/* Top Overview Strip */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">DSEX</CardTitle></CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-2xl font-bold">{indices?.DSEX?.level ?? '—'}</div>
							<div className={(indices?.DSEX?.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
								{formatPct(indices?.DSEX?.change_percent)}
							</div>
						</div>
						<div className="h-8 mt-2">
							<ResponsiveContainer width="100%" height={32}>
								<LineChart data={(indices?.DSEX?.series || []).map((p: any) => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
									<Line type="monotone" dataKey="v" stroke={(indices?.DSEX?.change ?? 0) >= 0 ? '#16a34a' : '#dc2626'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">DS30</CardTitle></CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-2xl font-bold">{indices?.DS30?.level ?? '—'}</div>
							<div className={(indices?.DS30?.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
								{formatPct(indices?.DS30?.change_percent)}
							</div>
						</div>
						<div className="h-8 mt-2">
							<ResponsiveContainer width="100%" height={32}>
								<LineChart data={(indices?.DS30?.series || []).map((p: any) => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
									<Line type="monotone" dataKey="v" stroke={(indices?.DS30?.change ?? 0) >= 0 ? '#16a34a' : '#dc2626'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">DSES</CardTitle></CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-2xl font-bold">{indices?.DSES?.level ?? '—'}</div>
							<div className={(indices?.DSES?.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
								{formatPct(indices?.DSES?.change_percent)}
							</div>
						</div>
						<div className="h-8 mt-2">
							<ResponsiveContainer width="100%" height={32}>
								<LineChart data={(indices?.DSES?.series || []).map((p: any) => ({ t: new Date(p.t).getTime(), v: Number(p.v) }))} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
									<Line type="monotone" dataKey="v" stroke={(indices?.DSES?.change ?? 0) >= 0 ? '#16a34a' : '#dc2626'} strokeWidth={1.5} dot={false} isAnimationActive={false} />
								</LineChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Market Turnover</CardTitle></CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-2xl font-bold">{formatNum(Number(summary?.total_turnover || 0))}</div>
								<div className="text-xs text-muted-foreground">vs yesterday {formatPct(turnover?.change_percent)}</div>
							</div>
							<div className="text-xs text-muted-foreground">Trades {formatNum(summary?.total_trades)} · Vol {formatNum(summary?.total_volume)}</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Movers + Most Active */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Card className="lg:col-span-2">
					<CardHeader className="pb-2 flex items-center justify-between">
						<CardTitle className="text-sm">Top Movers</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<div className="text-xs text-muted-foreground mb-1">Gainers</div>
								{(movers?.gainers || []).slice(0,5).map((s: any) => (
									<HoverCard key={`g-${s.symbol}`}>
										<HoverCardTrigger asChild>
											<div className="flex items-center justify-between py-1 cursor-pointer">
												<div className="font-medium">{s.symbol}</div>
												<div className="text-green-600 text-sm">{formatPct(s.change_percent)}</div>
											</div>
										</HoverCardTrigger>
										<HoverCardContent>
											<div className="text-sm font-medium mb-1">{s.symbol}</div>
											<div className="h-16">
												<ResponsiveContainer width="100%" height={64}>
													<LineChart data={[{v: s.last-1},{v: s.last}]}> 
														<Line type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={1.5} dot={false} isAnimationActive={false} />
													</LineChart>
												</ResponsiveContainer>
											</div>
											<div className="text-xs text-muted-foreground">Vol {formatNum(s.volume)} · Chg {formatPct(s.change_percent)}</div>
										</HoverCardContent>
									</HoverCard>
								))}
							</div>
							<div>
								<div className="text-xs text-muted-foreground mb-1">Losers</div>
								{(movers?.losers || []).slice(0,5).map((s: any) => (
									<HoverCard key={`l-${s.symbol}`}>
										<HoverCardTrigger asChild>
											<div className="flex items-center justify-between py-1 cursor-pointer">
												<div className="font-medium">{s.symbol}</div>
												<div className="text-red-600 text-sm">{formatPct(s.change_percent)}</div>
											</div>
										</HoverCardTrigger>
										<HoverCardContent>
											<div className="text-sm font-medium mb-1">{s.symbol}</div>
											<div className="h-16">
												<ResponsiveContainer width="100%" height={64}>
													<LineChart data={[{v: s.last+1},{v: s.last}]}> 
														<Line type="monotone" dataKey="v" stroke="#dc2626" strokeWidth={1.5} dot={false} isAnimationActive={false} />
													</LineChart>
												</ResponsiveContainer>
											</div>
											<div className="text-xs text-muted-foreground">Vol {formatNum(s.volume)} · Chg {formatPct(s.change_percent)}</div>
										</HoverCardContent>
									</HoverCard>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-2"><CardTitle className="text-sm">Most Active</CardTitle></CardHeader>
					<CardContent>
						{(mostActive || []).map((s: any) => (
							<HoverCard key={s.symbol}>
								<HoverCardTrigger asChild>
									<div className="flex items-center justify-between py-1 cursor-pointer">
										<div className="font-medium">{s.symbol}</div>
										<div className="text-xs text-muted-foreground">Vol {formatNum(s.volume)}</div>
									</div>
								</HoverCardTrigger>
								<HoverCardContent>
									<div className="text-sm font-medium mb-1">{s.symbol}</div>
									<div className="text-xs text-muted-foreground mb-2">Turnover {formatNum(s.turnover)}</div>
									<div className="h-16">
										<ResponsiveContainer width="100%" height={64}>
											<LineChart data={[{v: s.last-0.5},{v: s.last}]}> 
												<Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={1.5} dot={false} isAnimationActive={false} />
											</LineChart>
										</ResponsiveContainer>
									</div>
								</HoverCardContent>
							</HoverCard>
						))}
					</CardContent>
				</Card>
			</div>

			{/* Sector Heatmap Mini */}
			<Card>
				<CardHeader className="pb-2"><CardTitle className="text-sm">Sector Performance (1W)</CardTitle></CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
						{(sector?.sectors || []).slice(0,12).map((sec: any) => (
							<div key={sec.sector} className={`p-2 rounded border text-xs ${sec.performance['1_week'] >= 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
								<div className="font-medium truncate">{sec.sector}</div>
								<div>{formatPct(sec.performance['1_week'])}</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Columns: News, Insights, Right Widgets */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left: News Feed */}
				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2 flex items-center justify-between">
							<CardTitle className="text-sm">Live News</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-2 mb-3 items-center">
								<Select value={newsCategory} onValueChange={(value) => setNewsCategory(value)}>
									<SelectTrigger className="w-[140px]">
										<SelectValue placeholder="Category" />
									</SelectTrigger>
									<SelectContent>
										{NEWS_CATEGORY_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Input
									value={newsSymbol}
									onChange={(e) => {
										const nextValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
										setNewsSymbol(nextValue)
									}}
									placeholder="Symbol"
									className="w-[110px]"
								/>
								<Select value={String(newsDays)} onValueChange={(value) => setNewsDays(Number(value))}>
									<SelectTrigger className="w-[110px]">
										<SelectValue placeholder="Days" />
									</SelectTrigger>
									<SelectContent>
										{NEWS_DAYS_OPTIONS.map((daysOption) => (
											<SelectItem key={daysOption} value={String(daysOption)}>
												{daysOption} day{daysOption > 1 ? 's' : ''}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Select value={String(newsLimit)} onValueChange={(value) => setNewsLimit(Number(value))}>
									<SelectTrigger className="w-[110px]">
										<SelectValue placeholder="Limit" />
									</SelectTrigger>
									<SelectContent>
										{NEWS_LIMIT_OPTIONS.map((limitOption) => (
											<SelectItem key={limitOption} value={String(limitOption)}>
												Top {limitOption}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								{(newsList || []).map((n: any) => (
									<div key={n.id} className="p-2 rounded hover:bg-accent">
										<div className="flex items-center justify-between">
											<div className="font-medium truncate pr-2">{n.title}</div>
											<div className="text-xs text-muted-foreground">{new Date(n.published_at || n.timestamp).toLocaleTimeString()}</div>
										</div>
										<div className="text-xs text-muted-foreground flex items-center gap-2">
											<span>{n.source}</span>
											{n.sentiment && <Badge variant="outline" className="text-xs">{String(n.sentiment)}</Badge>}
										</div>
										{Array.isArray(n.symbols) && n.symbols.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-1">
												{n.symbols.map((sym: string) => (
													<Badge key={`${n.id}-${sym}`} variant="outline" className="text-xs">
														{sym}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Middle: Insights */}
				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Stock of the Day</CardTitle></CardHeader>
						<CardContent>
							{!sod ? '—' : (
								<div className="flex items-center justify-between">
									<div>
										<div className="text-lg font-semibold">{sod.symbol}</div>
										<div className="text-xs text-muted-foreground">{sod.name} · {sod.sector}</div>
									</div>
									<div className="text-right">
										<div className="font-medium">Target {sod.target_price?.toFixed(2)}</div>
										<div className={(sod.change_percent ?? 0) >= 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{formatPct(sod.change_percent)}</div>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Analyst Picks</CardTitle></CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								{(picks || []).map((p) => (
									<div key={p.symbol} className="p-2 rounded border">
										<div className="flex items-center justify-between">
											<div className="font-medium">{p.symbol}</div>
											<Badge variant="outline" className="text-xs">{p.rating}</Badge>
										</div>
										<div className="text-xs text-muted-foreground">Target {Number(p.target_price).toFixed(2)}</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Earnings Highlights</CardTitle></CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Symbol</TableHead>
										<TableHead>Rev YoY</TableHead>
										<TableHead>EPS YoY</TableHead>
										<TableHead>Margin</TableHead>
										<TableHead>Day Chg</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(earnings || []).map((e) => (
										<TableRow key={e.symbol}>
											<TableCell className="font-medium">{e.symbol}</TableCell>
											<TableCell>{formatPct(e.revenue_yoy)}</TableCell>
											<TableCell>{formatPct(e.eps_yoy)}</TableCell>
											<TableCell>{formatPct(e.margin)}</TableCell>
											<TableCell className={(e.price_change_day ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPct(e.price_change_day)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>

				{/* Right: Sentiment, Events, Flows, Macro */}
				<div className="space-y-4">
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Market Sentiment</CardTitle></CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="text-4xl font-bold">{sentiment?.gauge ?? 0}</div>
								<div className="text-xs text-muted-foreground">Pos {sentiment?.counts?.positive} · Neg {sentiment?.counts?.negative} · Neu {sentiment?.counts?.neutral}</div>
							</div>
							<Progress value={Number(sentiment?.gauge || 0)} className="mt-2" />
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Events</CardTitle></CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{(events?.events || []).map((ev: any, idx: number) => (
									<div key={idx} className="flex items-center justify-between py-1">
										<div className="text-xs">{ev.type}</div>
										<div className="font-medium text-sm">{ev.company}</div>
										<div className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Insider/Institutional Activity</CardTitle></CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="text-xs text-muted-foreground">Bulk/Block Trades</div>
								{(flows?.bulk_trades || []).map((t: any, i: number) => (
									<div key={`b${i}`} className="flex items-center justify-between text-sm">
										<div>{t.symbol}</div>
										<div className="text-xs text-muted-foreground">{formatNum(t.quantity)} @ {Number(t.price).toFixed(2)}</div>
									</div>
								))}
								<div className="text-xs text-muted-foreground mt-2">Sponsor/Director</div>
								{(flows?.director_transactions || []).map((t: any, i: number) => (
									<div key={`d${i}`} className="flex items-center justify-between text-sm">
										<div>{t.name}</div>
										<div className="text-xs text-muted-foreground">{t.side} {formatNum(t.quantity)} {t.symbol}</div>
									</div>
								))}
								<div className="text-xs text-muted-foreground mt-2">Foreign Net Buy/Sell</div>
								<div className={(flows?.foreign_net_flow?.net_buy_value ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
									{formatNum(flows?.foreign_net_flow?.net_buy_value)}
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2"><CardTitle className="text-sm">Commodities & FX</CardTitle></CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div>Oil (Brent)</div><div className="text-right">{macro?.commodities?.oil_brent_usd ?? '—'}</div>
								<div>LNG Spot</div><div className="text-right">{macro?.commodities?.lng_spot_usd_mmbtu ?? '—'}</div>
								<div>Steel Rebar</div><div className="text-right">{macro?.commodities?.steel_rebar_usd_ton ?? '—'}</div>
								<div className="col-span-2 text-xs text-muted-foreground mt-2">USD/BDT Trend</div>
								<div className="col-span-2 text-xs">{(macro?.fx?.usd_bdt_trend || []).join(' → ')}</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Bottom: Full Sector Heatmap */}
			<Card>
				<CardHeader className="pb-2"><CardTitle className="text-sm">Sector Heatmap</CardTitle></CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
						{(sector?.sectors || []).map((sec: any) => (
							<div key={`full-${sec.sector}`} className={`p-3 rounded border ${sec.performance['1_day'] >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
								<div className="font-medium text-sm truncate">{sec.sector}</div>
								<div className="text-xs text-muted-foreground">Adv/Dec: {(sec.stock_count || 0)}/—</div>
								<div className="text-xs">Turnover wt: {sec.market_cap_weight}%</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}