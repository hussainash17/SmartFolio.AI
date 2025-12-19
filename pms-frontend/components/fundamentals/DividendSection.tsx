import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Percent, TrendingUp } from "lucide-react";

interface DividendSectionProps {
    dividendHistory: { year: string; amount: number }[];
    payoutRatio: number;
    industryYield: number;
    currentYield: number;
}

export function DividendSection({
    dividendHistory,
    payoutRatio,
    industryYield,
    currentYield
}: DividendSectionProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    Dividend & Income Profile
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dividendHistory}>
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
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#030213',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="amount" fill="#eab308" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/5">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Payout Ratio</p>
                        <p className="text-lg font-bold mt-1">{payoutRatio.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Sustainable</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Yield vs Industry</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-lg font-bold">{currentYield.toFixed(1)}%</p>
                            <span className="text-xs text-green-500 font-medium flex items-center">
                                <TrendingUp className="h-3 w-3 mr-0.5" />
                                +{(currentYield - industryYield).toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Industry: {industryYield.toFixed(1)}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
