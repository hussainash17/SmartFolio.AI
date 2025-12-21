import React, { useState } from 'react';
import { useSocial } from '../../hooks/useSocial';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Send } from 'lucide-react';

interface CommentSectionProps {
    ideaId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ ideaId }) => {
    const [newComment, setNewComment] = useState('');
    const { comments, commentsLoading, addComment } = useSocial(ideaId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        await addComment.mutateAsync(newComment);
        setNewComment('');
    };

    return (
        <div className="space-y-6 mt-8">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                Comments
                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {comments?.length || 0}
                </span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                    placeholder="Write your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[100px] bg-background/50 focus-visible:ring-primary/30"
                />
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={!newComment.trim() || addComment.isPending}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {addComment.isPending ? 'Posting...' : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Post Comment
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <div className="space-y-4">
                {commentsLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </div>
                    ))
                ) : comments && comments.length > 0 ? (
                    comments.map((item: any) => (
                        <div key={item.comment.id} className="flex gap-3 group">
                            <Avatar className="w-10 h-10 border border-primary/10">
                                <AvatarImage src={`https://avatar.vercel.sh/${item.comment.user_id}`} />
                                <AvatarFallback>{item.user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 p-4 rounded-2xl border border-primary/5 group-hover:border-primary/20 transition-all">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold">{item.user?.full_name || 'Anonymous'}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(item.comment.created_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {item.comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-primary/10">
                        No comments yet. Be the first to share your thoughts!
                    </div>
                )}
            </div>
        </div>
    );
};
