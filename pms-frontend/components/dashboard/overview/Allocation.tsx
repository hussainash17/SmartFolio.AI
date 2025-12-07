import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface AllocationProps {
    data?: any[];
}

const DEFAULT_DATA = [
    { name: 'Equity', value: 68, color: '#3b82f6' },
    { name: 'Mutual Funds', value: 22, color: '#10b981' },
    { name: 'Cash', value: 8, color: '#9ca3af' },
    { name: 'Crypto', value: 2, color: '#f59e0b' },
];

const Allocation: React.FC<AllocationProps> = ({ data = DEFAULT_DATA }) => {
    // Ensure we have valid data, fallback to default if empty or undefined
    const chartData = data && data.length > 0 ? data : DEFAULT_DATA;

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-base font-medium">Asset Allocation</CardTitle>
            </CardHeader>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_DATA[index % DEFAULT_DATA.length].color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number) => [`${value}%`, 'Allocation']}
                            contentStyle={{
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ color: 'var(--foreground)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default Allocation;
