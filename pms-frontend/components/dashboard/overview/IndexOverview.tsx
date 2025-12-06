import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card } from '../../ui/card';
import { useBenchmarkData } from '../../../hooks/useDashboardMarket';
import { cn } from '../../../lib/utils';

const sparkData = [
    { value: 100 }, { value: 102 }, { value: 101 }, { value: 104 }, { value: 103 },
    { value: 105 }, { value: 108 }, { value: 106 }, { value: 109 }, { value: 110 },
];

const IndexCard = ({ name, value, change, percent, isPositive }: any) => (
    <Card className="p-4 flex flex-col justify-between h-32 border-none shadow-sm bg-card">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{name}</p>
                <p className="text-xl font-bold mt-1">{value}</p>
            </div>
            <div className={cn("text-right", isPositive ? "text-green-600" : "text-red-600")}>
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
                        stroke={isPositive ? '#10b981' : '#ef4444'}
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </Card>
);

const IndexOverview: React.FC = () => {
    const { data: dsexData } = useBenchmarkData();

    // Real DSEX Data
    const dsexValue = dsexData?.close_value ? Number(dsexData.close_value).toFixed(2) : "5,321.45";
    const dsexChange = dsexData?.change ? Number(dsexData.change).toFixed(2) : "42.12";
    const dsexPercent = dsexData?.daily_return ? Number(dsexData.daily_return).toFixed(2) : "0.85";
    const dsexPositive = Number(dsexPercent) >= 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IndexCard
                name="DSEX"
                value={dsexValue}
                change={dsexChange}
                percent={dsexPercent}
                isPositive={dsexPositive}
            />
            {/* Mock Data for other indices */}
            <IndexCard name="DS30" value="1,985.20" change="-5.30" percent="-0.21" isPositive={false} />
            <IndexCard name="DSES" value="1,150.80" change="12.40" percent="1.10" isPositive={true} />
        </div>
    );
};

export default IndexOverview;
