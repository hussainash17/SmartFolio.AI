import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from 'recharts';
import { PieSectorDataItem } from 'recharts/types/polar/Pie';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface AllocationProps {
    data?: any[];
}

const DEFAULT_DATA = [
    { name: 'Equity', allocation_percent: 100, allocation_value: 0, color: '#3b82f6' }
];

const renderActiveShape = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
}: PieSectorDataItem) => {
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * (midAngle ?? 1));
    const cos = Math.cos(-RADIAN * (midAngle ?? 1));
    const sx = (cx ?? 0) + ((outerRadius ?? 0) + 10) * cos;
    const sy = (cy ?? 0) + ((outerRadius ?? 0) + 10) * sin;
    const mx = (cx ?? 0) + ((outerRadius ?? 0) + 30) * cos;
    const my = (cy ?? 0) + ((outerRadius ?? 0) + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
                {payload.name}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={(outerRadius ?? 0) + 6}
                outerRadius={(outerRadius ?? 0) + 10}
                fill={fill}
            />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">{`${payload.name} ${value?.toLocaleString()}`}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
                {`(${((percent ?? 1) * 100).toFixed(2)}%)`}
            </text>
        </g>
    );
};


const Allocation: React.FC<AllocationProps> = ({ data = DEFAULT_DATA }) => {
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    // Ensure we have valid data, fallback to default if empty or undefined
    const chartData = data && data.length > 0 ? data : DEFAULT_DATA;

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const onPieLeave = () => {
        setActiveIndex(undefined);
    };

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4">
                <CardTitle className="text-base font-medium">Asset Allocation</CardTitle>
            </CardHeader>
            <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            activeIndex={activeIndex}
                            activeShape={renderActiveShape}
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="allocation_value"
                            onMouseEnter={onPieEnter}
                            onMouseLeave={onPieLeave}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_DATA[index % DEFAULT_DATA.length].color} />
                            ))}
                        </Pie>

                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default Allocation;
