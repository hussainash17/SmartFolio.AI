import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

import clsx from 'clsx';

const sparkData = [
    { value: 100 }, { value: 102 }, { value: 101 }, { value: 104 }, { value: 103 },
    { value: 105 }, { value: 108 }, { value: 106 }, { value: 109 }, { value: 110 },
];

const IndexCard = ({ name, value, change, percent, isPositive }: any) => (
    <div className="bg-white dark:bg-surface-card-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col justify-between h-32">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{name}</p>
                <p className="text-xl font-bold mt-1">{value}</p>
            </div>
            <div className={clsx("text-right", isPositive ? "text-positive" : "text-negative")}>
                <p className="text-sm font-bold flex items-center justify-end gap-1">
                    {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {percent}%
                </p>
                <p className="text-xs">{isPositive ? '+' : ''}{change}</p>
            </div>
        </div>
        <div className="h-12 w-full mt-2">
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
    </div>
);

const IndexOverview: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IndexCard name="DSEX" value="5,321.45" change="42.12" percent="0.85" isPositive={true} />
            <IndexCard name="DS30" value="1,985.20" change="-5.30" percent="-0.21" isPositive={false} />
            <IndexCard name="DSES" value="1,150.80" change="12.40" percent="1.10" isPositive={true} />
        </div>
    );
};

export default IndexOverview;
