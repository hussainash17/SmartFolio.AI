import { formatNumber } from './formatting-utils';

export interface SmartSignal {
    type: 'bullish' | 'bearish' | 'neutral';
    label: string;
    description: string;
    score: number; // -1 to 1
}

export interface FundamentalHealth {
    score: number; // 0 to 10
    profitability: 'high' | 'medium' | 'low';
    growth: 'high' | 'medium' | 'low';
    valuation: 'undervalued' | 'fair' | 'overvalued';
    health: 'strong' | 'stable' | 'weak';
}

export interface RiskMetrics {
    volatility: number;
    beta: number;
    riskScore: number; // 0 to 10 (10 is highest risk)
}

export interface SmartSummary {
    headline: string;
    details: string;
    sentiment: 'positive' | 'negative' | 'mixed';
}

/**
 * Generates a smart summary based on technical and fundamental data
 */
export function generateSmartSummary(
    symbol: string,
    price: number,
    changePercent: number,
    rsi: number = 50,
    ma50: number,
    ma200: number
): SmartSummary {
    const isUptrend = price > ma50;
    const isGoldenCross = ma50 > ma200;
    const isOverbought = rsi > 70;
    const isOversold = rsi < 30;

    let headline = '';
    let details = '';
    let sentiment: 'positive' | 'negative' | 'mixed' = 'mixed';

    if (isUptrend) {
        headline = `${symbol} is in an Uptrend`;
        sentiment = 'positive';
        if (isOverbought) {
            headline += ' but Overbought';
            details = 'Price is rising strongly but RSI indicates a potential pullback.';
            sentiment = 'mixed';
        } else {
            details = 'Price is consistently above the 50-day moving average.';
        }
    } else {
        headline = `${symbol} is in a Downtrend`;
        sentiment = 'negative';
        if (isOversold) {
            headline += ' but Oversold';
            details = 'Price has fallen significantly, RSI suggests a potential bounce.';
            sentiment = 'mixed';
        } else {
            details = 'Price is struggling below the 50-day moving average.';
        }
    }

    if (isGoldenCross) {
        details += ' A Golden Cross (50 MA > 200 MA) confirms long-term bullish momentum.';
        sentiment = 'positive';
    }

    return { headline, details, sentiment };
}

/**
 * Generates technical signals based on mock logic (replace with real indicators later)
 */
export function getTechnicalSignals(
    price: number,
    rsi: number = 50,
    macd: number = 0
): SmartSignal[] {
    const signals: SmartSignal[] = [];

    // RSI Signal
    if (rsi > 70) {
        signals.push({
            type: 'bearish',
            label: 'RSI Overbought',
            description: 'RSI is above 70, suggesting the asset may be overvalued in the short term.',
            score: -0.5
        });
    } else if (rsi < 30) {
        signals.push({
            type: 'bullish',
            label: 'RSI Oversold',
            description: 'RSI is below 30, suggesting the asset may be undervalued in the short term.',
            score: 0.5
        });
    } else {
        signals.push({
            type: 'neutral',
            label: 'RSI Neutral',
            description: 'RSI is in normal range.',
            score: 0
        });
    }

    // MACD Signal (Mock)
    if (macd > 0) {
        signals.push({
            type: 'bullish',
            label: 'MACD Bullish',
            description: 'MACD line is above the signal line.',
            score: 0.5
        });
    } else {
        signals.push({
            type: 'bearish',
            label: 'MACD Bearish',
            description: 'MACD line is below the signal line.',
            score: -0.5
        });
    }

    return signals;
}

/**
 * Calculates a mock fundamental health score
 */
export function calculateFundamentalHealth(
    marketCap: number,
    peRatio: number,
    eps: number
): FundamentalHealth {
    // Mock logic
    let score = 5;

    // Adjust based on PE
    if (peRatio > 0 && peRatio < 15) score += 2;
    else if (peRatio > 30) score -= 1;

    // Adjust based on EPS
    if (eps > 0) score += 2;
    else score -= 2;

    // Cap score
    score = Math.max(0, Math.min(10, score));

    return {
        score,
        profitability: eps > 0 ? 'high' : 'low',
        growth: peRatio > 20 ? 'high' : 'medium',
        valuation: peRatio < 15 ? 'undervalued' : (peRatio > 25 ? 'overvalued' : 'fair'),
        health: score > 7 ? 'strong' : (score > 4 ? 'stable' : 'weak')
    };
}

/**
 * Calculates mock risk metrics
 */
export function calculateRiskMetrics(beta: number = 1.0, volatility: number = 15): RiskMetrics {
    let riskScore = 5;

    if (beta > 1.5 || volatility > 25) {
        riskScore = 8;
    } else if (beta < 0.8 && volatility < 10) {
        riskScore = 3;
    }

    return {
        volatility,
        beta,
        riskScore
    };
}
