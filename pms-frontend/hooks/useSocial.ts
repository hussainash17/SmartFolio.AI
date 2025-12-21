import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IdeasService, OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';

export function useSocial(ideaId?: string) {
    const queryClient = useQueryClient();

    // Like mutation
    const toggleLike = useMutation({
        mutationFn: async () => {
            if (!ideaId) throw new Error('Idea ID is required');
            return await IdeasService.toggleLike({ id: ideaId });
        },
        onSuccess: () => {
            if (ideaId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.tradingIdea(ideaId) });
            }
        }
    });

    // Comments query
    const { data: comments, isLoading: commentsLoading } = useQuery({
        queryKey: queryKeys.ideaComments(ideaId || ''),
        enabled: !!(OpenAPI as any).TOKEN && !!ideaId,
        queryFn: async () => {
            return await IdeasService.getComments({ id: ideaId! });
        }
    });

    // Add comment mutation
    const addComment = useMutation({
        mutationFn: async (content: string) => {
            if (!ideaId) throw new Error('Idea ID is required');
            return await IdeasService.addComment({ id: ideaId, requestBody: { content } });
        },
        onSuccess: () => {
            if (ideaId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.ideaComments(ideaId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tradingIdea(ideaId) });
            }
            toast.success('Comment added');
        }
    });

    // Follow user mutation
    const followUser = useMutation({
        mutationFn: async (userId: string) => {
            return await IdeasService.followUser({ userId });
        },
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.userSocialProfile(userId) });
            toast.success('User followed');
        }
    });

    const unfollowUser = useMutation({
        mutationFn: async (userId: string) => {
            return await IdeasService.unfollowUser({ userId });
        },
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.userSocialProfile(userId) });
            toast.success('User unfollowed');
        }
    });

    // Follow symbol mutation
    const followSymbol = useMutation({
        mutationFn: async (symbol: string) => {
            return await IdeasService.followSymbol({ symbol });
        },
        onSuccess: (_, symbol) => {
            toast.success(`Following ${symbol}`);
        }
    });

    const unfollowSymbol = useMutation({
        mutationFn: async (symbol: string) => {
            return await IdeasService.unfollowSymbol({ symbol });
        },
        onSuccess: (_, symbol) => {
            toast.success(`Unfollowed ${symbol}`);
        }
    });

    return {
        toggleLike,
        comments,
        commentsLoading,
        addComment,
        followUser,
        unfollowUser,
        followSymbol,
        unfollowSymbol
    };
}

export function useUserProfile(userId: string) {
    return useQuery({
        queryKey: queryKeys.userSocialProfile(userId),
        enabled: !!(OpenAPI as any).TOKEN && !!userId,
        queryFn: async () => {
            return await IdeasService.getUserProfile({ userId });
        }
    });
}
