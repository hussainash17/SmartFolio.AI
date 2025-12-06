import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../Card';
import clsx from 'clsx';

const data = [
    { date: 'Jan', value: 2400000 },
    { date: 'Feb', value: 2450000 },
    { date: 'Mar', value: 2420000 },
    { date: 'Apr', value: 2480000 },
    { date: 'May', value: 2550000 },
    { date: 'Jun', value: 2520000 },
    { date: 'Jul', value: 2600000 },
    { date: 'Aug', value: 2580000 },
    { date: 'Sep', value: 2650000 },
    { date: 'Oct', value: 2487314 },
];

const timeFilters = ['1D', '1W', '1M', '3M', '6M', 'YTD', 'ALL'];

const PerformanceChart: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState('YTD');

    return (
        <Card title="Portfolio Performance">
            <div className="flex justify-end mb-4">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {timeFilters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={clsx(
                                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                                activeFilter === filter
                                    ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`৳ ${value.toLocaleString()}`, 'Value']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#1A73E8"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default PerformanceChart;
