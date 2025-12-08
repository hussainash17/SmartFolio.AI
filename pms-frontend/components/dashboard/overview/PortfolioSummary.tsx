import React from 'react';
import { ArrowUpRight, ArrowRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis, XAxis } from 'recharts';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { useDashboardSummary } from '../../../hooks/useDashboardSummary';
import { formatCurrency } from '../../../lib/utils';

// Data moved to component

import { usePortfolioSparkline } from '../../../hooks/usePortfolioSparkline';

const PortfolioSummary: React.FC = () => {
    const { data: summary } = useDashboardSummary();
    const { data: historyData } = usePortfolioSparkline();

    const totalValue = Number(summary?.total_portfolio_value || 0);
    const dayChange = Number(summary?.day_change || 0);
    const dayChangePercent = Number(summary?.day_change_percent || 0);
    const isPositive = dayChange >= 0;

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

    const gradientClass = isPositive
        ? "from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900"
        : "from-rose-600 to-red-700 dark:from-rose-800 dark:to-red-900";

    const textMutedClass = isPositive ? "text-emerald-100" : "text-rose-100";
    const tooltipColor = isPositive ? "#059669" : "#e11d48";

    return (
        <Card className={`bg-gradient-to-br ${gradientClass} text-white border-none overflow-hidden`}>
            <CardContent className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`${textMutedClass} text-xs font-medium uppercase tracking-wider`}>Total Portfolio Value</p>
                        <div className="flex items-baseline gap-3 mt-1">
                            <h2 className="text-3xl font-bold">{formatCurrency(totalValue)}</h2>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {isPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%
                            </span>
                        </div>
                        <p className={`${textMutedClass} text-xs mt-1`}>
                            {isPositive ? '+' : ''}{formatCurrency(dayChange)} Today
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-lg">
                        <ArrowRight size={18} />
                    </Button>
                </div>

                <div className="h-16 mt-4 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <XAxis dataKey="date" hide={true} />
                            <YAxis domain={['dataMin', 'dataMax']} hide={true} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                }}
                                itemStyle={{ color: tooltipColor, fontWeight: 'bold' }}
                                labelStyle={{ color: '#6b7280', fontSize: '12px' }}
                                formatter={(value: number) => [formatCurrency(value), 'Value']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#ffffff"
                                strokeWidth={2}
                                dot={false}
                                strokeOpacity={0.8}
                                activeDot={{ r: 4, strokeWidth: 0, fill: '#ffffff' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default PortfolioSummary;
