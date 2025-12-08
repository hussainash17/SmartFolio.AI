import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

export interface PortfolioSparklinePoint {
    valuation_date: string;
    total_value: number;
}

export function usePortfolioSparkline() {
    return useQuery({
        // We'll add a new key to queryKeys or just use a string array for now if I can't edit queryKeys easily
        queryKey: ['portfolio', 'sparkline'],
        queryFn: async () => {
            const response = await fetch(
                `${(OpenAPI.BASE || '').replace(/\/$/, '')}/api/v1/portfolio/history/sparkline`,
                {
                    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch portfolio sparkline');
            }

            return (await response.json()) as PortfolioSparklinePoint[];
        },
        enabled: !!(OpenAPI as any).TOKEN,
    });
}
