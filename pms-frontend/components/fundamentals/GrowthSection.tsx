import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';

interface GrowthSectionProps {
    quarterlyEps: { quarter: string; eps: number; isPositive: boolean }[];
    navTrend: { year: string; nav: number }[];
    revenueGrowth: number;
    profitGrowth: number;
}

export function GrowthSection({
    quarterlyEps,
    navTrend,
    revenueGrowth,
    profitGrowth
}: GrowthSectionProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quarterly EPS Comparison */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Quarterly EPS (Earnings Per Share)</CardTitle>
                    <p className="text-sm text-muted-foreground">Last 8 quarters performance</p>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={quarterlyEps}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="quarter"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#717182', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#717182', fontSize: 12 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: '#030213',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="eps" radius={[4, 4, 0, 0]}>
                                    {quarterlyEps.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.eps >= 0 ? '#22c55e' : '#ef4444'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* NAV per Share Trend */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">NAV per Share (Net Asset Value)</CardTitle>
                    <p className="text-sm text-muted-foreground">5-year asset appreciation trend</p>
                </CardHeader>
                <CardContent>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={navTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="year"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#717182', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#717182', fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#030213',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="nav"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Growth Summary */}
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-primary/10">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Revenue CAGR (3Y)</p>
                            <p className="text-2xl font-bold text-primary">{revenueGrowth.toFixed(1)}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Net Profit CAGR (3Y)</p>
                            <p className="text-2xl font-bold text-primary">{profitGrowth.toFixed(1)}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">EPS Growth (YoY)</p>
                            <p className="text-2xl font-bold text-green-500">+12.4%</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Asset Growth</p>
                            <p className="text-2xl font-bold text-green-500">+8.2%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
