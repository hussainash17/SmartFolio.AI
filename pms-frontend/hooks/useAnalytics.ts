import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

const fetchFromApi = async (url: string) => {
    const response = await fetch(
        `${(OpenAPI.BASE || '').replace(/\/$/, '')}${url}`,
        {
            headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
            credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch from ${url}`);
    }

    return await response.json();
};

export function useUserAllocation() {
    return useQuery({
        queryKey: queryKeys.userAllocation,
        queryFn: () => fetchFromApi('/api/v1/analytics/user/allocation'),
        enabled: !!(OpenAPI as any).TOKEN,
    });
}

export function useUserHoldings() {
    return useQuery({
        queryKey: queryKeys.userHoldings,
        queryFn: () => fetchFromApi('/api/v1/analytics/user/holdings'),
        enabled: !!(OpenAPI as any).TOKEN,
    });
}

export function usePortfolioImpact() {
    return useQuery({
        queryKey: queryKeys.portfolioImpact,
        queryFn: () => fetchFromApi('/api/v1/analytics/portfolio/impact'),
        refetchInterval: 300000, // 5 minutes
        staleTime: 60000,
        enabled: !!(OpenAPI as any).TOKEN,
    });
}
