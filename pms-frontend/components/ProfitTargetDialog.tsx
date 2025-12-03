import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowUpRight, Target, TrendingUp, BarChart2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency, formatPercent } from "../lib/utils";
import { ProfitTargetsData } from "../types/profit-target";

interface ProfitTargetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    symbol: string;
    currentPrice: number;
    entryPrice: number;
    data?: ProfitTargetsData;
    isLoading?: boolean;
}

export function ProfitTargetDialog({
    open,
    onOpenChange,
    symbol,
    currentPrice,
    entryPrice,
    data,
    isLoading = false
}: ProfitTargetDialogProps) {
    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Calculating Profit Targets for {symbol}</DialogTitle>
                        <DialogDescription>
                            Analyzing technical indicators and market data...
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!data) return null;

    const getContextColor = (value: string, type: 'trend' | 'volatility' | 'sector') => {
        const lowerVal = value.toLowerCase();

        if (type === 'trend') {
            if (lowerVal.includes('up') || lowerVal.includes('bull')) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            if (lowerVal.includes('down') || lowerVal.includes('bear')) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
        }

        if (type === 'volatility') {
            if (lowerVal === 'low') return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            if (lowerVal === 'high') return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800";
        }

        if (type === 'sector') {
            if (lowerVal.includes('outperform')) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
            if (lowerVal.includes('underperform')) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
            return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";
        }

        return "bg-secondary text-secondary-foreground";
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400";
        if (confidence >= 0.6) return "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400";
        return "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400";
    };

    const getProbabilityColor = (probString: string) => {
        const prob = parseInt(probString.replace('%', ''));
        if (prob >= 75) return "bg-green-500";
        if (prob >= 50) return "bg-amber-500";
        return "bg-slate-500";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Target className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">Profit Targets: {symbol}</DialogTitle>
                                <DialogDescription>
                                    AI-driven exit strategies based on technical analysis
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-sm text-muted-foreground">Current Price</div>
                            <div className="font-bold text-lg">{formatCurrency(currentPrice)}</div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                    {/* Left Column: Primary Target & Context */}
                    <div className="md:col-span-1 space-y-4">
                        <Card className="bg-primary/5 border-primary/20 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Target className="h-24 w-24" />
                            </div>
                            <CardContent className="p-5">
                                <div className="text-sm font-medium text-primary mb-1">Primary Target</div>
                                <div className="text-3xl font-bold text-foreground">{formatCurrency(data.primary.price)}</div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant="outline" className="bg-background/50 backdrop-blur">
                                        +{formatPercent(data.primary.percentage_gain)}
                                    </Badge>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConfidenceColor(data.primary.confidence || 0)}`}>
                                        {Math.round((data.primary.confidence || 0) * 100)}% Conf.
                                    </span>
                                </div>
                                <div className="mt-4 text-xs text-muted-foreground bg-background/50 p-2 rounded border border-primary/10 break-words">
                                    {data.primary.rationale}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                                    <BarChart2 className="h-4 w-4" />
                                    Market Context
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col items-center text-center space-y-1">
                                        <div className="text-xs text-muted-foreground">Trend</div>
                                        <Badge variant="outline" className={`text-xs font-normal capitalize whitespace-normal h-auto text-center leading-tight py-1 border ${getContextColor(data.market_context.trend, 'trend')}`}>
                                            {data.market_context.trend}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-1">
                                        <div className="text-xs text-muted-foreground">Volatility</div>
                                        <Badge variant="outline" className={`text-xs font-normal capitalize whitespace-normal h-auto text-center leading-tight py-1 border ${getContextColor(data.market_context.volatility, 'volatility')}`}>
                                            {data.market_context.volatility}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-1">
                                        <div className="text-xs text-muted-foreground">Sector</div>
                                        <Badge variant="outline" className={`text-xs font-normal capitalize whitespace-normal h-auto text-center leading-tight py-1 border ${getContextColor(data.market_context.sector_performance, 'sector')}`}>
                                            {data.market_context.sector_performance}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-1">
                                        <div className="text-xs text-muted-foreground">Strategy</div>
                                        <Badge variant="default" className="text-xs font-normal capitalize bg-blue-600 hover:bg-blue-700 whitespace-normal h-auto text-center leading-tight py-1">
                                            {data.market_context.recommended_strategy.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Detailed Strategies */}
                    <div className="md:col-span-2">
                        <Tabs defaultValue="tiered" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
                                <TabsTrigger value="tiered" className="h-auto py-2 flex flex-col items-center gap-0.5">
                                    <span>Tiered Exit</span>
                                    <span className="text-xs font-normal opacity-80">(Recommended)</span>
                                </TabsTrigger>
                                <TabsTrigger value="alternative" className="h-auto py-2">Alternative Models</TabsTrigger>
                            </TabsList>

                            <TabsContent value="tiered" className="space-y-4">
                                <div className="space-y-3">
                                    {data.tiered_targets.map((tier) => (
                                        <div key={tier.level} className="relative group">
                                            <div className="absolute left-[19px] top-8 bottom-[-12px] w-0.5 bg-border group-last:hidden"></div>
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-background ${tier.level === 3 ? 'border-green-500 text-green-600' : 'border-muted-foreground/30 text-muted-foreground'
                                                    }`}>
                                                    <span className="font-bold text-sm">{tier.level}</span>
                                                </div>

                                                <Card className="flex-1 hover:border-primary/50 transition-colors">
                                                    <CardContent className="p-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-lg">{formatCurrency(tier.price)}</span>
                                                                <span className="text-xs text-green-600 font-medium">+{formatPercent(tier.percentage_gain)}</span>
                                                            </div>
                                                            <Badge variant="outline" className="w-fit">
                                                                Prob: {tier.probability}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-muted-foreground">{tier.suggested_action}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Target</span>
                                                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${getProbabilityColor(tier.probability)}`}
                                                                        style={{ width: tier.probability }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="alternative">
                                <div className="grid gap-3">
                                    {data.alternative_methods.map((alt, index) => (
                                        <Card key={index}>
                                            <CardContent className="p-4 flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium capitalize mb-1">
                                                        {alt.method.replace(/_/g, ' ').replace(/(\d+(\.\d+)?)/, ' $1')}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Confidence</span>
                                                        <Progress value={alt.confidence * 100} className="w-20 h-1.5" />
                                                        <span className="text-xs font-medium">{Math.round(alt.confidence * 100)}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">{formatCurrency(alt.price)}</div>
                                                    <div className="text-xs text-green-600">+{formatPercent(alt.percentage_gain)}</div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    <div className="mt-2 p-3 bg-muted/50 rounded-lg flex gap-3 text-xs text-muted-foreground">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <p>
                                            Alternative models provide secondary confirmation. When multiple models converge on a similar price level, the resistance is likely stronger.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Calculated: {new Date(data.calculated_at).toLocaleString()}</span>
                    </div>
                    <div>
                        Next Update: {new Date(data.next_update).toLocaleTimeString()}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
