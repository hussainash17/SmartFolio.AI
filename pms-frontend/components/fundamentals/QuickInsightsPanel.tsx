import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Insight {
    type: 'strength' | 'concern' | 'note';
    message: string;
}

interface QuickInsightsPanelProps {
    insights: Insight[];
}

function getInsightIcon(type: string) {
    switch (type) {
        case 'strength':
            return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'concern':
            return <AlertCircle className="h-4 w-4 text-red-600" />;
        case 'note':
            return <Info className="h-4 w-4 text-blue-600" />;
        default:
            return <Info className="h-4 w-4" />;
    }
}

function getInsightColor(type: string) {
    switch (type) {
        case 'strength':
            return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
        case 'concern':
            return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
        case 'note':
            return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
        default:
            return 'bg-muted border-border';
    }
}

export function QuickInsightsPanel({ insights }: QuickInsightsPanelProps) {
    if (!insights || insights.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Insights</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {insights.map((insight, idx) => (
                        <li
                            key={idx}
                            className={`flex items-start gap-2 p-3 rounded-lg border ${getInsightColor(insight.type)}`}
                        >
                            <div className="mt-0.5">
                                {getInsightIcon(insight.type)}
                            </div>
                            <span className="text-sm">{insight.message}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
