import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import Card from '../Card';
import clsx from 'clsx';

const sparkData = [
    { value: 100 }, { value: 102 }, { value: 101 }, { value: 104 }, { value: 103 },
    { value: 105 }, { value: 108 }, { value: 106 }, { value: 109 }, { value: 110 },
];

const IndexItem = ({ name, value, change, percent, isPositive }: any) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{name}</p>
            <p className="text-lg font-bold">{value}</p>
        </div>
        <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={isPositive ? '#00A676' : '#E53935'}
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
        <div className={clsx("text-right", isPositive ? "text-positive" : "text-negative")}>
            <p className="text-sm font-bold flex items-center justify-end gap-1">
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {percent}%
            </p>
            <p className="text-xs">{isPositive ? '+' : ''}{change}</p>
        </div>
    </div>
);

const MarketSummary: React.FC = () => {
    return (
        <Card title="Market Overview" action={<button className="text-primary text-sm font-medium">View All</button>}>
            <div className="flex flex-col">
                <IndexItem name="DSEX" value="5,321.45" change="42.12" percent="0.85" isPositive={true} />
                <IndexItem name="DS30" value="1,985.20" change="-5.30" percent="-0.21" isPositive={false} />
                <IndexItem name="DSES" value="1,150.80" change="12.40" percent="1.10" isPositive={true} />
            </div>
        </Card>
    );
};

export default MarketSummary;
