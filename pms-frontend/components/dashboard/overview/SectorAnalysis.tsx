import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { useSectorAnalysis } from '../../../hooks/useDashboardMarket';

const SectorAnalysis: React.FC = () => {
    const { data } = useSectorAnalysis();

    // Transform API data for chart or use mock if empty
    const sectors = data?.sectors || [];
    const chartData: Array<{ name: string; value: number }> = sectors.length > 0
        ? sectors.map(s => {
            const performance = typeof s.performance === 'number' ? s.performance : (s.change_percent || 0);
            return {
                name: s.sector || s.name || '',
                value: performance
            };
        }).sort((a, b) => b.value - a.value).slice(0, 10) // Top 10 movers
        : [
            { name: 'IT', value: 2.4 },
            { name: 'Textile', value: 1.8 },
            { name: 'Pharma', value: 1.2 },
            { name: 'Bank', value: 0.5 },
            { name: 'Cement', value: -0.2 },
            { name: 'Fuel', value: -0.8 },
            { name: 'Ins', value: -1.5 },
            { name: 'Food', value: -2.1 },
        ];

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle>Sector Performance</CardTitle>
                <CardDescription>Top gaining and losing sectors today</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                interval={0}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background)',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, 'Change']}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default SectorAnalysis;
