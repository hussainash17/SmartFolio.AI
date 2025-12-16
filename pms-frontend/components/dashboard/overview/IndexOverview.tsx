import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card } from '../../ui/card';
import { useMarketIndices } from '../../../hooks/useDashboardMarket';
import { cn } from '../../../lib/utils';

const IndexCard = ({ name, value, change, percent, isPositive, series }: any) => {
    // Format sparkline data from API series
    const sparkData = series && series.length > 0
        ? series.map((p: any) => ({ value: Number(p.v) }))
        : [{ value: 100 }, { value: 102 }, { value: 101 }, { value: 104 }, { value: 103 }];

    return (
        <Card className="p-3 flex flex-col justify-between h-32 border-none shadow-sm bg-card">
            <div className="flex flex-col">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{name}</p>
                    <div className={cn(
                        "flex items-center gap-0.5 text-xs font-semibold",
                        isPositive ? "text-green-600" : "text-red-600"
                    )}>
                        {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        <span>{percent}%</span>
                    </div>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                    <p className="text-lg font-bold">{value}</p>
                    <p className={cn(
                        "text-[10px] font-medium",
                        isPositive ? "text-green-600" : "text-red-600"
                    )}>
                        {isPositive ? '+' : ''}{change}
                    </p>
                </div>
            </div>
            <div className="h-10 w-full mt-1">
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
};

const IndexOverview: React.FC = () => {
    const { data: indicesData } = useMarketIndices();

    // Format DSEX data
    const dsexValue = indicesData?.DSEX?.level
        ? Number(indicesData.DSEX.level).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—";
    const dsexChange = indicesData?.DSEX?.change
        ? Number(indicesData.DSEX.change).toFixed(2)
        : "—";
    const dsexPercent = indicesData?.DSEX?.change_percent
        ? Number(indicesData.DSEX.change_percent).toFixed(2)
        : "—";
    const dsexPositive = indicesData?.DSEX?.change_percent ? Number(indicesData.DSEX.change_percent) >= 0 : true;

    // Format DS30 data
    const ds30Value = indicesData?.DS30?.level
        ? Number(indicesData.DS30.level).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—";
    const ds30Change = indicesData?.DS30?.change
        ? Number(indicesData.DS30.change).toFixed(2)
        : "—";
    const ds30Percent = indicesData?.DS30?.change_percent
        ? Number(indicesData.DS30.change_percent).toFixed(2)
        : "—";
    const ds30Positive = indicesData?.DS30?.change_percent ? Number(indicesData.DS30.change_percent) >= 0 : true;

    // Format DSES data
    const dsesValue = indicesData?.DSES?.level
        ? Number(indicesData.DSES.level).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—";
    const dsesChange = indicesData?.DSES?.change
        ? Number(indicesData.DSES.change).toFixed(2)
        : "—";
    const dsesPercent = indicesData?.DSES?.change_percent
        ? Number(indicesData.DSES.change_percent).toFixed(2)
        : "—";
    const dsesPositive = indicesData?.DSES?.change_percent ? Number(indicesData.DSES.change_percent) >= 0 : true;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IndexCard
                name="DSEX"
                value={dsexValue}
                change={dsexChange}
                percent={dsexPercent}
                isPositive={dsexPositive}
                series={indicesData?.DSEX?.series}
            />
            <IndexCard
                name="DS30"
                value={ds30Value}
                change={ds30Change}
                percent={ds30Percent}
                isPositive={ds30Positive}
                series={indicesData?.DS30?.series}
            />
            <IndexCard
                name="DSES"
                value={dsesValue}
                change={dsesChange}
                percent={dsesPercent}
                isPositive={dsesPositive}
                series={indicesData?.DSES?.series}
            />
        </div>
    );
};

export default IndexOverview;
