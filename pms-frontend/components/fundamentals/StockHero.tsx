import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign, Percent } from "lucide-react";

interface StockHeroProps {
    symbol: string;
    companyName: string;
    sector: string;
    category: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    healthScore: number;
    valuationLabel: string;
    dividendYield: number;
}

export function StockHero({
    symbol,
    companyName,
    sector,
    category,
    currentPrice,
    priceChange,
    priceChangePercent,
    healthScore,
    valuationLabel,
    dividendYield
}: StockHeroProps) {
    const isPositive = priceChange >= 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight">{symbol}</h1>
                        <Badge variant="outline" className="text-sm px-2 py-0.5">
                            {category}
                        </Badge>
                    </div>
                    <p className="text-lg text-muted-foreground mt-1">{companyName}</p>
                    <Badge variant="secondary" className="mt-2">
                        {sector}
                    </Badge>
                </div>

                <div className="text-right">
                    <div className="flex items-baseline justify-end gap-2">
                        <span className="text-4xl font-bold">BDT {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <div className={`flex items-center text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                            <span>{isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
                        </div>
                    </div>
                    <p className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{priceChange.toFixed(2)} BDT Today
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Health Gauge Card */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-muted/20"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - healthScore / 100)}
                                    className="text-green-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{healthScore}%</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Activity className="h-4 w-4" />
                                <span className="text-sm font-medium uppercase tracking-wider">Fundamental Health</span>
                            </div>
                            <p className="text-lg font-semibold">Strong Score</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Valuation Gauge Card */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-muted/20"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - 0.65)} // Mocked for visual
                                    className="text-blue-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <span className="absolute text-xs font-bold text-center leading-tight">Fair<br />Value</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-sm font-medium uppercase tracking-wider">Valuation</span>
                            </div>
                            <p className="text-lg font-semibold">{valuationLabel}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Dividend Gauge Card */}
                <Card className="bg-card/50 backdrop-blur-sm border-primary/10">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="relative h-20 w-20 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-muted/20"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={2 * Math.PI * 36 * (1 - Math.min(dividendYield / 10, 1))}
                                    className="text-yellow-500 transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <span className="absolute text-xl font-bold">{dividendYield.toFixed(1)}%</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Percent className="h-4 w-4" />
                                <span className="text-sm font-medium uppercase tracking-wider">Dividend Yield</span>
                            </div>
                            <p className="text-lg font-semibold">Excellent</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
