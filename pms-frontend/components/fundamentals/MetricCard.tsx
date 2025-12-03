import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface MetricCardProps {
    label: string;
    value: string | number;
    sectorAverage?: string | number;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    status?: 'good' | 'fair' | 'poor';
    description?: string;
    sparklineData?: number[];
}

function getStatusColor(status?: string) {
    switch (status) {
        case 'good':
            return 'bg-green-500/10 text-green-700 border-green-500/30';
        case 'fair':
            return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30';
        case 'poor':
            return 'bg-red-500/10 text-red-700 border-red-500/30';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
}

function getTrendIcon(trend?: string) {
    switch (trend) {
        case 'up':
            return <TrendingUp className="h-3 w-3 text-green-600" />;
        case 'down':
            return <TrendingDown className="h-3 w-3 text-red-600" />;
        default:
            return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
}

export function MetricCard({
    label,
    value,
    sectorAverage,
    trend,
    trendValue,
    status,
    description,
    sparklineData,
}: MetricCardProps) {
    return (
        <Card className={`${getStatusColor(status)} transition-colors`}>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {/* Label with Info Icon */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                            {label}
                            {description && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Info className="h-3 w-3 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="text-xs">{description}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </span>
                        {trend && (
                            <div className="flex items-center gap-1">
                                {getTrendIcon(trend)}
                                {trendValue && <span className="text-xs">{trendValue}</span>}
                            </div>
                        )}
                    </div>

                    {/* Value */}
                    <div className="text-2xl font-bold">{value}</div>

                    {/* Sector Average Comparison */}
                    {sectorAverage && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                            <span>Sector Avg</span>
                            <span className="font-medium">{sectorAverage}</span>
                        </div>
                    )}

                    {/* Simple Sparkline */}
                    {sparklineData && sparklineData.length > 0 && (
                        <div className="h-8 flex items-end gap-0.5">
                            {sparklineData.map((val, idx) => {
                                const maxVal = Math.max(...sparklineData);
                                const height = (val / maxVal) * 100;
                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 bg-primary/30 rounded-t"
                                        style={{ height: `${height}%` }}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
