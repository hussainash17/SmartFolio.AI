import { useQuery } from '@tanstack/react-query';
import { OrdersService, OpenAPI } from '../src/client';
import type { OrderPublic } from '../src/client';
import { queryKeys } from './queryKeys';

interface UseOrdersOptions {
    enabled?: boolean;
    portfolioId?: string;
    status?: string;
}

/**
 * Hook for fetching user orders
 */
export function useOrders(options: UseOrdersOptions = {}) {
    const { enabled = true, portfolioId, status } = options;

    return useQuery({
        queryKey: queryKeys.ordersList,
        enabled: enabled && !!(OpenAPI as any).TOKEN,
        queryFn: async (): Promise<OrderPublic[]> => {
            const data = await OrdersService.getUserOrders({
                portfolioId,
                status
            });
            return (data as any) || [];
        },
        staleTime: 30 * 1000, // 30 seconds
    });
}

