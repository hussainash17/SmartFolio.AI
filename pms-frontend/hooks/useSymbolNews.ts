import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  source?: string;
  url?: string;
  category?: string;
  published_at: string;
  symbols?: string[];
  tags?: string[];
}

interface UseSymbolNewsOptions {
  symbol: string;
  days?: number;
  limit?: number;
  enabled?: boolean;
}

async function fetchNewsAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const headers: Record<string, string> = {};
  
  if (OpenAPI.TOKEN) {
    headers['Authorization'] = `Bearer ${OpenAPI.TOKEN as unknown as string}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`News API call failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Hook for fetching news for a specific symbol
 */
export function useSymbolNews(options: UseSymbolNewsOptions) {
  const { symbol, days = 30, limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.symbolNews(symbol, days, limit),
    enabled: enabled && !!symbol && !!(OpenAPI as any).TOKEN,
    queryFn: async (): Promise<NewsItem[]> => {
      const params = new URLSearchParams({
        limit: String(limit),
      });

      const response = await fetchNewsAPI<{
        symbol?: string;
        stock_name?: string;
        total_articles?: number;
        articles?: any[];
      }>(`/api/v1/research/stock/${symbol}/news?${params.toString()}`);
      
      // Extract articles array from response
      const articles = response?.articles || [];
      
      return articles.map((item: any) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        content: item.content,
        source: item.source,
        url: item.source_url || item.url,
        category: item.category,
        published_at: item.published_at,
        symbols: item.symbols || [],
        tags: item.tags || [],
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
