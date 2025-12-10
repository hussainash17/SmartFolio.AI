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

const SectorVisual = ({ name, weight, performance }: any) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 w-1/3">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
            <span className="text-xs font-medium text-muted-foreground uppercase">{name}</span>
        </div>

        {/* Composition Bar */}
        <div className="flex-1 px-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div style={{ width: `${Math.min(weight, 100)}%` }} className="h-full bg-primary/80 rounded-full"></div>
            </div>
            <span className="text-xs font-bold w-8 text-right">{weight}%</span>
        </div>

        {/* Performance */}
        <div className="w-1/4 text-right flex justify-end items-center gap-1">
            <span className={cn("text-xs font-bold", performance >= 0 ? "text-green-600" : "text-red-600")}>
                {performance > 0 ? '+' : ''}{performance}%
            </span>
            {performance >= 0 ? <ArrowUpRight size={12} className="text-green-600" /> : <ArrowDownRight size={12} className="text-red-600" />}
        </div>
    </div>
);

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
                                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    <div className="col-span-4">Market Event</div>
                                    <div className="col-span-4">Impact on You</div>
                                    <div className="col-span-4">Your Exposure</div>
                                </div>

                                {data.events.map((item: any, index: number) => (
                                    <ImpactRow key={index} {...item} />
                                ))}
                            </div>
                        )}

                        {/* Composition vs Performance */}
                        {data.sector_composition && data.sector_composition.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Composition vs Performance</h4>
                                </div>
                                <div className="space-y-1">
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
