import { useQuery } from '@tanstack/react-query';
import { OpenAPI } from '../src/client';
import { queryKeys } from './queryKeys';

// API call helper
async function fetchUpcomingEventsAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });

  if (!response.ok) {
    throw new Error(`Upcoming Events API call failed: ${response.statusText}`);
  }

  return await response.json();
}

// Types matching the backend API response
export interface UpcomingEvent {
  id: string;
  code: string;
  post_date: string;
  timestamp: number;
  date: string;
  time: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export interface UpcomingEventsResponse {
  data: UpcomingEvent[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Hook for fetching paginated upcoming events
export function useUpcomingEvents(
  page: number = 1,
  limit: number = 10,
  code?: string,
  event_type?: string,
  min_timestamp?: number,
  max_timestamp?: number,
  order_by: string = 'timestamp'
) {
  const queryKey = [
    ...queryKeys.upcomingEvents,
    { page, limit, code, event_type, min_timestamp, max_timestamp, order_by },
  ] as const;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    order_by,
  });

  if (code) queryParams.set('code', code);
  if (event_type) queryParams.set('event_type', event_type);
  if (min_timestamp !== undefined) queryParams.set('min_timestamp', String(min_timestamp));
  if (max_timestamp !== undefined) queryParams.set('max_timestamp', String(max_timestamp));

  return useQuery({
    queryKey,
    enabled: !!(OpenAPI as any).TOKEN,
    staleTime: 30 * 1000, // 30 seconds
    queryFn: () =>
      fetchUpcomingEventsAPI<UpcomingEventsResponse>(
        `/api/v1/upcoming-events/?${queryParams.toString()}`
      ),
  });
}

// Hook for fetching top N upcoming events (simplified)
export function useTopUpcomingEvents(limit: number = 10) {
  // Get current timestamp in seconds (Unix timestamp)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  return useUpcomingEvents(1, limit, undefined, undefined, currentTimestamp, undefined, 'timestamp');
}
