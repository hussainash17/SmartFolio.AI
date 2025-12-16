import React from 'react';
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { usePortfolioImpact } from '../../../hooks/useAnalytics';

const ImpactRow = ({ event, impact, exposure }: any) => (
    <div className="grid grid-cols-12 gap-4 py-3 border-b border-border last:border-0 items-center">
        <div className="col-span-4">
            <p className="font-bold text-sm text-foreground">{event.name}</p>
            <p className={cn("text-xs font-medium mt-0.5", event.change >= 0 ? "text-green-600" : "text-red-600")}>
                {event.change >= 0 ? '+' : ''}{event.change}% Today
            </p>
        </div>
        <div className="col-span-4">
            <div className="flex items-center gap-1.5">
                {impact.value > 0 ? <ArrowUp size={14} className="text-green-600" /> :
                    impact.value < 0 ? <ArrowDown size={14} className="text-red-600" /> :
                        <Minus size={14} className="text-muted-foreground" />}
                <span className={cn("font-bold text-sm",
                    impact.value > 0 ? "text-green-600" :
                        impact.value < 0 ? "text-red-600" : "text-muted-foreground"
                )}>
                    {impact.value > 0 ? '+' : ''}৳ {Math.abs(impact.value).toLocaleString()}
                </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">{impact.desc}</p>
        </div>
        <div className="col-span-4">
            <p className="font-medium text-sm">{exposure.value}% <span className="text-xs text-muted-foreground font-normal">(vs Mkt {exposure.market}%)</span></p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-1">{exposure.desc}</p>
        </div>
    </div>
);

const SectorVisual = ({ name, weight, performance }: any) => {
    // Calculate impact score
    const impact = (weight * performance) / 100;
    const isPositive = performance >= 0;
    const isImpactPositive = impact >= 0;

    return (
        <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-md hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0">
            {/* Sector Name */}
            <div className="col-span-4 flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <span className="text-xs font-medium text-foreground truncate" title={name}>{name}</span>
            </div>

            {/* Weight (Progress Bar) */}
            <div className="col-span-3 flex flex-col justify-center">
                <div className="flex justify-between items-end mb-0.5">
                    <span className="text-[10px] text-muted-foreground">Weight</span>
                    <span className="text-[10px] font-medium">{weight}%</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden w-full">
                    <div
                        style={{ width: `${Math.min(weight, 100)}%` }}
                        className="h-full bg-primary/60 rounded-full"
                    ></div>
                </div>
            </div>

            {/* Return (Raw %) */}
            <div className="col-span-2 text-right">
                <span className={cn("text-[10px] font-medium", isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {isPositive ? '+' : ''}{performance}%
                </span>
            </div>

            {/* Impact (Highlighted) */}
            <div className="col-span-3 text-right">
                <div className={cn(
                    "inline-flex items-center justify-end gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[3.5rem]",
                    isImpactPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}>
                    {isImpactPositive ? '+' : ''}{impact.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};

const PortfolioImpact: React.FC = () => {
    const { data, isLoading } = usePortfolioImpact();

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Market Impact Analysis</CardTitle>
                <CardDescription>How today's market affects you</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : !data || (!data.events?.length && !data.sector_composition?.length) ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No significant market events affecting your portfolio today.
                    </div>
                ) : (
                    <>
                        {/* Impact Table */}
                        {data.events && data.events.length > 0 && (
                            <div className="mb-6">
                                <div className="grid grid-cols-12 gap-2 pb-1.5 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <div className="col-span-4">Event</div>
                                    <div className="col-span-4">Impact</div>
                                    <div className="col-span-4">Exposure</div>
                                </div>

                                {data.events.map((item: any, index: number) => (
                                    <ImpactRow key={index} {...item} />
                                ))}
                            </div>
                        )}

                        {/* Sector Performance Attribution */}
                        {data.sector_composition && data.sector_composition.length > 0 && (
                            <div className="border border-border/50 rounded-lg overflow-hidden">
                                {/* Explicit Headers */}
                                <div className="grid grid-cols-12 gap-2 px-2 py-2 bg-muted/30 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <div className="col-span-4">Sector</div>
                                    <div className="col-span-3">PF Weight</div>
                                    <div className="col-span-2 text-right">Sector (%)</div>
                                    <div className="col-span-3 text-right">PF Impact (%)</div>
                                </div>

                                <div className="bg-card">
                                    {data.sector_composition.slice(0, 5).map((sector: any, index: number) => (
                                        <SectorVisual key={index} {...sector} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default PortfolioImpact;
