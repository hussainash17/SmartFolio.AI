import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { MessageSquare, ThumbsUp, Eye, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TradingIdeaPublic } from '../../src/client';
import { cn } from '../../lib/utils';

interface IdeaCardProps {
    idea: TradingIdeaPublic & { user?: { full_name: string; email: string } };
    onClick?: () => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onClick }) => {
    const getBiasIcon = (bias: string) => {
        switch (bias) {
            case 'LONG': return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'SHORT': return <TrendingDown className="w-4 h-4 text-red-500" />;
            default: return <Minus className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getBiasColor = (bias: string) => {
        switch (bias) {
            case 'LONG': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'SHORT': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Card
            className="group hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden bg-card/50 backdrop-blur-sm"
            onClick={onClick}
        >
            <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 border border-primary/10">
                            <AvatarImage src={`https://avatar.vercel.sh/${idea.user_id}`} />
                            <AvatarFallback>{idea.user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                {idea.user?.full_name || 'Anonymous User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {idea.symbols.map(symbol => (
                            <Badge key={symbol} variant="outline" className="text-[10px] px-1.5 py-0">
                                {symbol}
                            </Badge>
                        ))}
                    </div>
                </div>
                <h3 className="text-lg font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {idea.title}
                </h3>
            </CardHeader>

            <CardContent className="p-4 pt-2">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {idea.content}
                </p>

                <div className="flex items-center gap-3">
                    <Badge className={cn("flex items-center gap-1.5 px-2 py-0.5", getBiasColor(idea.bias || ''))}>
                        {getBiasIcon(idea.bias || '')}
                        <span className="text-[10px] font-bold tracking-wider uppercase">{idea.bias}</span>
                    </Badge>
                    {idea.timeframe && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            {idea.timeframe}
                        </Badge>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-primary/5 mt-2 bg-primary/5">
                <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="text-xs font-medium">{idea.like_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-xs font-medium">{idea.comment_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-medium">{idea.view_count}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20">
                    <Share2 className="w-4 h-4" />
                </Button>
            </CardFooter>
        </Card>
    );
};
