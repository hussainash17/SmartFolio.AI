/**
 * Generic API Hook
 * A reusable hook for making API calls with React Query
 */

import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';

/**
 * Generic hook for making API calls
 * @param path - API endpoint path
 * @param key - Query key for React Query
 * @param enabled - Whether the query should run (default: true)
 * @returns React Query result
 * 
 * @example
 * const { data, isLoading } = useApi('/api/v1/market/indices', queryKeys.indices);
 */
export function useApi<T>(path: string, key: any, enabled = true) {
    return useQuery({
        queryKey: key,
        enabled,
        queryFn: async () => {
            const base = (OpenAPI as any).BASE || '';
            const res = await fetch(`${String(base).replace(/\/$/, '')}${path}`, {
                headers: (OpenAPI as any).TOKEN ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN as string}` } : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });
            if (!res.ok) throw new Error(`Failed ${path}`);
            return (await res.json()) as T;
        },
        staleTime: 30 * 1000,
    });
}

