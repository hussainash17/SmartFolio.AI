import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queryKeys'
import { useApi } from '../hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from './ui/table'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import {
	TrendingUp,
	TrendingDown,
	Newspaper,
	Calendar,
	Megaphone,
	Search,
	Filter,
	ArrowRight,
	Zap,
	Globe,
	Briefcase
} from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'

const NEWS_CATEGORY_OPTIONS = [
	{ label: 'All', value: 'all' },
	{ label: 'Market', value: 'market' },
	{ label: 'Company', value: 'company' },
	{ label: 'Economy', value: 'economy' },
	{ label: 'Sector', value: 'sector' },
]

export default function MarketNewsInsights() {
	const queryClient = useQueryClient()

	// API Calls
	const { data: indices } = useApi<any>(`/api/v1/market/indices`, queryKeys.indices)
	const { data: summary } = useApi<any>(`/api/v1/market/summary`, queryKeys.dashboardSummary)
	const { data: sod } = useApi<any>(`/api/v1/research/stock-of-the-day`, queryKeys.stockOfTheDay)
	const { data: picks } = useApi<any[]>(`/api/v1/research/analyst-picks?limit=5`, queryKeys.analystPicks)
	const { data: flows } = useApi<any>(`/api/v1/market/flows`, queryKeys.marketFlows)
	const { data: macro } = useApi<any>(`/api/v1/market/macro`, queryKeys.macroSnapshot)
	const { data: events } = useApi<any>(`/api/v1/market/events/upcoming?limit=10`, queryKeys.upcomingEvents)
	const { data: earnings } = useApi<any[]>(`/api/v1/research/earnings-highlights?limit=10`, queryKeys.earningsHighlights)

	// News State
	const [newsCategory, setNewsCategory] = useState<string>('all')
	const [newsSymbol, setNewsSymbol] = useState<string>('')
	const [newsDays, setNewsDays] = useState<number>(7)
	const newsLimit = 40

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

	// Formatting Helpers
	const formatPct = (v?: number) => v == null ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`
	const formatNum = (n?: number) => n == null ? '—' : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n}`
	const getSentimentColor = (s?: string) => {
		const v = s?.toLowerCase()
		if (v === 'positive' || v === 'bullish') return 'text-green-600 bg-green-50 border-green-200'
		if (v === 'negative' || v === 'bearish') return 'text-red-600 bg-red-50 border-red-200'
		return 'text-gray-600 bg-gray-50 border-gray-200'
	}

	// Calculate Sentiment Score (Logic from MarketSentiment.tsx)
	const advancers = summary?.advancers || 0
	const decliners = summary?.decliners || 0
	const sentimentScore = advancers > decliners ? 2 : decliners > advancers ? 0 : 1
	const sentimentLabel = sentimentScore === 2 ? 'Bullish' : sentimentScore === 0 ? 'Bearish' : 'Neutral'
	const sentimentColor = sentimentScore === 2 ? 'text-green-600' : sentimentScore === 0 ? 'text-red-600' : 'text-gray-600'

	return (
		<div className="space-y-6">
			{/* 1. Slim Market Header (Context Only) */}
			<div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-card border rounded-lg shadow-sm">
				<div className="text-sm font-semibold text-muted-foreground mr-2">MARKET CONTEXT</div>
				<Separator orientation="vertical" className="h-5" />

				{/* Indices Tickers */}
				{['DSEX', 'DS30'].map(idx => (
					<div key={idx} className="flex items-center gap-2">
						<span className="font-bold text-sm">{idx}</span>
						<span className="text-sm">{indices?.[idx]?.level ?? '—'}</span>
						<span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(indices?.[idx]?.change ?? 0) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
							}`}>
							{formatPct(indices?.[idx]?.change_percent)}
						</span>
					</div>
				))}

				<Separator orientation="vertical" className="h-5 hidden sm:block" />

				{/* Macro Tickers */}
				<div className="flex items-center gap-3 text-sm text-uted-foreground">
					<div className="flex items-center gap-1">
						<Zap className="h-3.5 w-3.5 text-yellow-500" />
						<span className="text-muted-foreground">Brent</span>
						<span className="font-medium text-foreground">${macro?.commodities?.oil_brent_usd ?? '—'}</span>
					</div>
					<div className="flex items-center gap-1">
						<Globe className="h-3.5 w-3.5 text-blue-500" />
						<span className="text-muted-foreground">USD/BDT</span>
						<span className="font-medium text-foreground">{(macro?.fx?.usd_bdt_trend || [])[0] ?? '—'}</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

				{/* LEFT COLUMN: Main Narrative (News, Featured, Events) */}
				<div className="xl:col-span-8 space-y-8">

					{/* Featured Hero Section */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Stock of the Day */}
						<Card className="border-l-4 border-l-primary bg-gradient-to-br from-card to-secondary/10">
							<CardHeader className="pb-2">
								<div className="flex items-center justify-between">
									<Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
										STOCK OF THE DAY
									</Badge>
									<span className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</span>
								</div>
								<CardTitle className="text-2xl pt-2 flex items-center gap-2">
									{sod?.symbol || '—'}
									{sod && (
										<span className={`text-lg font-normal ${(sod.change_percent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
											{formatPct(sod.change_percent)}
										</span>
									)}
								</CardTitle>
								<CardDescription>{sod?.name}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex justify-between items-end mt-2">
									<div className="space-y-1">
										<div className="text-sm text-muted-foreground">Target Price</div>
										<div className="text-xl font-bold">{sod?.target_price ? sod.target_price.toFixed(2) : '—'}</div>
									</div>
									<div className="space-y-1 text-right">
										<div className="text-sm text-muted-foreground">Sector</div>
										<div className="font-medium">{sod?.sector}</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Sentiment Hero */}
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base flex items-center gap-2">
									<ActivityIcon /> Market Mood
								</CardTitle>
							</CardHeader>
							<CardContent className="pt-4">
								<div className="flex items-center gap-6">
									<div className="relative">
										{/* Icon based representation */}
										<div className={`flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 ${sentimentScore === 2 ? 'bg-green-100/50' : sentimentScore === 0 ? 'bg-red-100/50' : ''}`}>
											{sentimentScore === 2 ? <TrendingUp className="w-8 h-8 text-green-600" /> :
												sentimentScore === 0 ? <TrendingDown className="w-8 h-8 text-red-600" /> :
													<div className="w-8 h-1 bg-gray-400 rounded-full" />}
										</div>
									</div>
									<div className="flex-1 space-y-3">
										<div className="flex items-center justify-between">
											<div className={`text-2xl font-bold ${sentimentColor}`}>{sentimentLabel}</div>
											<div className="text-sm font-medium text-muted-foreground">
												A: {advancers} / D: {decliners}
											</div>
										</div>

										<div className="flex gap-1 h-2.5">
											{/* Real Ratio Progress */}
											<div className="w-full h-3 flex rounded-full overflow-hidden bg-muted/30">
												<div
													className="bg-green-500 h-full transition-all"
													style={{ width: `${(advancers / (advancers + decliners || 1)) * 100}%` }}
													title="Advancers"
												/>
												<div
													className="bg-red-500 h-full transition-all"
													style={{ width: `${(decliners / (advancers + decliners || 1)) * 100}%` }}
													title="Decliners"
												/>
											</div>
										</div>

										<div className="flex justify-between text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
											<span>Advancers</span>
											<span>Decliners</span>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Main Content Area: News & Logic */}
					<Tabs defaultValue="news" className="w-full">
						<div className="flex items-center justify-between mb-4">
							<TabsList className="h-10">
								<TabsTrigger value="news" className="px-6">Live News</TabsTrigger>
								<TabsTrigger value="earnings">Earnings</TabsTrigger>
								<TabsTrigger value="events">Calendar</TabsTrigger>
							</TabsList>

							{/* Filters (Only show for News tab primarily, but kept simple) */}
							<div className="flex items-center gap-2">
								<div className="relative">
									<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
									<Input
										className="w-[150px] pl-8 h-9 text-sm"
										placeholder="Filter Symbol"
										value={newsSymbol}
										onChange={(e) => setNewsSymbol(e.target.value)}
									/>
								</div>
								<Select value={newsCategory} onValueChange={setNewsCategory}>
									<SelectTrigger className="w-[130px] h-9">
										<Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{NEWS_CATEGORY_OPTIONS.map(o => (
											<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* TAB: NEWS */}
						<TabsContent value="news" className="space-y-4">
							<div className="bg-card border rounded-xl overflow-hidden shadow-sm">
								<div className="divide-y">
									{(newsList || []).map((n: any, i) => (
										<div key={n.id || i} className="p-4 hover:bg-muted/30 transition-colors group">
											<div className="flex items-start justify-between gap-4">
												<div className="space-y-1.5 flex-1">
													<div className="flex items-center gap-2">
														<Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal tracking-wide text-muted-foreground bg-secondary/50">
															{n.source}
														</Badge>
														<span className="text-xs text-muted-foreground">
															{new Date(n.published_at || n.timestamp).toLocaleString(undefined, {
																month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
															})}
														</span>
														{(n.symbols || []).map((s: string) => (
															<span key={s} className="text-xs font-semibold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
																{s}
															</span>
														))}
													</div>
													<h3 className="font-semibold text-base leading-snug group-hover:text-primary transition-colors">
														{n.title}
													</h3>
													<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
														{n.summary || n.content?.substring(0, 160)}...
													</p>
												</div>
												{n.sentiment && (
													<Badge variant="outline" className={`shrink-0 capitalize ${getSentimentColor(n.sentiment)}`}>
														{n.sentiment}
													</Badge>
												)}
											</div>
										</div>
									))}
									{(!newsList || newsList.length === 0) && (
										<div className="p-12 text-center text-muted-foreground">
											No news found for the selected filters.
										</div>
									)}
								</div>
							</div>
						</TabsContent>

						{/* TAB: EARNINGS */}
						<TabsContent value="earnings">
							<Card>
								<CardHeader>
									<CardTitle>Latest Earnings Results</CardTitle>
									<CardDescription>Financial performance highlights from listed companies</CardDescription>
								</CardHeader>
								<CardContent>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Symbol</TableHead>
												<TableHead>Rev YoY</TableHead>
												<TableHead>EPS YoY</TableHead>
												<TableHead>Net Margin</TableHead>
												<TableHead className="text-right">Price Chg</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(earnings || []).map((e: any) => (
												<TableRow key={e.id || e.symbol}>
													<TableCell className="font-bold">{e.symbol}</TableCell>
													<TableCell>{formatPct(e.revenue_yoy)}</TableCell>
													<TableCell>{formatPct(e.eps_yoy)}</TableCell>
													<TableCell>{formatPct(e.margin)}</TableCell>
													<TableCell className={`text-right font-medium ${(e.price_change_day ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
														{formatPct(e.price_change_day)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</CardContent>
							</Card>
						</TabsContent>

						{/* TAB: EVENTS */}
						<TabsContent value="events">
							<Card>
								<CardHeader>
									<CardTitle>Economic & Corporate Calendar</CardTitle>
									<CardDescription>Upcoming AGMs, record dates, and economic releases</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										{(events?.events || []).map((ev: any, i: number) => (
											<div key={i} className="flex items-center p-3 border rounded-lg hover:border-primary/50 transition-colors bg-card">
												<div className="flex-shrink-0 w-16 text-center border-r pr-3 mr-3">
													<div className="text-xs font-bold uppercase text-muted-foreground">
														{new Date(ev.date).toLocaleString('default', { month: 'short' })}
													</div>
													<div className="text-xl font-bold bg-muted/40 rounded mt-0.5">
														{new Date(ev.date).getDate()}
													</div>
												</div>
												<div className="flex-grow">
													<div className="font-semibold text-sm">{ev.company || 'Economic Event'}</div>
													<div className="text-sm text-foreground/80">{ev.title || ev.type}</div>
												</div>
												<Badge variant="outline">{ev.type}</Badge>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>

				{/* RIGHT COLUMN: Research Context & Flows */}
				<div className="xl:col-span-4 space-y-6">

					{/* Analyst Picks Widget */}
					<Card>
						<CardHeader className="pb-3 border-b bg-muted/20">
							<CardTitle className="text-sm font-bold flex items-center gap-2">
								<Briefcase className="w-4 h-4 text-primary" /> Analyst Picks
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<div className="divide-y">
								{(picks || []).map(p => (
									<div key={p.symbol} className="p-4 flex items-center justify-between hover:bg-muted/10">
										<div>
											<div className="font-bold">{p.symbol}</div>
											<div className="text-xs text-muted-foreground mt-0.5">Target: {Number(p.target_price).toFixed(2)}</div>
										</div>
										<div className="text-right">
											<Badge className={p.rating === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600'}>
												{p.rating}
											</Badge>
											<div className="text-[10px] text-muted-foreground mt-1">
												Upside: {formatPct(p.upside)}
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Smart Money Flows */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-sm font-bold">Smart Money Flows</CardTitle>
							<CardDescription>Insider & Institutional Activity</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Foreign Net Flow */}
							<div className="p-3 bg-muted/30 rounded-lg border">
								<div className="text-xs text-muted-foreground mb-1">Foreign Net Flow (Daily)</div>
								<div className={`text-xl font-bold ${(flows?.foreign_net_flow?.net_buy_value ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
									{formatNum(flows?.foreign_net_flow?.net_buy_value)} BDT
								</div>
							</div>

							<div className="space-y-3">
								<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Director Buys</div>
								{(flows?.director_transactions || [])
									.filter((t: any) => t.side.toLowerCase().includes('buy'))
									.slice(0, 3)
									.map((t: any, i: number) => (
										<div key={i} className="flex justify-between text-sm">
											<span className="font-medium">{t.symbol}</span>
											<span className="text-green-600">{formatNum(t.quantity)} Vol</span>
										</div>
									))}
								{(flows?.director_transactions || []).filter((t: any) => t.side.toLowerCase().includes('buy')).length === 0 && (
									<div className="text-xs text-muted-foreground italic">No recent buying activity</div>
								)}
							</div>

							<Separator />

							<div className="space-y-3">
								<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Block Trades</div>
								{(flows?.bulk_trades || []).slice(0, 4).map((t: any, i: number) => (
									<div key={i} className="flex justify-between items-center text-sm">
										<div>
											<span className="font-medium mr-2">{t.symbol}</span>
											<span className="text-xs text-muted-foreground">@{Number(t.price).toFixed(1)}</span>
										</div>
										<span className="font-mono text-xs">{formatNum(t.quantity)}</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Simple Sector Performance List */}
					<Card>
						<CardHeader className="pb-3 border-b">
							<CardTitle className="text-sm font-bold">Sector Momentum (1W)</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<ScrollArea className="h-[250px]">
								<div className="p-4 space-y-3">
									{/* Note: In a real app we might want to sort these or limit them */}
									{(useApi<any>(`/api/v1/research/market/sectors`, queryKeys.sectorAnalysis).data?.sectors || [])
										.sort((a: any, b: any) => b.performance['1_week'] - a.performance['1_week'])
										.map((sec: any) => (
											<div key={sec.sector} className="flex items-center justify-between">
												<div className="text-sm truncate w-32" title={sec.sector}>{sec.sector}</div>
												<div className={`text-sm font-medium ${(sec.performance['1_week'] ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
													{formatPct(sec.performance['1_week'])}
												</div>
											</div>
										))}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

function ActivityIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-primary"
		>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
		</svg>
	)
}