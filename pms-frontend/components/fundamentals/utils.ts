// Utility functions for the Fundamentals page

export function calculateFundamentalScore(data: {
    pe?: number;
    dividendYield?: number;
    debtToEquity?: number;
    marketCap?: number;
    roe?: number;
    profitMargin?: number;
}): { score: number; breakdown: Array<{ category: string; score: number; maxScore: number; description: string }> } {
    let score = 0;
    const breakdown = [];

    // Valuation Score (30 points)
    let valuationScore = 0;
    if (data.pe) {
        if (data.pe > 0 && data.pe < 12) valuationScore = 30;
        else if (data.pe >= 12 && data.pe < 18) valuationScore = 25;
        else if (data.pe >= 18 && data.pe < 25) valuationScore = 15;
        else if (data.pe >= 25 && data.pe < 40) valuationScore = 8;
    }
    score += valuationScore;
    breakdown.push({
        category: 'Valuation (P/E)',
        score: valuationScore,
        maxScore: 30,
        description: data.pe ? `P/E ratio of ${data.pe.toFixed(2)} indicates ${valuationScore >= 25 ? 'good' : valuationScore >= 15 ? 'fair' : 'poor'} value` : 'No P/E data available'
    });

    // Dividend Score (20 points)
    let dividendScore = 0;
    if (data.dividendYield) {
        if (data.dividendYield > 5) dividendScore = 20;
        else if (data.dividendYield > 3) dividendScore = 15;
        else if (data.dividendYield > 1) dividendScore = 8;
        else if (data.dividendYield > 0) dividendScore = 3;
    }
    score += dividendScore;
    breakdown.push({
        category: 'Dividend Yield',
        score: dividendScore,
        maxScore: 20,
        description: data.dividendYield ? `${data.dividendYield.toFixed(2)}% yield - ${dividendScore >= 15 ? 'Excellent' : dividendScore >= 8 ? 'Good' : 'Fair'}` : 'No dividend data'
    });

    // Financial Health (25 points)
    let healthScore = 0;
    if (data.debtToEquity !== undefined) {
        if (data.debtToEquity < 0.3) healthScore = 25;
        else if (data.debtToEquity < 0.7) healthScore = 18;
        else if (data.debtToEquity < 1.5) healthScore = 10;
        else if (data.debtToEquity < 3) healthScore = 5;
    }
    score += healthScore;
    breakdown.push({
        category: 'Financial Health',
        score: healthScore,
        maxScore: 25,
        description: data.debtToEquity !== undefined ? `Debt/Equity of ${data.debtToEquity.toFixed(2)} shows ${healthScore >= 18 ? 'strong' : healthScore >= 10 ? 'moderate' : 'concerning'} leverage` : 'No debt data'
    });

    // Profitability (15 points)
    let profitScore = 0;
    if (data.roe) {
        if (data.roe > 20) profitScore = 15;
        else if (data.roe > 15) profitScore = 12;
        else if (data.roe > 10) profitScore = 8;
        else if (data.roe > 5) profitScore = 4;
    }
    score += profitScore;
    breakdown.push({
        category: 'Profitability (ROE)',
        score: profitScore,
        maxScore: 15,
        description: data.roe ? `ROE of ${data.roe.toFixed(2)}% indicates ${profitScore >= 12 ? 'excellent' : profitScore >= 8 ? 'good' : 'moderate'} returns` : 'No ROE data'
    });

    // Market Strength (10 points)
    let marketScore = 0;
    if (data.marketCap) {
        if (data.marketCap > 10000) marketScore = 10;
        else if (data.marketCap > 5000) marketScore = 8;
        else if (data.marketCap > 1000) marketScore = 5;
        else marketScore = 2;
    }
    score += marketScore;
    breakdown.push({
        category: 'Market Strength',
        score: marketScore,
        maxScore: 10,
        description: data.marketCap ? `Market cap of ${(data.marketCap / 1000).toFixed(2)}B` : 'No market cap data'
    });

    return {
        score: Math.min(100, Math.round(score)),
        breakdown
    };
}

export function generateInsights(data: {
    pe?: number;
    dividendYield?: number;
    debtToEquity?: number;
    roe?: number;
    eps?: number;
    epsGrowth?: number;
    score: number;
    sectorAvgPE?: number;
}): Array<{ type: 'strength' | 'concern' | 'note'; message: string }> {
    const insights = [];

    // Valuation insights
    if (data.pe && data.sectorAvgPE) {
        if (data.pe < data.sectorAvgPE * 0.8) {
            insights.push({
                type: 'strength',
                message: `Undervalued: P/E of ${data.pe.toFixed(2)} is ${((1 - data.pe / data.sectorAvgPE) * 100).toFixed(0)}% below sector average`
            });
        } else if (data.pe > data.sectorAvgPE * 1.3) {
            insights.push({
                type: 'concern',
                message: `Trading at premium: P/E is ${((data.pe / data.sectorAvgPE - 1) * 100).toFixed(0)}% above sector average`
            });
        }
    }

    // Dividend insights
    if (data.dividendYield) {
        if (data.dividendYield > 5) {
            insights.push({
                type: 'strength',
                message: `Strong dividend payer with ${data.dividendYield.toFixed(2)}% yield - attractive for income investors`
            });
        } else if (data.dividendYield < 1 && data.epsGrowth && data.epsGrowth > 15) {
            insights.push({
                type: 'note',
                message: `Low dividend but strong growth suggests company is reinvesting profits`
            });
        }
    }

    // Debt insights
    if (data.debtToEquity !== undefined) {
        if (data.debtToEquity < 0.3) {
            insights.push({
                type: 'strength',
                message: `Excellent financial health with debt-to-equity ratio of ${data.debtToEquity.toFixed(2)}`
            });
        } else if (data.debtToEquity > 2) {
            insights.push({
                type: 'concern',
                message: `High debt burden with debt-to-equity of ${data.debtToEquity.toFixed(2)} may pose risks`
            });
        }
    }

    // Profitability insights
    if (data.roe) {
        if (data.roe > 20) {
            insights.push({
                type: 'strength',
                message: `Exceptional ROE of ${data.roe.toFixed(2)}% demonstrates strong capital efficiency`
            });
        } else if (data.roe < 5) {
            insights.push({
                type: 'concern',
                message: `Low ROE of ${data.roe.toFixed(2)}% suggests weak profitability`
            });
        }
    }

    // Growth insights
    if (data.epsGrowth) {
        if (data.epsGrowth > 20) {
            insights.push({
                type: 'strength',
                message: `Strong earnings growth of ${data.epsGrowth.toFixed(1)}% year-over-year`
            });
        } else if (data.epsGrowth < -10) {
            insights.push({
                type: 'concern',
                message: `Declining earnings with ${data.epsGrowth.toFixed(1)}% negative growth`
            });
        }
    }

    // Overall score insight
    if (data.score >= 70) {
        insights.push({
            type: 'note',
            message: `Strong fundamental score of ${data.score}/100 makes this a quality investment candidate`
        });
    } else if (data.score < 40) {
        insights.push({
            type: 'note',
            message: `Weak fundamental score of ${data.score}/100 suggests careful due diligence needed`
        });
    }

    return insights;
}

export function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Handle values that might contain commas
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value ?? '';
            }).join(',')
        )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function applyFilters<T extends Record<string, any>>(
    data: T[],
    filters: {
        sector?: string;
        minPE?: number;
        maxPE?: number;
        minDivYield?: number;
        maxDivYield?: number;
        minScore?: number;
        minMarketCap?: number;
        maxMarketCap?: number;
    }
): T[] {
    return data.filter(item => {
        if (filters.sector && item.sector !== filters.sector) return false;
        if (filters.minPE !== undefined && item.pe < filters.minPE) return false;
        if (filters.maxPE !== undefined && item.pe > filters.maxPE) return false;
        if (filters.minDivYield !== undefined && item.dividendYield < filters.minDivYield) return false;
        if (filters.maxDivYield !== undefined && item.dividendYield > filters.maxDivYield) return false;
        if (filters.minScore !== undefined && item.fundamentalScore < filters.minScore) return false;
        if (filters.minMarketCap !== undefined && item.marketCap < filters.minMarketCap) return false;
        if (filters.maxMarketCap !== undefined && item.marketCap > filters.maxMarketCap) return false;
        return true;
    });
}
