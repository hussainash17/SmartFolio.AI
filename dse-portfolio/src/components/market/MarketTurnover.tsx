import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import Card from '../Card';
import { TrendingUp, Activity, Layers } from 'lucide-react';

const data = [
    { day: 'Sun', value: 450 },
    { day: 'Mon', value: 520 },
    { day: 'Tue', value: 480 },
    { day: 'Wed', value: 610 },
    { day: 'Thu', value: 550 },
];

const MetricItem = ({ label, value, change, icon: Icon, color }: any) => (
    <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-md ${color} bg-opacity-10`}>
                <Icon size={14} className={color.replace('bg-', 'text-')} />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <h4 className="text-lg font-bold">{value}</h4>
            <span className="text-xs font-medium text-positive">{change}</span>
        </div>
    </div>
);

const MarketTurnover: React.FC = () => {
    return (
        <Card title="Market Activity" className="h-full">
            <div className="flex justify-between gap-4 mb-6">
                <MetricItem
                    label="Turnover"
                    value="৳ 550 Cr"
                    change="+5.2%"
                    icon={TrendingUp}
                    color="bg-blue-500"
                />
                <MetricItem
                    label="Volume"
                    value="12.5 M"
                    change="+2.1%"
                    icon={Layers}
                    color="bg-purple-500"
                />
                <MetricItem
                    label="Trades"
                    value="145 K"
                    change="+1.8%"
                    icon={Activity}
                    color="bg-orange-500"
                />
            </div>

            <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index === data.length - 1 ? '#1A73E8' : '#E5E7EB'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default MarketTurnover;
