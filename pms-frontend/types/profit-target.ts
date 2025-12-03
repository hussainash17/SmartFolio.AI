export interface ProfitTarget {
    price: number;
    percentage_gain: number;
    method?: string;
    confidence?: number;
    rationale?: string;
}

export interface TieredTarget {
    level: number;
    price: number;
    percentage_gain: number;
    suggested_action: string;
    probability: string;
}

export interface AlternativeMethod {
    method: string;
    price: number;
    percentage_gain: number;
    confidence: number;
}

export interface MarketContext {
    trend: string;
    volatility: string;
    sector_performance: string;
    recommended_strategy: string;
}

export interface ProfitTargetsData {
    primary: ProfitTarget;
    tiered_targets: TieredTarget[];
    alternative_methods: AlternativeMethod[];
    market_context: MarketContext;
    calculated_at: string;
    next_update: string;
}

export interface StockWithTargets {
    position_id: string;
    symbol: string;
    entry_price: number;
    current_price: number;
    quantity: number;
    profit_targets: ProfitTargetsData;
    calculated_at: string;
    next_update: string;
}
