import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

interface SentimentProps {
    score: number; // 0-3
}

const MarketSentiment: React.FC<SentimentProps> = ({ score }) => {
    const getSentiment = (s: number) => {
        if (s >= 2) return { label: 'Bullish', color: 'text-positive', bg: 'bg-green-50 dark:bg-green-900/20', icon: TrendingUp };
        if (s === 1) return { label: 'Neutral', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800', icon: Minus };
        return { label: 'Bearish', color: 'text-negative', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown };
    };

    const { label, color, bg, icon: Icon } = getSentiment(score);

    return (
        <div className={clsx("rounded-xl p-4 flex items-center justify-between border border-gray-200 dark:border-gray-800", bg)}>
            <div className="flex items-center gap-3">
                <div className={clsx("p-2 rounded-full bg-white dark:bg-gray-900 shadow-sm", color)}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider opacity-70">Market Sentiment</p>
                    <p className={clsx("text-xl font-bold", color)}>{label}</p>
                </div>
            </div>

            <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={clsx(
                            "w-8 h-2 rounded-full transition-colors",
                            i < score ? (score >= 2 ? 'bg-positive' : 'bg-gray-400') : 'bg-gray-200 dark:bg-gray-700'
                        )}
                    />
                ))}
            </div>
        </div>
    );
};

export default MarketSentiment;
