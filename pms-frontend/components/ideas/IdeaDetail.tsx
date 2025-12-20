import React from 'react';
import { useTradingIdeaDetail } from '../../hooks/useTradingIdeas';
import { useSocial, useUserProfile } from '../../hooks/useSocial';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader } from '../ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Clock, Eye, Calendar, UserPlus, Share2, ThumbsUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { TradingViewChart } from '../TradingViewChart';
import { CommentSection } from './CommentSection';
import { Skeleton } from '../ui/skeleton';

interface IdeaDetailProps {
    ideaId: string;
    onBack: () => void;
}

export const IdeaDetail: React.FC<IdeaDetailProps> = ({ ideaId, onBack }) => {
    const { user: currentUser } = useAuth();
    const { idea, isLoading, error } = useTradingIdeaDetail(ideaId);
    const { toggleLike, followUser, unfollowUser } = useSocial(ideaId);
    const ideaData = idea?.idea;
    const userData = idea?.user;

    // Fetch user profile stats
    const { data: userProfile } = useUserProfile(ideaData?.user_id || '');

    // Check if viewing own idea
    const isOwnIdea = currentUser?.id === ideaData?.user_id;

    const handleFollowToggle = async () => {
        if (!ideaData?.user_id) return;

        if ((userProfile as any)?.stats?.is_following) {
            await unfollowUser.mutateAsync(ideaData.user_id);
        } else {
            await followUser.mutateAsync(ideaData.user_id);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-12 w-3/4" />
                <div className="flex gap-4">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-[500px] w-full rounded-2xl" />
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        );
    }

    if (error || !idea) {
        return (
            <div className="text-center py-20">
                <h3 className="text-xl font-semibold">Failed to load trading idea</h3>
                <Button onClick={onBack} variant="link">Go back to feed</Button>
            </div>
        );
    }


    const getBiasIcon = (bias: string) => {
        switch (bias) {
            case 'LONG': return <TrendingUp className="w-5 h-5 text-green-500" />;
            case 'SHORT': return <TrendingDown className="w-5 h-5 text-red-500" />;
            default: return <Minus className="w-5 h-5 text-muted-foreground" />;
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
        <div className="space-y-8 pb-8">
            <Button variant="ghost" onClick={onBack} className="hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Content and Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold leading-tight tracking-tight">
                            {ideaData.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-3">
                            <Badge className={cn("flex items-center gap-2 px-3 py-1", getBiasColor(ideaData.bias || ''))}>
                                {getBiasIcon(ideaData.bias || '')}
                                <span className="text-xs font-bold tracking-wider uppercase">{ideaData.bias}</span>
                            </Badge>
                            {ideaData.timeframe && (
                                <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {ideaData.timeframe}
                                </Badge>
                            )}
                            <div className="flex gap-1">
                                {ideaData.symbols.map((symbol: string) => (
                                    <Badge key={symbol} variant="outline" className="px-2 py-1">
                                        {symbol}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-primary/10 bg-card shadow-2xl shadow-primary/5 w-full" style={{ height: '600px' }}>
                        <div className="w-full h-full">
                            <TradingViewChart
                                symbol={ideaData.symbols[0] || ''}
                                interval={ideaData.timeframe || '1D'}
                                theme="dark"
                                initialChartState={ideaData.chart_state}
                                autosize={true}
                            />
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none bg-card/30 p-8 rounded-2xl border border-primary/5">
                        <p className="text-lg text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {ideaData.content}
                        </p>
                    </div>

                    <CommentSection ideaId={ideaId} />
                </div>

                {/* Right Column: Author and Stats */}
                <div className="space-y-6">
                    <Card className="bg-card/50 backdrop-blur-md border-primary/10 sticky top-24">
                        <CardHeader className="p-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <Avatar className="w-20 h-20 border-2 border-primary/20 p-1">
                                    <AvatarImage src={`https://avatar.vercel.sh/${ideaData.user_id}`} />
                                    <AvatarFallback>{userData?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar >
                                <div>
                                    <h3 className="text-xl font-bold">{userData?.full_name || 'Anonymous User'}</h3>
                                    <p className="text-sm text-muted-foreground">Market Analyst</p>
                                </div>
                                {!isOwnIdea && (
                                    <Button
                                        onClick={handleFollowToggle}
                                        disabled={followUser.isPending || unfollowUser.isPending}
                                        variant={(userProfile as any)?.stats?.is_following ? "outline" : "default"}
                                        className={`w-full ${!(userProfile as any)?.stats?.is_following ? 'bg-primary hover:bg-primary/90' : ''}`}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        {(userProfile as any)?.stats?.is_following ? 'Following' : 'Follow Analyst'}
                                    </Button>
                                )}
                            </div >
                        </CardHeader >
                        <Separator className="bg-primary/5" />
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="space-y-1">
                                    <div className="text-xl font-bold">{(userProfile as any)?.stats?.total_ideas || 0}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ideas</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xl font-bold">{(userProfile as any)?.stats?.followers_count || 0}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Followers</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xl font-bold">{(userProfile as any)?.stats?.total_likes || 0}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Likes</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="w-4 h-4" />
                                        Published
                                    </div>
                                    <span className="font-medium">{format(new Date(ideaData.created_at), 'MMM dd, yyyy')}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Eye className="w-4 h-4" />
                                        Views
                                    </div>
                                    <span className="font-medium">{idea.idea.view_count}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className={cn("flex-1 gap-2", idea.is_liked && "bg-primary/10 border-primary/30 text-primary")}
                                    onClick={() => toggleLike.mutate()}
                                >
                                    <ThumbsUp className={cn("w-4 h-4", idea.is_liked && "fill-current")} />
                                    {idea.like_count}
                                </Button>
                                <Button variant="outline" className="flex-1 gap-2">
                                    <Share2 className="w-4 h-4" />
                                    Share
                                </Button>
                            </div>
                        </CardContent>
                    </Card >
                </div >
            </div >
        </div >
    );
};
