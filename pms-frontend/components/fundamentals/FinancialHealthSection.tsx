import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

interface FinancialHealthSectionProps {
    debtToEquity: number;
    interestCoverage: number;
    currentRatio: number;
    cashPosition: number;
    operatingCashFlow: number;
    healthScore: number;
}

export function FinancialHealthSection({
    debtToEquity,
    interestCoverage,
    currentRatio,
    cashPosition,
    operatingCashFlow,
    healthScore
}: FinancialHealthSectionProps) {
    const getHealthColor = (score: number) => {
        if (score >= 80) return "text-green-500";
        if (score >= 50) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Financial Health
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Health Meter */}
                <div className="flex flex-col items-center justify-center py-4 relative">
                    <svg className="w-48 h-24" viewBox="0 0 100 50">
                        <path
                            d="M 10 45 A 35 35 0 0 1 90 45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-muted/20"
                            strokeLinecap="round"
                        />
                        <path
                            d="M 10 45 A 35 35 0 0 1 90 45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray="125.6"
                            strokeDashoffset={125.6 * (1 - healthScore / 100)}
                            className={`${getHealthColor(healthScore)} transition-all duration-1000 ease-out`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute bottom-4 text-center">
                        <span className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>{healthScore}%</span>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Health Score</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Debt to Equity</p>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-lg font-bold">{debtToEquity.toFixed(2)}</span>
                            {debtToEquity < 0.5 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : debtToEquity > 1.5 ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : null}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Current Ratio</p>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-lg font-bold">{currentRatio.toFixed(2)}</span>
                            {currentRatio > 1.5 ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : currentRatio < 1 ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : null}
                        </div>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Interest Coverage</p>
                        <p className="text-lg font-bold mt-1">{interestCoverage.toFixed(1)}x</p>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground uppercase font-semibold">Cash Position</p>
                        <p className="text-lg font-bold mt-1">{cashPosition.toLocaleString()}M</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-primary/5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Operating Cash Flow</span>
                        <span className={`text-sm font-bold ${operatingCashFlow > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {operatingCashFlow > 0 ? '+' : ''}{operatingCashFlow.toLocaleString()}M
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
