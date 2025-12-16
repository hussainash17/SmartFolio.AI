import React from 'react';
import { ArrowUpRight, ArrowRight, ArrowDownRight, Wallet, PiggyBank, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, XAxis, AreaChart, Area } from 'recharts';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { useDashboardSummary } from '../../../hooks/useDashboardSummary';
import { formatCurrency } from '../../../lib/utils';

// Data moved to component

import { usePortfolioSparkline } from '../../../hooks/usePortfolioSparkline';

interface PortfolioSummaryProps {
    onNavigate?: (view: string) => void;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ onNavigate }) => {
    const { data: summary } = useDashboardSummary();
    const { data: historyData } = usePortfolioSparkline();

    const totalValue = Number(summary?.total_portfolio_value || 0);
    const dayChange = Number(summary?.day_change || 0);
    const dayChangePercent = Number(summary?.day_change_percent || 0);
    const isPositive = dayChange >= 0;

    // New Metrics
    const totalInvested = Number(summary?.total_investment || 0);
    const cashBalance = Number(summary?.cash_balance || 0);
    const realizedGain = Number(summary?.total_realized_gains || 0);

    // Calculate Unrealized Gain
    // If totalInvested is 0, we can't calculate it accurately from summary alone, 
    // but typically Total Value = Invested + Unrealized + Cash (if total value includes cash)
    // OR Total Value (Stocks) = Invested + Unrealized.
    // Based on useDashboardSummary types: stock_value is likely what we compare against total_investment
    const stockValue = Number(summary?.stock_value || 0);
    const unrealizedGain = stockValue - totalInvested;
    const unrealizedGainPercent = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;

    const chartData = React.useMemo(() => {
        if (!historyData) return [];

        // Map API data to chart format
        const mappedData = historyData.map(item => ({
            date: item.valuation_date,
            value: Number(item.total_value)
        }));

        // Check if today is already in the list
        const today = new Date().toISOString().split('T')[0];
        const lastEntry = mappedData[mappedData.length - 1];

        // If the last entry is not today, and we have a current total value, append it
        if (summary?.total_portfolio_value && (!lastEntry || lastEntry.date !== today)) {
            mappedData.push({
                date: today,
                value: Number(summary.total_portfolio_value)
            });
        }

        // Ensure we only show last 10 points if we grew beyond it
        return mappedData.slice(-10);
    }, [historyData, summary]);

    // Refined Gradients
    const gradientClass = isPositive
        ? "bg-gradient-to-br from-[#059669] via-[#047857] to-[#064e3b] dark:from-[#059669] dark:via-[#047857] dark:to-[#022c22]"
        : "bg-gradient-to-br from-[#e11d48] via-[#be123c] to-[#881337] dark:from-[#e11d48] dark:via-[#be123c] dark:to-[#4c0519]";

    const chartColor = "#ffffff";
    const chartFill = isPositive ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.1)";

    return (
        <Card className={`relative overflow-hidden border-none shadow-lg ${gradientClass} text-white transition-all duration-300 hover:shadow-xl`}>
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <CardContent className="p-0 relative z-10">
                {/* Main Header Section */}
                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 opacity-90">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Wallet size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-medium tracking-wide">Total Portfolio Value</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            onClick={() => onNavigate?.('portfolios')}
                        >
                            <ArrowRight size={16} />
                        </Button>
                    </div>

                    <div className="flex items-end gap-3 mb-1">
                        <h2 className="text-4xl font-bold tracking-tight">{formatCurrency(totalValue)}</h2>
                    </div>

                    <div className="flex items-center gap-2 mb-6">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${isPositive ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/20 text-rose-100'} backdrop-blur-sm`}>
                            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            <span>{dayChangePercent.toFixed(2)}%</span>
                        </div>
                        <span className="text-sm opacity-80 font-medium">
                            {isPositive ? '+' : ''}{formatCurrency(dayChange)} Today
                        </span>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="h-24 w-full -mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="white" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="white" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" hide={true} />
                            <YAxis domain={['dataMin', 'dataMax']} hide={true} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                    padding: '8px 12px'
                                }}
                                itemStyle={{ color: isPositive ? '#059669' : '#e11d48', fontWeight: 'bold', fontSize: '14px' }}
                                labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '2px' }}
                                formatter={(value: number) => [formatCurrency(value), 'Value']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                cursor={{ stroke: 'rgba(255,255,255,0.5)', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={chartColor}
                                strokeWidth={3}
                                fill="url(#chartGradient)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: 'white' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Glassmorphism Stats Grid */}
                <div className="grid grid-cols-2 gap-px bg-white/10 backdrop-blur-md border-t border-white/10">
                    {/* Invested */}
                    <div className="p-4 hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <PiggyBank size={14} />
                            <span className="text-xs font-medium uppercase tracking-wider">Invested</span>
                        </div>
                        <p className="text-base font-bold">{formatCurrency(totalInvested)}</p>
                    </div>

                    {/* Cash */}
                    <div className="p-4 hover:bg-white/5 transition-colors group border-l border-white/10">
                        <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <DollarSign size={14} />
                            <span className="text-xs font-medium uppercase tracking-wider">Cash</span>
                        </div>
                        <p className="text-base font-bold">{formatCurrency(cashBalance)}</p>
                    </div>

                    {/* Unrealized P/L */}
                    <div className="p-4 hover:bg-white/5 transition-colors group border-t border-white/10">
                        <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <PieChart size={14} />
                            <span className="text-xs font-medium uppercase tracking-wider">Unrealized</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-base font-bold">{formatCurrency(unrealizedGain)}</p>
                            <span className={`text-xs font-bold ${unrealizedGain >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                                {unrealizedGain >= 0 ? '+' : ''}{unrealizedGainPercent.toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Realized P/L */}
                    <div className="p-4 hover:bg-white/5 transition-colors group border-t border-l border-white/10">
                        <div className="flex items-center gap-2 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {realizedGain >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span className="text-xs font-medium uppercase tracking-wider">Realized</span>
                        </div>
                        <p className={`text-base font-bold ${realizedGain >= 0 ? 'text-white' : 'text-rose-200'}`}>
                            {realizedGain >= 0 ? '+' : ''}{formatCurrency(realizedGain)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PortfolioSummary;
