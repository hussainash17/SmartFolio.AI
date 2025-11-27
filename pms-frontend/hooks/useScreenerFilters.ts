import { useCallback, useMemo, useState } from 'react';
import { calculateActiveFilters, createDefaultFilters, type ScreenerFilters } from '../lib/screener-utils';

/**
 * Custom hook for managing stock screener filters
 */
export function useScreenerFilters() {
    const [filters, setFilters] = useState<ScreenerFilters>(() => createDefaultFilters());
    const [activeFilters, setActiveFilters] = useState(0);

    const updateFilter = useCallback(<K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value };
            setActiveFilters(calculateActiveFilters(next));
            return next;
        });
    }, []);

    const clearFilters = useCallback(() => {
        const reset = createDefaultFilters();
        setFilters(reset);
        setActiveFilters(0);
    }, []);

    return {
        filters,
        activeFilters,
        updateFilter,
        clearFilters,
    };
}
