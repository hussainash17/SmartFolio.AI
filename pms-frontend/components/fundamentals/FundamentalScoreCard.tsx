import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";

interface ScoreBreakdown {
    category: string;
    score: number;
    maxScore: number;
    description: string;
}

interface FundamentalScoreCardProps {
    overallScore: number;
    breakdown: ScoreBreakdown[];
    sectorAverage?: number;
    trend?: 'improving' | 'declining' | 'stable';
    explanation?: string;
}

function getScoreGrade(score: number) {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-600' };
    if (score >= 70) return { label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-600' };
    if (score >= 50) return { label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-600' };
    if (score >= 30) return { label: 'Weak', color: 'text-orange-600', bgColor: 'bg-orange-600' };
    return { label: 'Poor', color: 'text-red-600', bgColor: 'bg-red-600' };
}

export function FundamentalScoreCard({
    overallScore,
    breakdown,
    sectorAverage,
    trend,
    explanation,
}: FundamentalScoreCardProps) {
    const grade = getScoreGrade(overallScore);

    return (
        <Card className="border-2">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Fundamental Strength Score
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Overall Score Display */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className={`text-5xl font-bold ${grade.color}`}>{overallScore}</div>
                        <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                    </div>
                    <div className="text-right space-y-1">
                        <Badge className={`${grade.color} text-lg px-3 py-1`}>
                            {grade.label}
                        </Badge>
                        {trend && (
                            <div className="flex items-center justify-end gap-1 text-sm">
                                {trend === 'improving' && (
                                    <>
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                        <span className="text-green-600">Improving</span>
                                    </>
                                )}
                                {trend === 'declining' && (
                                    <>
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                        <span className="text-red-600">Declining</span>
                                    </>
                                )}
                                {trend === 'stable' && (
                                    <span className="text-muted-foreground">Stable</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sector Comparison */}
                {sectorAverage !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Sector Average</span>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold">{sectorAverage}</span>
                            <Badge variant="outline" className={overallScore > sectorAverage ? 'text-green-600' : 'text-red-600'}>
                                {overallScore > sectorAverage ? 'Above' : 'Below'} Avg
                            </Badge>
                        </div>
                    </div>
                )}

                {/* Score Breakdown */}
                <div className="space-y-3">
                    <div className="text-sm font-medium">Score Breakdown</div>
                    {breakdown.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span>{item.category}</span>
                                <span className="font-medium">
                                    {item.score}/{item.maxScore}
                                </span>
                            </div>
                            <Progress
                                value={(item.score / item.maxScore) * 100}
                                className="h-2"
                            />
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                        </div>
                    ))}
                </div>

                {/* Explanation */}
                {explanation && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="text-xs font-medium text-primary mb-1">Analysis</div>
                        <div className="text-sm text-muted-foreground">{explanation}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
