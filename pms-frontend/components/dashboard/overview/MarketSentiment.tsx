import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../../ui/card';
import { cn } from '../../../lib/utils';

interface SentimentProps {
    score?: number; // 0-3
}

const MarketSentiment: React.FC<SentimentProps> = ({ score = 2 }) => {
    const getSentiment = (s: number) => {
        if (s >= 2) return { label: 'Bullish', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', icon: TrendingUp };
        if (s === 1) return { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted', icon: Minus };
        return { label: 'Bearish', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown };
    };

    const { label, color, bg, icon: Icon } = getSentiment(score);

    return (
        <Card className={cn("p-4 flex items-center justify-between border-none shadow-sm", bg)}>
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full bg-background shadow-sm", color)}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider opacity-70">Market Sentiment</p>
                    <p className={cn("text-xl font-bold", color)}>{label}</p>
                </div>
            </div>

            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={cn(
                            "w-8 h-2 rounded-full transition-colors",
                            i < score ? (score >= 2 ? 'bg-green-600' : 'bg-muted-foreground') : 'bg-muted-foreground/20'
                        )}
                    />
                ))}
            </div>
        </Card>
    );
};

export default MarketSentiment;
