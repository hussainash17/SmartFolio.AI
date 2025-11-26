import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Award,
    BarChart3,
    PieChart,
    Shield,
    Target,
    TrendingDown,
    TrendingUp
} from "lucide-react";
import { Bar, BarChart as RBarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AccountBalance, MarketData as MarketDataType, NewsItem, Order, Transaction } from "../types/trading";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsService, KycService, OpenAPI, RiskManagementService } from "../src/client";
import { useQueries, useQuery } from "@tanstack/react-query";
import { queryKeys } from "../hooks/queryKeys";
import { usePortfolios } from "../hooks/usePortfolios";
import { useRiskAlerts, useRiskOverview } from "../hooks/useRisk";
import {
    useBestWorstPeriods,
    useCashFlows,
    useCurrentValue,
    usePerformanceReturns,
    usePerformanceRiskMetrics,
} from "../hooks/usePerformance";

interface ComprehensiveDashboardProps {
    accountBalance: AccountBalance;
    recentOrders: Order[];
    recentTransactions: Transaction[];
    news: NewsItem[];
    marketData: MarketDataType[];
    onQuickTrade: (symbol?: string, side?: 'buy' | 'sell') => void;
    onChartStock: (symbol: string) => void;
    onNavigate: (view: string) => void;
    onSelectPortfolioId?: (id: string) => void;
    selectedPortfolioId?: string;
}

export function ComprehensiveDashboard({
    accountBalance,
    recentOrders,
    recentTransactions,
    news,
    marketData,
    onQuickTrade,
    onChartStock,
    onNavigate,
    onSelectPortfolioId,
    selectedPortfolioId: initialPortfolioId,
}: ComprehensiveDashboardProps) {
    // Portfolio selection state
    const { portfolios, setSelectedPortfolioId: setGlobalSelectedPortfolioId } = usePortfolios();
    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | undefined>(initialPortfolioId);
    const [contributionView, setContributionView] = useState<'daily' | 'weekly' | 'unrealized'>('daily');

    // Set default portfolio when portfolios load
    useEffect(() => {
        if (!selectedPortfolioId && portfolios.length > 0) {
            setSelectedPortfolioId(portfolios[0].id);
        }
    }, [portfolios, selectedPortfolioId]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatPercent = (percent: number) => {
        return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    };
    const toMillions = (value: unknown) => {
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (!Number.isFinite(num)) return 0;
        return num >= 10000 ? num / 1_000_000 : num;
    };
    const {
        data: dashboardSummary = {
            portfolio_count: 0,
            total_portfolio_value: 0,
            total_investment: 0,
            cash_balance: 0,
            stock_value: 0,
            day_change: 0,
            day_change_percent: 0,
            ytd_return_percent: 0,
            risk_score: 0,
            risk_level: 'LOW',
            active_goals: 0,
            buying_power: 0,
            total_realized_gains: 0,
        }
    } = useQuery({
        queryKey: queryKeys.dashboardSummary,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/dashboard/summary`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return {
                portfolio_count: 0,
                total_portfolio_value: 0,
                total_investment: 0,
                cash_balance: 0,
                stock_value: 0,
                day_change: 0,
                day_change_percent: 0,
                ytd_return_percent: 0,
                risk_score: 0,
                risk_level: 'LOW',
                active_goals: 0,
                buying_power: 0,
                total_realized_gains: 0,
            };
            const data = await res.json();
            return {
                portfolio_count: Number(data.portfolio_count || 0),
                total_portfolio_value: Number(data.total_portfolio_value || 0),
                total_investment: Number(data.total_investment || 0),
                cash_balance: Number(data.cash_balance || 0),
                stock_value: Number(data.stock_value || 0),
                day_change: Number(data.day_change || 0),
                day_change_percent: Number(data.day_change_percent || 0),
                ytd_return_percent: Number(data.ytd_return_percent || 0),
                risk_score: Number(data.risk_score || 0),
                risk_level: String(data.risk_level || 'LOW'),
                active_goals: Number(data.active_goals || 0),
                buying_power: Number(data.buying_power || 0),
                total_realized_gains: Number(data.total_realized_gains || 0),
            };
        },
        staleTime: 60 * 1000,
    });

    // Use new optimized split APIs for performance data
    const { data: currentValue } = useCurrentValue(selectedPortfolioId);
    const { data: returnsYTD } = usePerformanceReturns(selectedPortfolioId, 'YTD');
    const { data: returns1Y } = usePerformanceReturns(selectedPortfolioId, '1Y');
    const { data: returns3Y } = usePerformanceReturns(selectedPortfolioId, '3Y');
    const { data: returnsAll } = usePerformanceReturns(selectedPortfolioId, 'ALL');
    const { data: riskMetrics1Y } = usePerformanceRiskMetrics(selectedPortfolioId, '1Y');
    const { data: bestWorstYTD } = useBestWorstPeriods(selectedPortfolioId, 'YTD');
    const { data: cashFlowsYTD } = useCashFlows(selectedPortfolioId, 'YTD');

    // Aggregate performance data from split APIs
    const portfolioPerformance = useMemo(() => {
        return {
            totalReturn: returnsAll?.time_weighted_return || 0,
            yearToDate: returnsYTD?.time_weighted_return || 0,
            oneYear: returns1Y?.annualized_return || 0,
            threeYear: returns3Y?.annualized_return || 0,
            sharpeRatio: riskMetrics1Y?.sharpe_ratio || 0,
            volatility: riskMetrics1Y?.volatility || 0,
            maxDrawdown: riskMetrics1Y?.max_drawdown || 0,
        };
    }, [returnsAll, returnsYTD, returns1Y, returns3Y, riskMetrics1Y]);

    const { data: assetAllocation = [] } = useQuery({
        queryKey: queryKeys.portfolioAllocation(selectedPortfolioId || 'none'),
        enabled: !!selectedPortfolioId,
        queryFn: async () => {
            if (!selectedPortfolioId) return [] as Array<{
                type: string;
                value: number;
                percentage: number;
                color: string
            }>;
            try {
                const alloc = await AnalyticsService.getPortfolioAllocation({ portfolioId: selectedPortfolioId });
                const sectors = ((alloc as any).sector_wise_allocation || []) as Array<any>;

                // Ensure sectors is an array
                if (!Array.isArray(sectors)) {
                    console.warn('[ComprehensiveDashboard] sector_wise_allocation is not an array:', sectors);
                    return [] as Array<{ type: string; value: number; percentage: number; color: string }>;
                }

                const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6b7280", "#8b5cf6", "#14b8a6", "#f97316"];
                return sectors.map((s, idx) => ({
                    type: String(s.sector || 'Unknown'),
                    value: Number(s.value || 0),
                    percentage: Number(s.allocation_percent || 0),
                    color: palette[idx % palette.length],
                }));
            } catch (error) {
                console.error('[ComprehensiveDashboard] Failed to fetch asset allocation:', error);
                return [] as Array<{ type: string; value: number; percentage: number; color: string }>;
            }
        },
    });

    const { data: investmentGoals = [] } = useQuery({
        queryKey: queryKeys.investmentGoals,
        queryFn: async () => {
            try {
                const goals = await KycService.getInvestmentGoals();
                return (goals as any[]).map((g) => ({
                    id: String(g.id),
                    name: String(g.goal_type || 'Goal'),
                    target: Number(g.target_amount || 0),
                    current: 0,
                    progress: 0,
                    timeframe: g.target_date ? new Date(g.target_date).toLocaleDateString() : '—',
                    priority: (Number(g.priority || 1) <= 1 ? 'High' : Number(g.priority || 1) <= 2 ? 'Medium' : 'Low'),
                    status: String(g.status || 'ACTIVE'),
                }));
            } catch (error) {
                console.error('[Dashboard] Failed to fetch investment goals:', error);
                return [];
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const { data: goalProgressMap = {} } = useQuery({
        queryKey: ['kyc', 'goals', 'progress', investmentGoals.map(g => g.id).join(',')],
        queryFn: async () => {
            const result: Record<string, number> = {};
            for (const g of investmentGoals) {
                try {
                    const contribs = await KycService.listGoalContributions({ goalId: g.id });
                    const sum = (contribs as any[]).reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0);
                    const target = Number(g.target || 0);
                    result[g.id] = target > 0 ? Math.min(100, (sum / target) * 100) : 0;
                } catch (error) {
                    console.error(`[Dashboard] Failed to fetch contributions for goal ${g.id}:`, error);
                    result[g.id] = 0;
                }
            }
            return result;
        },
        enabled: investmentGoals.length > 0,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Fetch active risk alerts
    const { data: riskAlertsData = [], isLoading: riskAlertsLoading } = useRiskAlerts(selectedPortfolioId, true);

    // Transform raw alerts to display format
    const riskAlerts = useMemo(() => {
        return (riskAlertsData as any[]).map((a) => ({
            type: String(a.alert_type || 'info'),
            message: String(a.message || ''),
            severity: String((a.severity || 'LOW')).toLowerCase() as 'low' | 'medium' | 'high',
        }));
    }, [riskAlertsData]);

    // Fetch risk overview metrics
    const { data: riskOverview, isLoading: riskOverviewLoading } = useRiskOverview(selectedPortfolioId, '1M');

    // Fetch user risk profile
    const { data: riskProfile } = useQuery({
        queryKey: ['risk', 'profile'],
        queryFn: async () => {
            try {
                const profile = await RiskManagementService.getUserRiskProfile();
                return profile as any;
            } catch (error) {
                // 404 means user hasn't created a risk profile yet - this is normal
                if ((error as any)?.status === 404) {
                    return null;
                }
                console.error('[Dashboard] Failed to fetch risk profile:', error);
                return null;
            }
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
        retry: false, // Don't retry on 404
    });

    const dashboardSummaryMemo = useMemo(() => dashboardSummary, [dashboardSummary]);

    const marketPriceMap = useMemo(() => {
        const map = new Map<string, number>();
        marketData.forEach((quote) => {
            const symbol = String(quote.symbol || '').toUpperCase();
            if (!symbol) return;
            const price = Number(quote.currentPrice ?? quote.change ?? 0);
            if (!Number.isFinite(price)) return;
            map.set(symbol, price);
        });
        return map;
    }, [marketData]);

    const enrichedPortfolios = useMemo(() => {
        return portfolios.map((p) => {
            const stocks = p.stocks.map((s) => {
                const live = marketPriceMap.get(String(s.symbol || '').toUpperCase()) ?? s.currentPrice;
                return { ...s, currentPrice: live };
            });
            const stocksMarketValue = stocks.reduce((sum, s) => sum + s.quantity * s.currentPrice, 0);
            const totalCost = stocks.reduce((sum, s) => sum + s.quantity * s.purchasePrice, 0);
            const totalValue = stocksMarketValue + p.cash;
            return { ...p, stocks, stocksMarketValue, totalCost, totalValue };
        });
    }, [portfolios, marketPriceMap]);

    const aggregates = useMemo(() => {
        const totalValue = enrichedPortfolios.reduce((sum, p) => sum + (p as any).totalValue, 0);
        const totalCost = enrichedPortfolios.reduce((sum, p) => sum + (p as any).totalCost, 0);
        const totalCash = enrichedPortfolios.reduce((sum, p) => sum + p.cash, 0);
        const totalStocksValue = enrichedPortfolios.reduce((sum, p) => sum + Number((p as any).stocksMarketValue || 0), 0);
        const unrealizedPL = totalStocksValue - totalCost;
        return { totalValue, totalCost, totalCash, unrealizedPL };
    }, [enrichedPortfolios]);

    const marketOverview = useMemo(() => {
        let advancers = 0, decliners = 0, unchanged = 0;
        let totalVolume = 0;
        marketData.forEach((q) => {
            totalVolume += Number(q.volume || 0);
            const cp = Number(q.changePercent || 0);
            if (cp > 0) advancers++; else if (cp < 0) decliners++; else unchanged++;
        });
        return { advancers, decliners, unchanged, totalVolume };
    }, [marketData]);

    const topMovers = useMemo(() => {
        const items: Array<{
            symbol: string;
            name: string;
            price: number;
            changePercent: number;
            volume: number;
            contribution: number;
        }> = [];
        const bySymbolHoldings = new Map<string, { quantity: number; companyName: string }>();
        enrichedPortfolios.forEach((p) => p.stocks.forEach((s) => {
            const key = String(s.symbol || '').toUpperCase();
            const prev = bySymbolHoldings.get(key) || { quantity: 0, companyName: s.companyName };
            bySymbolHoldings.set(key, { quantity: prev.quantity + s.quantity, companyName: prev.companyName });
        }));
        marketData.forEach((q) => {
            const key = String(q.symbol || '').toUpperCase();
            const holding = bySymbolHoldings.get(key);
            if (!holding) return;
            const price = Number(q.currentPrice || 0);
            const changePct = Number(q.changePercent || 0);
            const contrib = holding.quantity * price * (changePct / 100);
            items.push({
                symbol: key,
                name: holding.companyName,
                price,
                changePercent: changePct,
                volume: Number(q.volume || 0),
                contribution: contrib
            });
        });
        return items.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 8);
    }, [enrichedPortfolios, marketData]);

    const sectorExposure = useMemo(() => {
        const map = new Map<string, number>();
        enrichedPortfolios.forEach((p) => p.stocks.forEach((s) => {
            const sector = String(s.sector || 'Unknown');
            const value = s.quantity * s.currentPrice;
            map.set(sector, (map.get(sector) || 0) + value);
        }));
        const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
        return Array.from(map.entries()).map(([sector, value]) => ({ sector, value, percent: (value / total) * 100 }))
            .sort((a, b) => b.value - a.value).slice(0, 8);
    }, [enrichedPortfolios]);

    const weeklyAttributionQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'security-attribution', '1W', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/attribution/securities?period=1W&limit=15`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    const monthlyAttributionQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'security-attribution', '1M', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/attribution/securities?period=1M&limit=20`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    const weeklyValuationQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'period-valuation', '1W', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/valuation/period?period=1W`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    const monthlyValuationQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'period-valuation', '1M', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/valuation/period?period=1M`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    const contributionDaily = useMemo(() => {
        return topMovers.map((m) => ({ symbol: m.symbol, pl: m.contribution }));
    }, [topMovers]);

    const contributionWeekly = useMemo(() => {
        const map = new Map<string, number>();
        weeklyAttributionQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            const pos: any[] = Array.isArray(data.top_contributors) ? data.top_contributors : [];
            const neg: any[] = Array.isArray(data.top_detractors) ? data.top_detractors : [];
            pos.forEach((c) => {
                const k = String(c.symbol || '').toUpperCase();
                map.set(k, (map.get(k) || 0) + Number(c.contribution || 0));
            });
            neg.forEach((c) => {
                const k = String(c.symbol || '').toUpperCase();
                map.set(k, (map.get(k) || 0) - Math.abs(Number(c.contribution || 0)));
            });
        });
        return Array.from(map.entries()).map(([symbol, pl]) => ({ symbol, pl }))
            .sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl)).slice(0, 12);
    }, [weeklyAttributionQueries]);

    const contributionUnrealized = useMemo(() => {
        const map = new Map<string, number>();
        enrichedPortfolios.forEach((p) => p.stocks.forEach((s) => {
            const k = String(s.symbol || '').toUpperCase();
            const pl = s.quantity * (Number(s.currentPrice || 0) - Number(s.purchasePrice || 0));
            map.set(k, (map.get(k) || 0) + pl);
        }));
        return Array.from(map.entries()).map(([symbol, pl]) => ({ symbol, pl }))
            .sort((a, b) => Math.abs(b.pl) - Math.abs(a.pl)).slice(0, 12);
    }, [enrichedPortfolios]);

    const weeklyPLTotal = useMemo(() => {
        let startSum = 0;
        let endSum = 0;
        weeklyValuationQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            startSum += Number(data.start_value || 0);
            endSum += Number(data.end_value || 0);
        });
        return endSum - startSum;
    }, [weeklyValuationQueries]);

    const monthlyPLTotal = useMemo(() => {
        let startSum = 0;
        let endSum = 0;
        monthlyValuationQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            startSum += Number(data.start_value || 0);
            endSum += Number(data.end_value || 0);
        });
        return endSum - startSum;
    }, [monthlyValuationQueries]);

    const weeklyPLPercent = useMemo(() => {
        let startSum = 0;
        weeklyValuationQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            startSum += Number(data.start_value || 0);
        });
        const base = Math.max(1, startSum);
        return (Number(weeklyPLTotal || 0) / base) * 100;
    }, [weeklyPLTotal, weeklyValuationQueries]);

    const monthlyPLPercent = useMemo(() => {
        let startSum = 0;
        monthlyValuationQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            startSum += Number(data.start_value || 0);
        });
        const base = Math.max(1, startSum);
        return (Number(monthlyPLTotal || 0) / base) * 100;
    }, [monthlyPLTotal, monthlyValuationQueries]);

    const decompositionYTDQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'return-decomposition', 'YTD', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/decomposition?period=YTD`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    const decompositionDayQueries = useQueries({
        queries: portfolios.map((p) => ({
            queryKey: ['dashboard', 'return-decomposition', '1D', p.id],
            enabled: !!(OpenAPI as any).TOKEN,
            staleTime: 5 * 60 * 1000,
            queryFn: async () => {
                const base = (OpenAPI as any).BASE || '';
                const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/portfolios/${p.id}/performance/decomposition?period=1D`, {
                    headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                    credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
                });
                if (!res.ok) return null;
                return await res.json();
            }
        }))
    });

    // Use aggregated realized gains from dashboard API
    const realizedYTD = dashboardSummary.total_realized_gains || 0;

    const realizedToday = useMemo(() => {
        let total = 0;
        decompositionDayQueries.forEach((q) => {
            const data = q.data as any;
            if (!data) return;
            const candidates = [
                (data as any).realized,
                (data as any).realized_pnl,
                (data as any).realized_profit,
                (data as any).realized_gain,
                (data as any).realized_gains,
                (data as any).capital_gains_realized,
                (data as any).capital_gain_realized,
                (data as any).capital_realized,
            ];
            let val = candidates.find((v: any) => typeof v === 'number');
            if (typeof val !== 'number') {
                const comp = Array.isArray((data as any).components)
                    ? (data as any).components
                    : Array.isArray((data as any).decomposition)
                        ? (data as any).decomposition
                        : [];
                if (comp.length) {
                    let s = 0;
                    comp.forEach((c: any) => {
                        const key = String((c as any).type || (c as any).name || '').toLowerCase();
                        if (key.includes('realized') || (key.includes('capital') && key.includes('gain') && key.includes('realized'))) {
                            s += Number((c as any).value || (c as any).amount || 0);
                        }
                    });
                    val = s;
                } else {
                    val = 0;
                }
            }
            total += Number(val || 0);
        });
        return total;
    }, [decompositionDayQueries]);

    const { data: marketIndices } = useQuery({
        queryKey: queryKeys.indices,
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/market/indices`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return null;
            return await res.json();
        }
    });

    const { data: marketSummary } = useQuery({
        queryKey: ['market', 'summary'],
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/market/summary`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return null;
            return await res.json();
        }
    });

    const { data: benchmarkData } = useQuery({
        queryKey: ['market', 'benchmark', 'DSEX'],
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/market/benchmark/DSEX`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return null;
            return await res.json();
        }
    });

    const { data: marketMostActive = [] } = useQuery({
        queryKey: queryKeys.mostActive,
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/market/most-active?limit=5`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return [];
            return await res.json();
        }
    });

    const { data: marketTopMovers } = useQuery({
        queryKey: ['market', 'top-movers'],
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 30 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/market/top-movers?limit=5`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return { gainers: [], losers: [] };
            return await res.json();
        }
    });

    const { data: sectorAnalysis } = useQuery({
        queryKey: queryKeys.sectorAnalysis,
        enabled: !!(OpenAPI as any).TOKEN,
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}/api/v1/research/market/sectors`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) return null;
            return await res.json();
        }
    });

    const vsIndex1D = useMemo(() => {
        const port = Number(dashboardSummaryMemo?.day_change_percent || 0);
        const idx = Number(marketIndices?.DSEX?.change_percent || 0);
        return port - idx;
    }, [dashboardSummaryMemo?.day_change_percent, marketIndices]);

    const vsIndex1W = weeklyPLPercent - 0;
    const vsIndex1M = monthlyPLPercent - 0;
    const vsIndexYTD = Number(dashboardSummaryMemo?.ytd_return_percent || 0) - 0;

    return (
        <div className="space-y-6">
            {/* Page Header with Portfolio Selector */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b">
                        <div className="flex items-center gap-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-sm text-muted-foreground font-medium">Portfolio:</span>
                                <span className="text-sm font-bold text-foreground">{formatCurrency(aggregates.totalValue)}</span>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${(Number(dashboardSummaryMemo?.day_change || 0)) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                                {(Number(dashboardSummaryMemo?.day_change || 0)) >= 0 ?
                                    <ArrowUpRight className="h-4 w-4 text-green-600" /> :
                                    <ArrowDownRight className="h-4 w-4 text-red-600" />}
                                <span className={`text-sm font-semibold ${(Number(dashboardSummaryMemo?.day_change || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(Math.abs(Number(dashboardSummaryMemo?.day_change || 0)))}
                                </span>
                                <span className={`text-sm ${(Number(dashboardSummaryMemo?.day_change_percent || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({(Number(dashboardSummaryMemo?.day_change_percent || 0)) >= 0 ? '+' : ''}{Number(dashboardSummaryMemo?.day_change_percent || 0).toFixed(2)}%)
                                </span>
                            </div>
                            <span className="text-sm text-muted-foreground">Today</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                            <div className={`p-3 rounded-lg border shadow-sm ${Number(weeklyPLTotal || 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {Number(weeklyPLTotal || 0) >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                                        <span className="text-xs text-muted-foreground">Weekly P/L</span>
                                    </div>
                                    <span className={`text-xs ${Number(weeklyPLPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(weeklyPLPercent || 0) >= 0 ? '+' : ''}{Number(weeklyPLPercent || 0).toFixed(2)}%</span>
                                </div>
                                <div className={`mt-1 text-lg font-bold ${Number(weeklyPLTotal || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Number(weeklyPLTotal || 0))}</div>
                            </div>

                            <div className={`p-3 rounded-lg border shadow-sm ${Number(monthlyPLTotal || 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {Number(monthlyPLTotal || 0) >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                                        <span className="text-xs text-muted-foreground">Monthly P/L</span>
                                    </div>
                                    <span className={`text-xs ${Number(monthlyPLPercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(monthlyPLPercent || 0) >= 0 ? '+' : ''}{Number(monthlyPLPercent || 0).toFixed(2)}%</span>
                                </div>
                                <div className={`mt-1 text-lg font-bold ${Number(monthlyPLTotal || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Number(monthlyPLTotal || 0))}</div>
                            </div>

                            <div className={`p-3 rounded-lg border shadow-sm ${Number(aggregates.unrealizedPL || 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className={`h-4 w-4 ${Number(aggregates.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                                        <span className="text-xs text-muted-foreground">Unrealized P/L</span>
                                    </div>
                                    <span className={`text-xs ${Number(aggregates.unrealizedPL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(aggregates.unrealizedPL || 0) >= 0 ? '+' : ''}{(((Number(aggregates.unrealizedPL || 0)) / Math.max(1, Number(aggregates.totalCost || 0))) * 100).toFixed(2)}%</span>
                                </div>
                                <div className={`mt-1 text-lg font-bold ${Number(aggregates.unrealizedPL || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Number(aggregates.unrealizedPL || 0))}</div>
                            </div>

                            <div className={`p-3 rounded-lg border shadow-sm ${Number(realizedYTD || 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Award className={`h-4 w-4 ${Number(realizedYTD || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                                        <span className="text-xs text-muted-foreground">Realized (YTD)</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatCurrency(Number(realizedToday))} today</span>
                                </div>
                                <div className={`mt-1 text-lg font-bold ${Number(realizedYTD || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Number(realizedYTD))}</div>
                            </div>

                            <div className="p-3 rounded-lg border shadow-sm bg-muted">
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Invested</span>
                                </div>
                                <div className="mt-1 text-lg font-bold text-foreground">{formatCurrency(Number(aggregates.totalCost || 0))}</div>
                            </div>

                            <div className="p-3 rounded-lg border shadow-sm bg-muted">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Cash</span>
                                </div>
                                <div className="mt-1 text-lg font-bold text-foreground">{formatCurrency(Number(aggregates.totalCash || 0))}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t">
                            <span className="text-sm text-muted-foreground font-medium">vs DSEX</span>
                            <div className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded-md border ${Number(vsIndex1D) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className="text-xs text-muted-foreground">1D</span>
                                    <span className={`ml-2 text-xs font-semibold ${Number(vsIndex1D) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(vsIndex1D) >= 0 ? '+' : ''}{Number(vsIndex1D).toFixed(2)}%</span>
                                </div>
                                <div className={`px-2 py-1 rounded-md border ${Number(vsIndex1W) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className="text-xs text-muted-foreground">1W</span>
                                    <span className={`ml-2 text-xs font-semibold ${Number(vsIndex1W) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(vsIndex1W) >= 0 ? '+' : ''}{Number(vsIndex1W).toFixed(2)}%</span>
                                </div>
                                <div className={`px-2 py-1 rounded-md border ${Number(vsIndex1M) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className="text-xs text-muted-foreground">1M</span>
                                    <span className={`ml-2 text-xs font-semibold ${Number(vsIndex1M) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(vsIndex1M) >= 0 ? '+' : ''}{Number(vsIndex1M).toFixed(2)}%</span>
                                </div>
                                <div className={`px-2 py-1 rounded-md border ${Number(vsIndexYTD) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                    <span className="text-xs text-muted-foreground">YTD</span>
                                    <span className={`ml-2 text-xs font-semibold ${Number(vsIndexYTD) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Number(vsIndexYTD) >= 0 ? '+' : ''}{Number(vsIndexYTD).toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Market Intelligence Card - REDESIGNED (Matching HTML Version) */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <CardTitle>Market Intelligence</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Market Overview - 5 Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* DSEX Index Card */}
                        <div
                            className="bg-white dark:bg-slate-950 rounded-xl p-5 border hover:shadow-lg transition-shadow">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                DSEX Index
                            </div>
                            <div className="text-sm font-bold text-foreground mb-2">
                                {benchmarkData?.close_value ? Number(benchmarkData.close_value).toFixed(2) : 'N/A'}
                            </div>
                            {benchmarkData?.daily_return != null && (
                                <div className={`text-sm font-medium flex items-center gap-1 ${Number(benchmarkData.daily_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {Number(benchmarkData.daily_return || 0) >= 0 ? '↑' : '↓'}
                                    <span>
                                        {Number(benchmarkData.change || 0) >= 0 ? '+' : ''}
                                        {Number(benchmarkData.change || 0).toFixed(2)}
                                    </span>
                                    <span>
                                        ({Number(benchmarkData.daily_return || 0) >= 0 ? '+' : ''}
                                        {Number(benchmarkData.daily_return || 0).toFixed(2)}%)
                                    </span>
                                </div>
                            )}
                            {(benchmarkData?.trades != null || benchmarkData?.total_value != null || benchmarkData?.volume != null) && (
                                <div className="mt-3 space-y-1.5">
                                    {benchmarkData?.trades != null && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Trades</span>
                                            <span className="text-sm font-semibold text-foreground">{Number(benchmarkData.trades).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {benchmarkData?.total_value != null && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Turnover</span>
                                            <span className="text-sm font-semibold text-foreground">{toMillions(benchmarkData.total_value).toFixed(2)}M</span>
                                        </div>
                                    )}
                                    {benchmarkData?.volume != null && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">Volume</span>
                                            <span className="text-sm font-semibold text-foreground">{toMillions(benchmarkData.volume).toFixed(2)}M</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Top Gainers Card */}
                        <div
                            className="bg-white dark:bg-slate-950 rounded-xl p-5 border hover:shadow-lg transition-shadow">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                Top Gainers
                            </div>
                            <ul className="space-y-2">
                                {marketTopMovers?.gainers && marketTopMovers.gainers.length > 0 ? (
                                    marketTopMovers.gainers.slice(0, 3).map((stock: any) => {
                                        const change = Number(stock.change_percent || 0);
                                        return (
                                            <li key={stock.symbol}
                                                className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                                                <span
                                                    className="text-sm font-medium text-foreground">{stock.symbol}</span>
                                                <span
                                                    className="text-sm font-semibold text-green-600">+{change.toFixed(2)}%</span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">FASFIN</span>
                                            <span className="text-sm font-semibold text-green-600">+10.10%</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">NBL</span>
                                            <span className="text-sm font-semibold text-green-600">+10.00%</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2">
                                            <span className="text-sm font-medium">CNATEX</span>
                                            <span className="text-sm font-semibold text-green-600">+10.00%</span>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Top Losers Card */}
                        <div
                            className="bg-white dark:bg-slate-950 rounded-xl p-5 border hover:shadow-lg transition-shadow">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                Top Losers
                            </div>
                            <ul className="space-y-2">
                                {marketTopMovers?.losers && marketTopMovers.losers.length > 0 ? (
                                    marketTopMovers.losers.slice(0, 3).map((stock: any) => {
                                        const change = Number(stock.change_percent || 0);
                                        return (
                                            <li key={stock.symbol}
                                                className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                                                <span
                                                    className="text-sm font-medium text-foreground">{stock.symbol}</span>
                                                <span
                                                    className="text-sm font-semibold text-red-600">{change.toFixed(2)}%</span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">SIMTEX</span>
                                            <span className="text-sm font-semibold text-red-600">-9.84%</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">PRAGATILIFE</span>
                                            <span className="text-sm font-semibold text-red-600">-7.89%</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2">
                                            <span className="text-sm font-medium">PRIMETEX</span>
                                            <span className="text-sm font-semibold text-red-600">-6.98%</span>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Most Active Card */}
                        <div
                            className="bg-white dark:bg-slate-950 rounded-xl p-5 border hover:shadow-lg transition-shadow">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                Most Active
                            </div>
                            <ul className="space-y-2">
                                {marketMostActive && marketMostActive.length > 0 ? (
                                    marketMostActive.slice(0, 3).map((stock: any) => {
                                        const volume = Number(stock.volume || 0);
                                        const volumeText = volume >= 1000000
                                            ? `${(volume / 1000000).toFixed(2)}M`
                                            : volume >= 1000
                                                ? `${(volume / 1000).toFixed(2)}K`
                                                : volume.toString();
                                        return (
                                            <li key={stock.symbol}
                                                className="flex items-center justify-between py-2 border-b border-muted last:border-0">
                                                <span
                                                    className="text-sm font-medium text-foreground">{stock.symbol}</span>
                                                <span
                                                    className="text-sm font-semibold text-muted-foreground">{volumeText}</span>
                                            </li>
                                        );
                                    })
                                ) : (
                                    <>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">BPPL</span>
                                            <span className="text-sm font-semibold text-muted-foreground">9.84M</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2 border-b border-muted">
                                            <span className="text-sm font-medium">IFIC</span>
                                            <span className="text-sm font-semibold text-muted-foreground">8.71M</span>
                                        </li>
                                        <li className="flex items-center justify-between py-2">
                                            <span className="text-sm font-medium">NBL</span>
                                            <span className="text-sm font-semibold text-muted-foreground">4.91M</span>
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Market Breadth Card */}
                        <div
                            className="bg-white dark:bg-slate-950 rounded-xl p-5 border hover:shadow-lg transition-shadow">
                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                Market Breadth
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex flex-col">
                                    <span
                                        className="text-sm font-bold text-green-600">{marketOverview.advancers}</span>
                                    <span className="text-sm text-muted-foreground mt-1">Advances</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-red-600">{marketOverview.decliners}</span>
                                    <span className="text-sm text-muted-foreground mt-1">Declines</span>
                                </div>
                            </div>
                            {marketOverview.advancers + marketOverview.decliners > 0 && (
                                <>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-600 transition-all"
                                            style={{
                                                width: `${(marketOverview.advancers / (marketOverview.advancers + marketOverview.decliners)) * 100}%`
                                            }}
                                        />
                                    </div>
                                    <div className="text-sm text-muted-foreground text-center mt-2">
                                        {marketOverview.unchanged} unchanged
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sector Performance */}
                    {sectorAnalysis?.sectors && Array.isArray(sectorAnalysis.sectors) && sectorAnalysis.sectors.length > 0 && (
                        <div>
                            <div className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                                Sector Performance
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                                {sectorAnalysis.sectors.slice(0, 12).map((sector: any) => {
                                    const perf = sector.performance || {};
                                    const change = Number(perf['1_day'] || perf['1_week'] || sector.change_percent || sector.change || 0);
                                    const positive = change >= 0;

                                    return (
                                        <div
                                            key={sector.sector || sector.name}
                                            className={`bg-white dark:bg-slate-950 rounded-lg p-4 border-l-4 hover:translate-y-[-2px] transition-transform ${positive ? 'border-l-green-600' : 'border-l-red-600'
                                                }`}
                                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-sm font-semibold text-foreground">
                                                    {sector.sector || sector.name}
                                                </span>
                                                <span
                                                    className={`text-sm font-bold ${positive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {positive ? '+' : ''}{change.toFixed(1)}%
                                                </span>
                                            </div>
                                            {sector.market_cap_weight && (
                                                <div className="text-sm text-muted-foreground">
                                                    {Number(sector.market_cap_weight).toFixed(1)}% weight
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid grid-cols-5 w-full max-w-2xl">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="goals">Goals</TabsTrigger>
                    <TabsTrigger value="risk">Risk</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <Card className="lg:col-span-4">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Broker Portfolios
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                    {enrichedPortfolios.map((p) => {
                                        const gainLoss = (p as any).totalValue - (p as any).totalCost - (p as any).cash;
                                        const gainLossPercent = (p as any).totalCost > 0 ? (gainLoss / (p as any).totalCost) * 100 : 0;
                                        return (
                                            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { (onSelectPortfolioId ? onSelectPortfolioId(String(p.id)) : setGlobalSelectedPortfolioId(String(p.id))); onNavigate('portfolio-detail'); }}>
                                                <CardHeader>
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-lg">{p.name}</CardTitle>
                                                        <Badge variant={gainLoss >= 0 ? 'default' : 'destructive'}>
                                                            {formatPercent(gainLossPercent)}
                                                        </Badge>
                                                    </div>
                                                    {(p as any).description && (
                                                        <p className="text-sm text-muted-foreground">{(p as any).description}</p>
                                                    )}
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">Total Value</span>
                                                            <span>{formatCurrency((p as any).totalValue)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">Gain/Loss</span>
                                                            <span className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {formatCurrency(gainLoss)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">Holdings</span>
                                                            <span>{p.stocks.length} stocks</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm text-muted-foreground">Cash</span>
                                                            <span>{formatCurrency(p.cash)}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Contribution Analytics</span>
                                    <div className="flex gap-1 bg-muted rounded-lg p-1">
                                        <button onClick={() => setContributionView('daily')}
                                            className={`px-3 py-1 rounded text-sm ${contributionView === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Daily
                                            P/L
                                        </button>
                                        <button onClick={() => setContributionView('weekly')}
                                            className={`px-3 py-1 rounded text-sm ${contributionView === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Weekly
                                            P/L
                                        </button>
                                        <button onClick={() => setContributionView('unrealized')}
                                            className={`px-3 py-1 rounded text-sm ${contributionView === 'unrealized' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Unrealized
                                            P/L
                                        </button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RBarChart
                                            data={(contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized)}
                                            layout="vertical" margin={{ left: 0, right: 20 }}>
                                            <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12 }} />
                                            <YAxis type="category" dataKey="symbol" width={100} stroke="#64748b"
                                                tick={{ fontSize: 12 }} />
                                            <Tooltip contentStyle={{
                                                backgroundColor: 'var(--background)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 8
                                            }} formatter={(value: number) => [formatCurrency(Number(value)), 'P/L']} />
                                            <Bar dataKey="pl" radius={[0, 4, 4, 0]}>
                                                {(contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized).map((entry, index) => (
                                                    <Cell key={`cell-${index}`}
                                                        fill={entry.pl >= 0 ? '#10b981' : '#f43f5e'} />
                                                ))}
                                            </Bar>
                                        </RBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t">
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground mb-1">Total Positive</div>
                                        <div className="text-sm text-green-600">
                                            {formatCurrency(((contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized).filter(d => d.pl > 0).reduce((sum, d) => sum + d.pl, 0)))}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground mb-1">Total Negative</div>
                                        <div className="text-sm text-red-600">
                                            {formatCurrency(((contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized).filter(d => d.pl < 0).reduce((sum, d) => sum + d.pl, 0)))}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground mb-1">Net</div>
                                        <div
                                            className={`text-sm ${(contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized).reduce((sum, d) => sum + d.pl, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(((contributionView === 'daily' ? contributionDaily : contributionView === 'weekly' ? contributionWeekly : contributionUnrealized).reduce((sum, d) => sum + d.pl, 0)))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChart className="h-5 w-5" />
                                    Sector Exposure
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {sectorExposure.map((sec) => (
                                        <div key={sec.sector}>
                                            <div className="flex justify-between text-sm mb-1"><span>{sec.sector}</span><span
                                                className="font-semibold">{sec.percent.toFixed(1)}%</span></div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-primary"
                                                    style={{ width: `${sec.percent}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" className="w-full mt-4"
                                    onClick={() => onNavigate('allocation')}>View Detailed Allocation</Button>
                            </CardContent>
                        </Card>
                    </div>




                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Activity className="h-5 w-5" />
                                    Recent Activity
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentOrders.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline"
                                                    className={`${order.side === 'buy' ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>{order.side.toUpperCase()}</Badge>
                                                <div>
                                                    <div
                                                        className="font-medium">{order.symbol} · {order.orderType.toUpperCase()}</div>
                                                    <div
                                                        className="text-sm text-muted-foreground">Qty {order.quantity} · {order.status.toUpperCase()}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">{formatCurrency(order.totalValue)}</div>
                                                <div
                                                    className="text-sm text-muted-foreground">Fees: {formatCurrency(order.fees)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" className="w-full mt-4" onClick={() => onNavigate('orders')}>View
                                    All Orders</Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Risk Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {riskAlerts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Shield className="h-12 w-12 mx-auto text-green-600 mb-3" />
                                        <p className="text-muted-foreground">No active risk alerts</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {riskAlerts.map((alert, index) => (
                                            <div key={index}
                                                className={`p-4 rounded-lg border ${alert.severity === 'high' ? 'bg-red-50 border-red-200' : alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle
                                                        className={`h-5 w-5 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`} />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span
                                                                className="font-semibold">{alert.type.toUpperCase()}</span>
                                                            <Badge variant="outline"
                                                                className={alert.severity === 'high' ? 'border-red-300 text-red-700' : alert.severity === 'medium' ? 'border-yellow-300 text-yellow-700' : 'border-emerald-300 text-emerald-700'}>
                                                                {alert.severity.toUpperCase()}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm">{alert.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <Button variant="outline" className="w-full mt-4"
                                    onClick={() => onNavigate('risk-analysis')}>View Risk Analysis</Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Overall Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Total Return</div>
                                        <div
                                            className={`text-sm font-semibold ${portfolioPerformance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.totalReturn)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Year to Date</div>
                                        <div
                                            className={`text-sm font-semibold ${portfolioPerformance.yearToDate >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.yearToDate)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">1Y Annualized</div>
                                        <div
                                            className={`text-sm font-semibold ${portfolioPerformance.oneYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.oneYear)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">3Y CAGR</div>
                                        <div
                                            className={`text-sm font-semibold ${portfolioPerformance.threeYear >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(portfolioPerformance.threeYear)}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Risk-Adjusted Metrics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                                        <div
                                            className="text-sm font-semibold">{portfolioPerformance.sharpeRatio.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Volatility</div>
                                        <div
                                            className="text-sm font-semibold">{formatPercent(portfolioPerformance.volatility)}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Max Drawdown</div>
                                        <div
                                            className="text-sm font-semibold">{formatPercent(portfolioPerformance.maxDrawdown)}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Best & Worst Periods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!bestWorstYTD ? (
                                    <div className="space-y-2">
                                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span className="text-sm">Best Month</span>
                                            </div>
                                            <span className="text-sm font-semibold text-green-600">
                                                {formatPercent(bestWorstYTD.best_month.return)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                <span className="text-sm">Worst Month</span>
                                            </div>
                                            <span className="text-sm font-semibold text-red-600">
                                                {formatPercent(bestWorstYTD.worst_month.return)}
                                            </span>
                                        </div>
                                        {cashFlowsYTD && (
                                            <>
                                                <div className="border-t pt-3 mt-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">Net Contributions</span>
                                                        <span className="text-sm font-medium text-green-600">
                                                            {formatCurrency(cashFlowsYTD.net_contributions)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className="text-sm text-muted-foreground">Net Withdrawals</span>
                                                    <span className="text-sm font-medium text-red-600">
                                                        {formatCurrency(cashFlowsYTD.net_withdrawals)}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="goals" className="space-y-6">
                    {/* Goals Overview Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Total Goals</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold">{investmentGoals.length}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {investmentGoals.filter(g => g.status === 'ACTIVE').length} active
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Total Target</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold">
                                    {formatCurrency(investmentGoals.reduce((sum, g) => sum + (Number(g.target) || 0), 0))}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Across all goals
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Average Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold">
                                    {investmentGoals.length > 0 && Object.keys(goalProgressMap).length > 0
                                        ? (Object.values(goalProgressMap).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0) / investmentGoals.length).toFixed(1)
                                        : '0.0'}%
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Overall completion
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Individual Goals */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Investment Goals</CardTitle>
                                <Button variant="outline" size="sm" onClick={() => onNavigate('goals')}>
                                    <Target className="h-4 w-4 mr-2" />
                                    Manage Goals
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {investmentGoals.length === 0 ? (
                                <div className="text-center py-8">
                                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-muted-foreground mb-4">No investment goals yet</p>
                                    <Button onClick={() => onNavigate('goals')}>
                                        Create Your First Goal
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {investmentGoals.map((goal) => {
                                        const progress = Number(goalProgressMap[goal.id]) || 0;
                                        const target = Number(goal.target) || 0;
                                        const currentAmount = (target * progress) / 100;
                                        const remaining = Math.max(0, target - currentAmount);

                                        return (
                                            <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-sm">{goal.name}</h3>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    goal.priority === 'High'
                                                                        ? 'border-red-200 text-red-600'
                                                                        : goal.priority === 'Medium'
                                                                            ? 'border-yellow-200 text-yellow-600'
                                                                            : 'border-blue-200 text-blue-600'
                                                                }
                                                            >
                                                                {goal.priority}
                                                            </Badge>
                                                            <Badge variant="outline">
                                                                {goal.status || 'ACTIVE'}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                            Target: {formatCurrency(target)} • Due: {goal.timeframe}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold">{progress.toFixed(1)}%</div>
                                                        <div className="text-sm text-muted-foreground">Complete</div>
                                                    </div>
                                                </div>

                                                <Progress value={progress} className="h-3" />

                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div>
                                                        <div className="text-muted-foreground">Current</div>
                                                        <div className="font-semibold text-green-600">
                                                            {formatCurrency(currentAmount)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Remaining</div>
                                                        <div className="font-semibold text-orange-600">
                                                            {formatCurrency(remaining)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Target</div>
                                                        <div className="font-semibold">
                                                            {formatCurrency(target)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {progress >= 100 && (
                                                    <div
                                                        className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                                                        <Award className="h-4 w-4" />
                                                        <span className="font-medium">Goal Achieved! 🎉</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="risk" className="space-y-6">
                    {/* Risk Overview Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Risk Score</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-sm font-bold">{(Number(dashboardSummaryMemo?.risk_score) || 0).toFixed(1)}</div>
                                <Badge
                                    variant="outline"
                                    className={
                                        dashboardSummaryMemo?.risk_level === 'HIGH'
                                            ? 'border-red-200 text-red-600 mt-2'
                                            : dashboardSummaryMemo?.risk_level === 'MODERATE'
                                                ? 'border-yellow-200 text-yellow-600 mt-2'
                                                : 'border-green-200 text-green-600 mt-2'
                                    }
                                >
                                    {dashboardSummaryMemo?.risk_level || 'LOW'}
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Volatility</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-sm font-bold">{formatPercent(portfolioPerformance?.volatility || 0)}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Annualized
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Max Drawdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="text-sm font-bold text-red-600">{formatPercent(portfolioPerformance?.maxDrawdown || 0)}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    Worst decline
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Active Alerts</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold">{riskAlerts?.length || 0}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    {(riskAlerts?.filter(a => a.severity === 'high') || []).length} high priority
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Risk Profile */}
                    {riskProfile && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Your Risk Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Risk Tolerance</div>
                                                <div
                                                    className="font-semibold text-sm capitalize">{riskProfile.risk_tolerance || 'Moderate'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Investment Horizon</div>
                                                <div
                                                    className="font-semibold">{riskProfile.investment_horizon || 'Medium-term'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Risk Capacity</div>
                                                <div
                                                    className="font-semibold capitalize">{riskProfile.risk_capacity || 'Moderate'}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-sm text-muted-foreground">Max Loss Tolerance</div>
                                                <div
                                                    className="font-semibold">{riskProfile.max_loss_tolerance ? `${riskProfile.max_loss_tolerance}%` : 'Not set'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Liquidity Needs</div>
                                                <div
                                                    className="font-semibold capitalize">{riskProfile.liquidity_needs || 'Moderate'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Profile Updated</div>
                                                <div className="font-semibold">
                                                    {riskProfile.updated_at ? new Date(riskProfile.updated_at).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Risk Metrics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Risk-Adjusted Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                                    <div
                                        className="text-sm font-bold">{(portfolioPerformance?.sharpeRatio || 0).toFixed(2)}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {(portfolioPerformance?.sharpeRatio || 0) > 1 ? 'Good' : (portfolioPerformance?.sharpeRatio || 0) > 0.5 ? 'Fair' : 'Poor'}
                                    </div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Volatility</div>
                                    <div
                                        className="text-sm font-bold">{formatPercent(portfolioPerformance?.volatility || 0)}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {Math.abs(portfolioPerformance?.volatility || 0) < 15 ? 'Low' : Math.abs(portfolioPerformance?.volatility || 0) < 25 ? 'Moderate' : 'High'}
                                    </div>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <div className="text-sm text-muted-foreground mb-1">Max Drawdown</div>
                                    <div
                                        className="text-sm font-bold text-red-600">{formatPercent(portfolioPerformance?.maxDrawdown || 0)}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Worst decline
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Risk Alerts */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Risk Alerts
                                </CardTitle>
                                <Button variant="outline" size="sm" onClick={() => onNavigate('risk-analysis')}>
                                    View All
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {riskAlerts.length === 0 ? (
                                <div className="text-center py-8">
                                    <Shield className="h-12 w-12 mx-auto text-green-600 mb-3" />
                                    <p className="text-muted-foreground">No active risk alerts</p>
                                    <p className="text-sm text-muted-foreground mt-1">Your portfolio is within
                                        acceptable risk parameters</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {riskAlerts.map((alert, index) => (
                                        <div key={index} className={`p-4 rounded-lg border ${alert.severity === 'high' ? 'bg-red-50 border-red-200' : alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-emerald-50 border-emerald-200'
                                            }`}>
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle
                                                    className={`h-5 w-5 mt-0.5 ${alert.severity === 'high' ? 'text-red-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-emerald-600'}`} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className="font-semibold">{alert.type.toUpperCase()}</span>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                alert.severity === 'high'
                                                                    ? 'border-red-300 text-red-700'
                                                                    : alert.severity === 'medium'
                                                                        ? 'border-yellow-300 text-yellow-700'
                                                                        : 'border-emerald-300 text-emerald-700'
                                                            }
                                                        >
                                                            {alert.severity.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm">{alert.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentTransactions.map((txn) => (
                                    <div key={txn.id} className="flex items-center justify-between py-2">
                                        <div>
                                            <div className="font-medium">{txn.type.toUpperCase()}</div>
                                            <div
                                                className="text-sm text-muted-foreground">{new Date(txn.date).toLocaleString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">{formatCurrency(txn.amount)}</div>
                                            <div
                                                className="text-sm text-muted-foreground">{txn.status.toUpperCase()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
