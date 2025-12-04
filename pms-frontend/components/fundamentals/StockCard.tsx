import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
    TrendingUp, TrendingDown, Eye, BarChart3,
    Plus, Heart, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { formatCurrency } from "../../lib/utils";

interface StockCardProps {
    symbol: string;
    companyName: string;
    sector: string;
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    pe?: number;
    dividendYield?: number;
    roe?: number;
    debtToEquity?: number;
    fundamentalScore: number;
    onViewDetails: () => void;
    onCompare: () => void;
    onTrade: () => void;
    onAddToWatchlist: () => void;
    isSelected?: boolean;
}

function formatNumber(n?: number | null) {
    if (n === undefined || n === null) return "-";
    if (!isFinite(n)) return "-";
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getScoreColor(score: number) {
    if (score >= 70) return "bg-green-500/10 text-green-700 border-green-500/20";
    if (score >= 50) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    return "bg-red-500/10 text-red-700 border-red-500/20";
}

function getScoreLabel(score: number) {
    if (score >= 70) return "Strong";
    if (score >= 50) return "Moderate";
    return "Weak";
}

export function StockCard({
    symbol,
    companyName,
    sector,
    currentPrice,
    priceChange,
    priceChangePercent,
    pe,
    dividendYield,
    roe,
    debtToEquity,
    fundamentalScore,
    onViewDetails,
    onCompare,
    onTrade,
    onAddToWatchlist,
    isSelected = false,
}: StockCardProps) {
    const isPositive = priceChange >= 0;

    return (
        <Card
            className={`group hover:shadow-lg transition-all duration-200 ${isSelected ? 'ring-2 ring-primary' : ''
                }`}
        >
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg truncate">{symbol}</h3>
                            <Badge
                                variant="outline"
                                className={getScoreColor(fundamentalScore)}
                            >
                                {fundamentalScore}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{companyName}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                            {sector}
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToWatchlist();
                        }}
                    >
                        <Heart className="h-4 w-4" />
                    </Button>
                </div>

                {/* Price */}
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{formatNumber(currentPrice)}</span>
                        <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            <span>{isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
                        </div>
                    </div>
                    <div className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{formatNumber(priceChange)}
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                        <div className="text-xs text-muted-foreground">P/E Ratio</div>
                        <div className="font-medium">{pe ? formatNumber(pe) : '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Div Yield</div>
                        <div className="font-medium">{dividendYield ? `${dividendYield.toFixed(2)}%` : '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">ROE</div>
                        <div className="font-medium">{roe ? `${roe.toFixed(2)}%` : '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">Debt/Equity</div>
                        <div className="font-medium">{debtToEquity ? formatNumber(debtToEquity) : '-'}</div>
                    </div>
                </div>

                {/* Score Badge */}
                <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Fundamental Strength</span>
                        <Badge className={getScoreColor(fundamentalScore)}>
                            {getScoreLabel(fundamentalScore)}
                        </Badge>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={onViewDetails}
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={onCompare}
                    >
                        <BarChart3 className="h-3 w-3 mr-1" />
                        Compare
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="text-xs bg-green-600 hover:bg-green-700"
                        onClick={onTrade}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Trade
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
