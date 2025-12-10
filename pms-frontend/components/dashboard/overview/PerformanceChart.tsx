import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { useValueHistory } from '../../../hooks/usePerformance';
import { useAggregatedPortfolioHistory, AggregatedHistoryPoint } from '../../../hooks/useAnalytics';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const timeFilters = ['1W', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

// Helper function to get the start date based on filter
const getStartDate = (filter: string): Date | null => {
    const now = new Date();
    switch (filter) {
        case '1W':
            return new Date(now.setDate(now.getDate() - 7));
        case '1M':
            return new Date(now.setMonth(now.getMonth() - 1));
        case '3M':
            return new Date(now.setMonth(now.getMonth() - 3));
        case '6M':
            return new Date(now.setMonth(now.getMonth() - 6));
        case 'YTD':
            return new Date(now.getFullYear(), 0, 1); // January 1st of current year
        case '1Y':
            return new Date(now.setFullYear(now.getFullYear() - 1));
        case 'ALL':
        default:
            return null; // No filter, show all data
    }
};

interface PerformanceChartProps {
    portfolioId?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ portfolioId }) => {
    const [activeFilter, setActiveFilter] = useState('1M');
    const { data: valueHistory, isLoading: isLoadingPortfolio } = useValueHistory(
        portfolioId || null,
        activeFilter,
        'DSEX',
        'daily',
        { enabled: !!portfolioId }
    );

    // Fetch aggregated history when no portfolioId is provided (get more data to support filtering)
    const { data: aggregatedHistory, isLoading: isLoadingAggregated } = useAggregatedPortfolioHistory(365);

    const isLoading = portfolioId ? isLoadingPortfolio : isLoadingAggregated;

    // Filter and format data based on activeFilter
    const chartData = useMemo(() => {
        if (portfolioId) {
            return valueHistory?.data?.map((d: any) => ({
                date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                value: d.portfolio_value
            })) || [];
        }

        const rawData = aggregatedHistory as AggregatedHistoryPoint[] | undefined;
        if (!rawData) return [];

        const startDate = getStartDate(activeFilter);

        const filteredData = startDate
            ? rawData.filter(d => new Date(d.valuation_date) >= startDate)
            : rawData;

        return filteredData.map((d) => ({
            date: new Date(d.valuation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: d.total_value
        }));
    }, [portfolioId, valueHistory, aggregatedHistory, activeFilter]);

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
                {isLoading ? (
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
