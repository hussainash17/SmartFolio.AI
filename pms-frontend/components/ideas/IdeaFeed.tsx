import React, { useState } from 'react';
import { useTradingIdeas } from '../../hooks/useTradingIdeas';
import { IdeaCard } from './IdeaCard';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Plus, Filter, RefreshCw } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface IdeaFeedProps {
    onSelectIdea?: (id: string) => void;
    onCreateIdea?: () => void;
    filterByUserId?: string; // Filter ideas by user ID
    followingOnly?: boolean; // Show only ideas from followed users
}

export const IdeaFeed: React.FC<IdeaFeedProps> = ({ onSelectIdea, onCreateIdea, filterByUserId, followingOnly = false }) => {
    const [symbol, setSymbol] = useState('');
    const [bias, setBias] = useState<string | undefined>(undefined);
    const [timeframe, setTimeframe] = useState<string | undefined>(undefined);

    const { ideas, isLoading, refetch } = useTradingIdeas({
        symbol: symbol || undefined,
        bias: bias === 'ALL' ? undefined : bias,
        timeframe: timeframe === 'ALL' ? undefined : timeframe,
        userId: filterByUserId, // Filter by user ID for "My Ideas"
        followingOnly: followingOnly, // Filter for "Following" tab
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card/30 p-4 rounded-xl border border-primary/10 backdrop-blur-md">
                <div className="flex flex-1 gap-2 w-full md:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter by symbol..."
                            className="pl-9 bg-background/50"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                        />
                    </div>
                    <Select value={bias || 'ALL'} onValueChange={setBias}>
                        <SelectTrigger className="w-[130px] bg-background/50">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Bias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Biases</SelectItem>
                            <SelectItem value="LONG">Long</SelectItem>
                            <SelectItem value="SHORT">Short</SelectItem>
                            <SelectItem value="NEUTRAL">Neutral</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={timeframe || 'ALL'} onValueChange={setTimeframe}>
                        <SelectTrigger className="w-[130px] bg-background/50">
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Timeframes</SelectItem>
                            <SelectItem value="1D">Daily</SelectItem>
                            <SelectItem value="4h">4 Hours</SelectItem>
                            <SelectItem value="1h">1 Hour</SelectItem>
                            <SelectItem value="15m">15 Mins</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="icon" onClick={() => refetch()} className="hover:bg-primary/10">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={onCreateIdea} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Publish Idea
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-[200px] w-full rounded-xl" />
                        </div>
                    ))}
                </div>
            ) : ideas && ideas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ideas.map((item: any) => (
                        <IdeaCard
                            key={item.idea.id}
                            idea={{
                                ...item.idea,
                                user: item.user,
                                like_count: item.like_count,
                                comment_count: item.comment_count
                            }}
                            onClick={() => onSelectIdea?.(item.idea.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card/20 rounded-2xl border border-dashed border-primary/20">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-primary/40" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No trading ideas found</h3>
                    <p className="text-muted-foreground max-w-xs">
                        Try adjusting your filters or be the first to share an analysis for this symbol.
                    </p>
                    <Button variant="link" onClick={onCreateIdea} className="mt-4">
                        Share your first idea
                    </Button>
                </div>
            )}
        </div>
    );
};
