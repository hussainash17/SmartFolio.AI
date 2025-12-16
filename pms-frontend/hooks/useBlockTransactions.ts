import { useQuery } from '@tanstack/react-query';

// Block Transaction type from stocknow API
export interface BlockTransaction {
    id: number;
    code: string;
    maxPrice: number;
    minPrice: number;
    trades: number;
    volume: number;
    value: number; // in Crore
    date: string;
}

// API call to stocknow.com.bd for block transactions
async function fetchBlockTransactions(): Promise<BlockTransaction[]> {
    const response = await fetch('https://stocknow.com.bd/api/v1/news/block-transactions', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Block transactions API call failed: ${response.statusText}`);
    }

    return await response.json();
}

// Hook for block transactions
export function useBlockTransactions() {
    return useQuery({
        queryKey: ['external', 'block-transactions'],
        staleTime: 5 * 60 * 1000, // 5 minutes
        queryFn: fetchBlockTransactions,
    });
}
