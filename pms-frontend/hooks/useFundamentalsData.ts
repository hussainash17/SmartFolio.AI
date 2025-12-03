import { useQuery } from "@tanstack/react-query";
import { OpenAPI } from "../src/client";

interface FundamentalsStock {
    id: string;
    symbol: string;
    companyName: string;
    sector: string;
    totalOutstandingSecurities: number;
    marketCap: number;
    pe: number;
    dividendYield: number;
    roe: number;
    debtToEquity: number;
    eps: number;
    navPerShare: number;
    score: number;
}

interface UseFundamentalsDataOptions {
    searchQuery?: string;
    sector?: string;
    minPE?: number;
    maxPE?: number;
    minDivYield?: number;
    maxDivYield?: number;
    minScore?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    minROE?: number;
    maxROE?: number;
    minDebtEquity?: number;
    maxDebtEquity?: number;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
    enabled?: boolean;
}

/**
 * Hook for fetching fundamental metrics data with filtering and sorting.
 * Uses the /market/fundamentals endpoint specifically for the Fundamentals page.
 */
export function useFundamentalsData(options: UseFundamentalsDataOptions = {}) {
    const {
        searchQuery = '',
        sector,
        minPE,
        maxPE,
        minDivYield,
        maxDivYield,
        minScore,
        minMarketCap,
        maxMarketCap,
        minROE,
        maxROE,
        minDebtEquity,
        maxDebtEquity,
        sortBy = 'score',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
        enabled = true
    } = options;

    return useQuery({
        queryKey: ['market', 'fundamentals', {
            q: searchQuery,
            sector,
            minPE,
            maxPE,
            minDivYield,
            maxDivYield,
            minScore,
            minMarketCap,
            maxMarketCap,
            minROE,
            maxROE,
            minDebtEquity,
            maxDebtEquity,
            sortBy,
            sortOrder,
            limit,
            offset
        }],
        enabled: enabled && !!(OpenAPI as any).TOKEN,
        queryFn: async () => {
            const params = new URLSearchParams();
            
            if (searchQuery) params.append('q', searchQuery);
            if (sector) params.append('sector', sector);
            if (minPE !== undefined) params.append('min_pe', String(minPE));
            if (maxPE !== undefined) params.append('max_pe', String(maxPE));
            if (minDivYield !== undefined) params.append('min_dividend_yield', String(minDivYield));
            if (maxDivYield !== undefined) params.append('max_dividend_yield', String(maxDivYield));
            if (minScore !== undefined) params.append('min_score', String(minScore));
            if (minMarketCap !== undefined) params.append('min_market_cap', String(minMarketCap));
            if (maxMarketCap !== undefined) params.append('max_market_cap', String(maxMarketCap));
            if (minROE !== undefined) params.append('min_roe', String(minROE));
            if (maxROE !== undefined) params.append('max_roe', String(maxROE));
            if (minDebtEquity !== undefined) params.append('min_debt_equity', String(minDebtEquity));
            if (maxDebtEquity !== undefined) params.append('max_debt_equity', String(maxDebtEquity));
            if (sortBy) params.append('sort_by', sortBy);
            if (sortOrder) params.append('sort_order', sortOrder);
            params.append('limit', String(limit));
            params.append('offset', String(offset));

            const base = (OpenAPI.BASE || '').replace(/\/$/, '');
            const response = await fetch(`${base}/api/v1/market/fundamentals?${params.toString()}`, {
                headers: (OpenAPI as any).TOKEN 
                    ? { Authorization: `Bearer ${(OpenAPI as any).TOKEN}` }
                    : undefined,
                credentials: (OpenAPI as any).WITH_CREDENTIALS ? 'include' : 'omit',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch fundamentals data');
            }

            const data = await response.json();

            return (data as any[]).map((item: any) => ({
                id: String(item.id),
                symbol: String(item.symbol),
                companyName: String(item.company_name || item.symbol),
                sector: String(item.sector || "Unknown"),
                totalOutstandingSecurities: Number(item.total_outstanding_securities || 0),
                marketCap: Number(item.market_cap || 0),
                pe: Number(item.pe || 0),
                dividendYield: Number(item.dividend_yield || 0),
                roe: Number(item.roe || 0),
                debtToEquity: Number(item.debt_to_equity || item.debt_equity || 0),
                eps: Number(item.eps || 0),
                navPerShare: Number(item.nav || 0),
                score: Number(item.score || 0),
            })) as FundamentalsStock[];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes
    });
}

