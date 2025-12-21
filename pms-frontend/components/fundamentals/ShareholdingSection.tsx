import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, ShieldCheck } from "lucide-react";

interface ShareholdingSectionProps {
    data: { name: string; value: number; color: string }[];
    promoterPledge: number;
    foreignParticipation: number;
}

export function ShareholdingSection({
    data,
    promoterPledge,
    foreignParticipation
}: ShareholdingSectionProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Shareholding & Confidence
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#030213',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4 pt-4 border-t border-primary/5">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Promoter Pledge</span>
                        </div>
                        <span className={`text-sm font-bold ${promoterPledge === 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {promoterPledge.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">Foreign Participation</span>
                        </div>
                        <span className="text-sm font-bold">{foreignParticipation.toFixed(1)}%</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
