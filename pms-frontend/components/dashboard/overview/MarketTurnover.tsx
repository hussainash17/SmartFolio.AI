import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { TrendingUp, Activity, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { useMarketSummary, useBenchmarkLast5Days } from '../../../hooks/useDashboardMarket';
import { cn } from '../../../lib/utils';

const MetricItem = ({ label, value, change, icon: Icon, color }: any) => {
    const isPositive = change && parseFloat(change) >= 0;
    const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
        <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
                <div className={cn("p-1 rounded", color.replace('text-', 'bg-'))}>
                    <Icon size={12} className={color} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <h4 className="text-base font-bold">{value}</h4>
                {change && <span className={`text-[10px] font-medium ${changeColor}`}>{change}</span>}
            </div>
        </div>
    );
};

const MarketTurnover: React.FC = () => {
    const { data: marketSummary } = useMarketSummary();
    const { data: benchmarkLast5Days } = useBenchmarkLast5Days('DSEX');

    const formatTurnover = (val: number) => {
        if (!val) return "0.0 Cr";
        if (val >= 10000000) return `${(val / 10000000).toFixed(1)} Cr`;
        return `${(val / 10).toFixed(1)} Cr`;
    };

    const formatVolume = (val: number) => {
        if (!val) return "0.0 M";
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)} M`;
        return `${val.toFixed(1)} M`;
    };

    const formatTrades = (val: number) => {
        if (!val) return "0 K";
        if (val >= 1000) return `${(val / 1000).toFixed(1)} K`;
        return `${val.toFixed(1)} K`;
    };

    const chartData = benchmarkLast5Days?.data?.map((item, index, arr) => {
        const date = new Date(item.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        let change = 0;
        let changePercent = 0;
        if (index > 0) {
            const prevValue = arr[index - 1].value_in_crore;
            change = item.value_in_crore - prevValue;
            changePercent = prevValue > 0 ? (change / prevValue) * 100 : 0;
        }
        
        return {
            day: dayName,
            value: item.value_in_crore,
            change,
            changePercent,
            fullDate: item.date,
            isLatest: index === arr.length - 1
        };
    }) || [];

    const getIntensityColor = (value: number, isLatest: boolean) => {
        if (isLatest) return '#3b82f6';
        
        const maxValue = Math.max(...chartData.map(d => d.value), 1);
        const minValue = Math.min(...chartData.map(d => d.value), 0);
        const range = maxValue - minValue || 1;
        const normalized = (value - minValue) / range;
        
        if (normalized >= 0.7) return '#10b981';
        if (normalized >= 0.4) return '#f59e0b';
        return '#ef4444';
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload[0]) {
            const data = payload[0].payload;
            const changeIcon = data.change >= 0 ? <ArrowUp size={12} className="text-green-600" /> : <ArrowDown size={12} className="text-red-600" />;
            const changeColor = data.change >= 0 ? 'text-green-600' : 'text-red-600';
            
            return (
                <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
                    <p className="font-semibold text-xs">{data.day}</p>
                    <p className="text-xs font-bold text-blue-600">{data.value.toFixed(2)} Cr</p>
                    {data.change !== 0 && (
                        <div className={cn("text-[10px] flex items-center gap-1 mt-0.5", changeColor)}>
                            {changeIcon}
                            <span>{data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} Cr ({data.changePercent.toFixed(1)}%)</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // Get current values
    const turnoverValue = marketSummary?.total_turnover ? Number(marketSummary.total_turnover) : 0;
    const volumeValue = marketSummary?.total_volume || 0;
    const tradesValue = marketSummary?.total_trades || 0;
    
    const turnover = formatTurnover(turnoverValue);
    const volume = formatVolume(volumeValue);
    const trades = formatTrades(tradesValue);
    
    // Format change percentages
    const formatChangePercent = (percent: number | undefined) => {
        if (percent === undefined || percent === null) return null;
        const sign = percent >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(1)}%`;
    };
    
    const turnoverChange = formatChangePercent(marketSummary?.turnover_change_percent);
    const volumeChange = formatChangePercent(marketSummary?.volume_change_percent);
    const tradesChange = formatChangePercent(marketSummary?.trades_change_percent);

    return (
        <Card className="h-full border-none shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Market Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex justify-between gap-3">
                    <MetricItem
                        label="Turnover"
                        value={turnover}
                        change={turnoverChange}
                        icon={TrendingUp}
                        color="text-blue-500"
                    />
                    <MetricItem
                        label="Volume"
                        value={volume}
                        change={volumeChange}
                        icon={Layers}
                        color="text-purple-500"
                    />
                    <MetricItem
                        label="Trades"
                        value={trades}
                        change={tradesChange}
                        icon={Activity}
                        color="text-orange-500"
                    />
                </div>

                <div className="relative p-2 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg">
                    {/* Cr label positioned outside the chart */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
                        <span className="text-[9px] font-medium text-muted-foreground rotate-[-90deg] inline-block whitespace-nowrap">
                            Crores
                        </span>
                    </div>
                    
                    <div className="h-28 pl-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                                barCategoryGap="35%"
                            >
                                <CartesianGrid 
                                    strokeDasharray="2 2" 
                                    stroke="var(--border)" 
                                    vertical={false}
                                    opacity={0.3}
                                />
                                <XAxis 
                                    dataKey="day" 
                                    tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={2}
                                />
                                <YAxis 
                                    tick={{ fontSize: 8, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={25}
                                    tickFormatter={(value) => value.toFixed(0)}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                                <Bar 
                                    dataKey="value" 
                                    radius={[3, 3, 0, 0]}
                                    animationDuration={400}
                                    maxBarSize={18}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={getIntensityColor(entry.value, entry.isLatest)}
                                            opacity={entry.isLatest ? 1 : 0.85}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MarketTurnover;