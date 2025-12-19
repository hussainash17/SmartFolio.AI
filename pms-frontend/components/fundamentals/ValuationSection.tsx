import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";

interface ValuationSectionProps {
    pe: number;
    industryPe: number;
    pb: number;
    dividendYield: number;
    earningsYield: number;
    pegRatio: number;
}

export function ValuationSection({
    pe,
    industryPe,
    pb,
    dividendYield,
    earningsYield,
    pegRatio
}: ValuationSectionProps) {
    const pePercent = Math.min((pe / Math.max(pe, industryPe, 30)) * 100, 100);
    const industryPePercent = Math.min((industryPe / Math.max(pe, industryPe, 30)) * 100, 100);

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold">Valuation Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>P/E Ratio</span>
                            <span className="text-primary">{pe.toFixed(2)}</span>
                        </div>
                        <Progress value={pePercent} className="h-2 bg-muted/30" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span>Industry Average P/E</span>
                            <span className="text-muted-foreground">{industryPe.toFixed(2)}</span>
                        </div>
                        <Progress value={industryPePercent} className="h-2 bg-muted/30" />
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                        {pe < industryPe
                            ? `Trading at a ${((1 - pe / industryPe) * 100).toFixed(1)}% discount to industry average.`
                            : `Trading at a ${((pe / industryPe - 1) * 100).toFixed(1)}% premium to industry average.`
                        }
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/5">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">P/B Ratio</p>
                        <p className="text-lg font-bold">{pb.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">PEG Ratio</p>
                        <p className="text-lg font-bold">{pegRatio.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Div. Yield</p>
                        <p className="text-lg font-bold">{dividendYield.toFixed(2)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Earnings Yield</p>
                        <p className="text-lg font-bold">{earningsYield.toFixed(2)}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
