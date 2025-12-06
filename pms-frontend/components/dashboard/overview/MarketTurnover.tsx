import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { TrendingUp, Activity, Layers } from 'lucide-react';
import { useBenchmarkData } from '../../../hooks/useDashboardMarket';
import { formatCurrency } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

const mockChartData = [
    { day: 'Sun', value: 450 },
    { day: 'Mon', value: 520 },
    { day: 'Tue', value: 480 },
    { day: 'Wed', value: 610 },
    { day: 'Thu', value: 550 },
];

const MetricItem = ({ label, value, change, icon: Icon, color }: any) => (
    <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
            <div className={cn("p-1.5 rounded-md bg-opacity-10", color.replace('text-', 'bg-'))}>
                <Icon size={14} className={color} />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <h4 className="text-lg font-bold">{value}</h4>
            {change && <span className="text-xs font-medium text-green-600">{change}</span>}
        </div>
    </div>
);

const MarketTurnover: React.FC = () => {
    const { data: benchmark } = useBenchmarkData();

    const formatTurnover = (val: number) => {
        if (!val) return "0.0 Cr";
        // If value is very large (e.g. > 10 million), assume it's raw Taka and convert to Cr
        if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
        // Otherwise assume it's already in Millions
        return `${(val / 10).toFixed(1)} Cr`;
    };

    const formatVolume = (val: number) => {
        if (!val) return "0.0 M";
        // If value is large (e.g. > 1 million), assume raw count
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)} M`;
        // Otherwise assume it's already in Millions
        return `${val.toFixed(1)} M`;
    };

    const formatTrades = (val: number) => {
        if (!val) return "0 K";
        // If value is large (e.g. > 1000), assume raw count
        if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
        // Otherwise assume it's already in Thousands
        return `${val.toFixed(1)} K`;
    };

    const turnover = benchmark?.total_value ? formatTurnover(Number(benchmark.total_value)) : "550 Cr";
    const volume = benchmark?.volume ? formatVolume(Number(benchmark.volume)) : "12.5 M";
    const trades = benchmark?.trades ? formatTrades(Number(benchmark.trades)) : "145 K";

    return (
        <Card className="h-full border-none shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Market Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between gap-4 mb-6">
                    <MetricItem
                        label="Turnover"
                        value={turnover}
                        change="+5.2%"
                        icon={TrendingUp}
                        color="text-blue-500"
                    />
                    <MetricItem
                        label="Volume"
                        value={volume}
                        change="+2.1%"
                        icon={Layers}
                        color="text-purple-500"
                    />
                    <MetricItem
                        label="Trades"
                        value={trades}
                        change="+1.8%"
                        icon={Activity}
                        color="text-orange-500"
                    />
                </div>

                <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockChartData}>
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {mockChartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index === mockChartData.length - 1 ? '#3b82f6' : '#e5e7eb'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default MarketTurnover;
