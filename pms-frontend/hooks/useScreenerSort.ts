import { useState } from 'react';

/**
 * Custom hook for managing screener search and sorting state
 */
export function useScreenerSort() {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('marketCap');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    return {
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
    };
}
