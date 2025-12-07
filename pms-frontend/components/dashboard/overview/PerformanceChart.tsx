import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useValueHistory } from '../../../hooks/usePerformance';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const timeFilters = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

interface PerformanceChartProps {
    portfolioId?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ portfolioId }) => {
    const [activeFilter, setActiveFilter] = useState('YTD');
    const { data: valueHistory, isLoading } = useValueHistory(
        portfolioId || null,
        activeFilter,
        'DSEX',
        'daily',
        { enabled: !!portfolioId }
    );

    // Mock data for overall view (when no portfolioId is provided)
    const mockData = [
        { date: '2024-01-01', portfolio_value: 1000000 },
        { date: '2024-02-01', portfolio_value: 1050000 },
        { date: '2024-03-01', portfolio_value: 1030000 },
        { date: '2024-04-01', portfolio_value: 1080000 },
        { date: '2024-05-01', portfolio_value: 1120000 },
        { date: '2024-06-01', portfolio_value: 1150000 },
        { date: '2024-07-01', portfolio_value: 1140000 },
        { date: '2024-08-01', portfolio_value: 1180000 },
        { date: '2024-09-01', portfolio_value: 1200000 },
        { date: '2024-10-01', portfolio_value: 1250000 },
    ];

    const dataToUse = portfolioId ? valueHistory?.data : mockData;

    const chartData = dataToUse?.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: d.portfolio_value
    })) || [];

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium">Portfolio Performance</CardTitle>
                <div className="flex bg-muted rounded-lg p-1">
                    {timeFilters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                                activeFilter === filter
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <div className="h-[280px] w-full">
                {isLoading && portfolioId ? (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                        Loading chart data...
                    </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                dy={10}
                                minTickGap={30}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value: number) => [formatCurrency(value), 'Value']}
                                labelStyle={{ color: 'var(--foreground)', marginBottom: '0.25rem' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                        No data available for this period
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PerformanceChart;
