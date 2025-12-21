import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IdeasService, OpenAPI, TradingIdeaPublic } from '../src/client';
import { queryKeys } from './queryKeys';
import { toast } from 'sonner';

export function useTradingIdeas(params: {
    symbol?: string;
    bias?: string;
    timeframe?: string;
    userId?: string;
    followingOnly?: boolean;
    limit?: number;
    offset?: number;
} = {}) {
    const queryClient = useQueryClient();

    // Fetch ideas list
    const {
        data: ideas,
        isLoading,
        error,
        refetch
    } = useQuery<Array<{
        idea: TradingIdeaPublic;
        user?: { full_name: string; email: string };
        like_count: number;
        comment_count: number;
    }>>({
        queryKey: queryKeys.tradingIdeas(params),
        enabled: !!(OpenAPI as any).TOKEN,
        queryFn: async () => {
            return await IdeasService.listIdeas(params as any) as any;
        },
    });

    // Create idea mutation
    const createIdea = useMutation({
        mutationFn: async (data: any) => {
            return await IdeasService.createIdea({ requestBody: data });
        },
        onSuccess: () => {
            toast.success('Trading idea published successfully!');
            queryClient.invalidateQueries({ queryKey: ['ideas'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to publish idea');
        }
    });

    return {
        ideas,
        isLoading,
        error,
        refetch,
        createIdea
    };
}

export function useTradingIdeaDetail(id: string) {
    const queryClient = useQueryClient();

    const {
        data: idea,
        isLoading,
        error
    } = useQuery<{
        idea: TradingIdeaPublic;
        user?: { full_name: string; email: string };
        like_count: number;
        comment_count: number;
        is_liked?: boolean;
    }>({
        queryKey: queryKeys.tradingIdea(id),
        enabled: !!(OpenAPI as any).TOKEN && !!id,
        queryFn: async () => {
            return await IdeasService.getIdea({ id }) as any;
        },
    });

    const updateIdea = useMutation({
        mutationFn: async (data: any) => {
            return await IdeasService.updateIdea({ id, requestBody: data });
        },
        onSuccess: () => {
            toast.success('Trading idea updated!');
            queryClient.invalidateQueries({ queryKey: queryKeys.tradingIdea(id) });
            queryClient.invalidateQueries({ queryKey: ['ideas'] });
        }
    });

    const deleteIdea = useMutation({
        mutationFn: async () => {
            return await IdeasService.deleteIdea({ id });
        },
        onSuccess: () => {
            toast.success('Trading idea deleted');
            queryClient.invalidateQueries({ queryKey: ['ideas'] });
        }
    });

    return {
        idea,
        isLoading,
        error,
        updateIdea,
        deleteIdea
    };
}
