# Hooks Documentation

This directory contains custom React hooks for the PMS Frontend application, organized by feature domain.

## Hook Categories

### Portfolio Management
- **`usePortfolios.ts`** - User's portfolio data and management
- **`useDashboardPortfolios.ts`** - Portfolio aggregation and calculations for dashboard

### Performance Analytics
- **`usePerformance.ts`** - Portfolio performance metrics (returns, risk, benchmarks)
- **`useDashboardContributions.ts`** - Attribution and contribution data

### Risk Management
- **`useRisk.ts`** - Risk metrics, alerts, and profiles
- **`useRebalancing.ts`** - Rebalancing recommendations and history

### Market Data
- **`useDashboardMarket.ts`** - Market indices, benchmarks, and sector data

### Dashboard
- **`useDashboardSummary.ts`** - Dashboard summary and investment goals

### Other
- **`useAuth.ts`** - Authentication and user session
- **`useTrading.ts`** - Trading operations
- **`useWatchlist.ts`** - Watchlist management
- **`useFundamentals.ts`** - Fundamental analysis data
- **`useInvestmentGoals.ts`** - Investment goals management
- **`queryKeys.ts`** - Centralized React Query key management

## Quick Start

### Using a Hook

```typescript
import { usePortfolios } from '../hooks/usePortfolios';

export function MyComponent() {
  const { portfolios, loading } = usePortfolios();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {portfolios.map(p => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}
```

### Creating a New Hook

1. **Follow the pattern**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

// API helper
async function fetchAPI<T>(endpoint: string): Promise<T> {
  const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN}` } : undefined,
    credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
  });
  
  if (!response.ok) throw new Error(`API failed: ${response.statusText}`);
  return await response.json();
}

// Hook
export function useMyData(id: string) {
  return useQuery({
    queryKey: queryKeys.myData(id),
    queryFn: () => fetchAPI<MyDataType>(`/api/v1/my-data/${id}`),
    enabled: !!id && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}
```

2. **Add query keys** to `queryKeys.ts`:
```typescript
export const queryKeys = {
  myData: (id: string) => ['my-data', id] as const,
};
```

3. **Export types** for TypeScript support:
```typescript
export interface MyDataType {
  id: string;
  name: string;
}
```

## Hook Patterns

### Query Hook Pattern
```typescript
export function useData(id: string) {
  return useQuery({
    queryKey: queryKeys.data(id),
    queryFn: () => fetchAPI<DataType>(`/api/v1/data/${id}`),
    enabled: !!id && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Mutation Hook Pattern
```typescript
export function useUpdateData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UpdatePayload) => 
      fetchAPI<DataType>(`/api/v1/data`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data });
    },
  });
}
```

### Aggregation Hook Pattern
```typescript
export function useAggregatedData(items: Item[]) {
  return useMemo(() => {
    return items.reduce((acc, item) => {
      // Aggregation logic
      return acc;
    }, initialValue);
  }, [items]);
}
```

## Best Practices

### 1. **Query Keys**
- Always use `queryKeys` from `queryKeys.ts`
- Keep keys consistent and hierarchical
- Include all parameters that affect the query

```typescript
// Good
queryKey: queryKeys.portfolio(portfolioId, period)

// Bad
queryKey: ['portfolio', portfolioId]
```

### 2. **Error Handling**
- Provide default values
- Log errors for debugging
- Use `retry` option appropriately

```typescript
export function useData(id: string) {
  return useQuery({
    queryKey: queryKeys.data(id),
    queryFn: () => fetchAPI<DataType>(`/api/v1/data/${id}`),
    enabled: !!id && !!(OpenAPI as any).TOKEN,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false; // Don't retry 404s
      return failureCount < 2;
    },
  });
}
```

### 3. **Memoization**
- Use `useMemo` for expensive calculations
- Include all dependencies
- Avoid creating objects/arrays in dependencies

```typescript
// Good
const result = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);

// Bad
const result = useMemo(() => {
  return data.filter(item => item.active);
}, []); // Missing dependency
```

### 4. **Type Safety**
- Export response types
- Use generics for reusable hooks
- Provide proper TypeScript interfaces

```typescript
export interface PortfolioData {
  id: string;
  name: string;
  value: number;
}

export function usePortfolio(id: string) {
  return useQuery<PortfolioData>({
    queryKey: queryKeys.portfolio(id),
    queryFn: () => fetchAPI<PortfolioData>(`/api/v1/portfolios/${id}`),
  });
}
```

### 5. **Performance**
- Set appropriate `staleTime` values
- Use `refetchInterval` for real-time data
- Avoid unnecessary re-renders with proper dependencies

```typescript
// Real-time data
export function useMarketPrice(symbol: string) {
  return useQuery({
    queryKey: queryKeys.marketPrice(symbol),
    queryFn: () => fetchAPI<PriceData>(`/api/v1/prices/${symbol}`),
    staleTime: 30 * 1000,        // 30 seconds
    refetchInterval: 30 * 1000,   // Auto-refresh
  });
}

// Stable data
export function useCompanyInfo(symbol: string) {
  return useQuery({
    queryKey: queryKeys.companyInfo(symbol),
    queryFn: () => fetchAPI<CompanyInfo>(`/api/v1/companies/${symbol}`),
    staleTime: 60 * 60 * 1000,    // 1 hour
  });
}
```

## Common Issues

### Issue: Hook not updating
**Solution**: Check query key dependencies and `enabled` condition
```typescript
// Make sure all parameters are in queryKey
queryKey: queryKeys.data(id, period, filter)
```

### Issue: Too many API calls
**Solution**: Increase `staleTime` or use `refetchInterval` instead of constant refetching
```typescript
// Instead of
refetchInterval: 1000, // Every second

// Use
staleTime: 60 * 1000,  // Cache for 1 minute
```

### Issue: Stale data
**Solution**: Invalidate queries after mutations
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.data });
}
```

## Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortfolios } from '../hooks/usePortfolios';

test('usePortfolios fetches data', async () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  const { result } = renderHook(() => usePortfolios(), { wrapper });
  
  await waitFor(() => {
    expect(result.current.portfolios).toBeDefined();
  });
});
```

## Contributing

When adding new hooks:
1. Follow the established patterns
2. Add proper TypeScript types
3. Update `queryKeys.ts`
4. Add JSDoc comments
5. Include error handling
6. Write tests
7. Update this README

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [React Hooks Documentation](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
