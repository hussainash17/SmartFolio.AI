import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart3, TrendingUp, Target, Layers } from "lucide-react";

interface ProfitabilitySectionProps {
    roe: number;
    roce: number;
    netMargin: number;
    grossMargin: number;
    assetTurnover: number;
}

export function ProfitabilitySection({
    roe,
    roce,
    netMargin,
    grossMargin,
    assetTurnover
}: ProfitabilitySectionProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Profitability & Efficiency
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Return on Equity (ROE)</p>
                            <p className="text-xl font-bold">{roe.toFixed(2)}%</p>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Return on Capital (ROCE)</p>
                            <p className="text-xl font-bold">{roce.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Net Profit Margin</span>
                            <span className="font-bold">{netMargin.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${netMargin}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Gross Profit Margin</span>
                            <span className="font-bold">{grossMargin.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${grossMargin}%` }} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Asset Turnover</span>
                    </div>
                    <span className="text-sm font-bold">{assetTurnover.toFixed(2)}x</span>
                </div>
            </CardContent>
        </Card>
    );
}
