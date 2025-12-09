import { useQuery } from '@tanstack/react-query';
import { MarketService } from '../src/client';
import { queryKeys } from './queryKeys';

export interface Mover {
  symbol: string;
  company_name?: string;
  last: number;
  change: number;
  change_percent: number;
  volume?: number;
}

export interface TopMoversData {
  gainers: Mover[];
  losers: Mover[];
}

interface UseTopMoversOptions {
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook for fetching top market movers (gainers and losers)
 */
export function useTopMovers(options: UseTopMoversOptions = {}) {
  const { limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.topMovers,
    enabled,
    queryFn: async (): Promise<TopMoversData> => {
      const data = await MarketService.getTopMovers({ limit });
      return {
        gainers: (data.gainers || []).map((item: any) => ({
          symbol: item.symbol,
          company_name: item.company_name,
          last: Number(item.last || 0),
          change: Number(item.change || 0),
          change_percent: Number(item.change_percent || 0),
          volume: item.volume,
        })),
        losers: (data.losers || []).map((item: any) => ({
          symbol: item.symbol,
          company_name: item.company_name,
          last: Number(item.last || 0),
          change: Number(item.change || 0),
          change_percent: Number(item.change_percent || 0),
          volume: item.volume,
        })),
      };
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for fetching most active stocks by volume
 */
export function useMostActive(options: UseTopMoversOptions = {}) {
  const { limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.mostActive,
    enabled,
    queryFn: async (): Promise<Mover[]> => {
      const data = await MarketService.getMostActive({ limit });
      return (data || []).map((item: any) => ({
        symbol: item.symbol,
        company_name: item.company_name,
        last: Number(item.last || 0),
        change: Number(item.change || 0),
        change_percent: Number(item.change_percent || 0),
        volume: item.volume,
      }));
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}
