import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { AlertCircle, CheckCircle2, XCircle, Info } from "lucide-react";

interface RiskFactor {
    label: string;
    status: 'good' | 'warning' | 'danger';
    description: string;
}

interface RiskSectionProps {
    factors: RiskFactor[];
}

export function RiskSection({ factors }: RiskSectionProps) {
    const getIcon = (status: RiskFactor['status']) => {
        switch (status) {
            case 'good': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'warning': return <Info className="h-5 w-5 text-yellow-500" />;
            case 'danger': return <XCircle className="h-5 w-5 text-red-500" />;
        }
    };

    const getBgColor = (status: RiskFactor['status']) => {
        switch (status) {
            case 'good': return 'bg-green-500/5 border-green-500/10';
            case 'warning': return 'bg-yellow-500/5 border-yellow-500/10';
            case 'danger': return 'bg-red-500/5 border-red-500/10';
        }
    };

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-primary/10 h-full">
            <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-primary" />
                    Risks & Red Flags
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {factors.map((factor, index) => (
                    <div key={index} className={`p-4 rounded-xl border ${getBgColor(factor.status)} flex items-start gap-4`}>
                        <div className="mt-0.5">{getIcon(factor.status)}</div>
                        <div>
                            <p className="font-bold text-sm">{factor.label}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{factor.description}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
