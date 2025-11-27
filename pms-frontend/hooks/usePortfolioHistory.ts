import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

export interface PortfolioHistoryPoint {
    date: string;
    total_value: number;
}

export function usePortfolioHistory(portfolioId: string) {
    return useQuery({
        queryKey: queryKeys.portfolioHistory(portfolioId),
        queryFn: async () => {
            const response = await fetch(
                `${(OpenAPI.BASE || '').replace(/\/$/, '')}/api/v1/portfolios/${portfolioId}/history`,
                {
                    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
                    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch portfolio history');
            }

            return (await response.json()) as PortfolioHistoryPoint[];
        },
        enabled: !!portfolioId && !!(OpenAPI as any).TOKEN,
    });
}
