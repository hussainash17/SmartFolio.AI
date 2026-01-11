import { StockHero } from "./StockHero";
import { ValuationSection } from "./ValuationSection";
import { FinancialHealthSection } from "./FinancialHealthSection";
import { GrowthSection } from "./GrowthSection";
import { DividendSection } from "./DividendSection";
import { ShareholdingSection } from "./ShareholdingSection";
import { RiskSection } from "./RiskSection";
import { ProfitabilitySection } from "./ProfitabilitySection";
import { PeerComparisonSection } from "./PeerComparisonSection";
import { EducationSection } from "./EducationSection";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";

import { useComprehensiveStockDetails } from "../../hooks/useSymbolFundamentals";
import { Skeleton } from "../ui/skeleton";

interface StockDetailsProps {
    symbol: string;
    data: any; // Using any for now to handle the mix of API and mock data
    onBack: () => void;
}

export function StockDetails({ symbol, data, onBack }: StockDetailsProps) {
    const { data: apiData, isLoading } = useComprehensiveStockDetails({ symbol });

    if (isLoading) {
        return (
            <div className="w-full space-y-8 pb-12">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    // Use API data or fallback to defaults (to avoid crashes if API fails)
    const stockData = apiData ? {
        category: apiData.category || "N/A",
        valuationLabel: apiData.valuation_label || "Neutral",
        industryPe: Number(apiData.industry_pe || 0),
        interestCoverage: Number(apiData.interest_coverage || 0),
        cashPosition: Number(apiData.cash_position || 0),
        operatingCashFlow: Number(apiData.operating_cash_flow || 0),
        healthScore: apiData.health_score || 0,
        quarterlyEps: apiData.quarterly_eps || [],
        navTrend: apiData.nav_trend || [],
        dividendHistory: apiData.dividend_history || [],
        payoutRatio: Number(apiData.payout_ratio || 0),
        industryYield: Number(apiData.industry_yield || 0),
        foreignParticipation: Number(apiData.foreign_participation || 0),
        promoterPledge: Number(apiData.promoter_pledge || 0),
        shareholding: (apiData.shareholding || []).map(s => ({ ...s, value: Number(s.value) })),
        risks: (apiData.risks || []).map(r => ({ ...r, status: r.status === 'bad' ? 'danger' : r.status as 'good' | 'warning' | 'danger' })),
        peers: (apiData.peers || []).map(p => ({
            symbol: p.symbol,
            price: Number(p.price || 0),
            pe: Number(p.pe || 0),
            pb: Number(p.pb || 0),
            divYield: Number(p.div_yield || 0),
            roe: Number(p.roe || 0)
        })),
        currentPrice: Number(apiData.current_price || 0),
        priceChange: Number(apiData.price_change || 0),
        priceChangePercent: Number(apiData.price_change_percent || 0),
        pe: Number(apiData.pe || 0),
        pb: Number(apiData.pb || 0),
        dividendYield: Number(apiData.dividend_yield || 0),
        roe: Number(apiData.roe || 0),
        debtToEquity: Number(apiData.debt_to_equity || 0),
    } : {
        // Keep existing fallback values if apiData is null
        category: "Mainboard (A)",
        valuationLabel: "Slightly Undervalued",
        industryPe: 18.4,
        interestCoverage: 12.5,
        cashPosition: 450.5,
        operatingCashFlow: 125.8,
        healthScore: 85,
        quarterlyEps: [],
        navTrend: [],
        dividendHistory: [],
        payoutRatio: 45.2,
        industryYield: 2.8,
        foreignParticipation: 15.4,
        promoterPledge: 0.0,
        shareholding: [],
        risks: [],
        peers: [],
        currentPrice: 238.5,
        priceChange: 2.5,
        priceChangePercent: 1.25,
        pe: 14.5,
        pb: 2.8,
        dividendYield: 3.5,
        roe: 18.4,
        debtToEquity: 0.25,
    };

    const mergedData = {
        ...stockData,
        // Allow props data to override if absolutely necessary, but generally prefer API
    };

    return (
        <div className="w-full space-y-8 pb-12">
            <Button
                variant="ghost"
                onClick={onBack}
                className="hover:bg-primary/10 -ml-2"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Market Overview
            </Button>

            <StockHero
                symbol={symbol}
                companyName={data?.companyName || "Square Pharmaceuticals Ltd."}
                sector={data?.sector || "Pharmaceuticals"}
                category={mergedData.category}
                currentPrice={mergedData.currentPrice}
                priceChange={mergedData.priceChange}
                priceChangePercent={mergedData.priceChangePercent}
                healthScore={mergedData.healthScore}
                valuationLabel={mergedData.valuationLabel}
                dividendYield={mergedData.dividendYield}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ValuationSection
                        pe={mergedData.pe}
                        industryPe={mergedData.industryPe}
                        pb={mergedData.pb}
                        dividendYield={mergedData.dividendYield}
                        earningsYield={100 / mergedData.pe}
                        pegRatio={mergedData.pe / 15} // Mocked growth rate
                    />
                </div>
                <div className="lg:col-span-1">
                    <FinancialHealthSection
                        debtToEquity={mergedData.debtToEquity}
                        interestCoverage={mergedData.interestCoverage}
                        currentRatio={1.8} // Mocked
                        cashPosition={mergedData.cashPosition}
                        operatingCashFlow={mergedData.operatingCashFlow}
                        healthScore={mergedData.healthScore}
                    />
                </div>
                <div className="lg:col-span-1">
                    <ProfitabilitySection
                        roe={mergedData.roe}
                        roce={16.5} // Mocked
                        netMargin={22.4} // Mocked
                        grossMargin={45.8} // Mocked
                        assetTurnover={0.85} // Mocked
                    />
                </div>
            </div>

            <GrowthSection
                quarterlyEps={mergedData.quarterlyEps}
                navTrend={mergedData.navTrend}
                revenueGrowth={12.5}
                profitGrowth={15.2}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DividendSection
                    dividendHistory={mergedData.dividendHistory}
                    payoutRatio={mergedData.payoutRatio}
                    industryYield={mergedData.industryYield}
                    currentYield={mergedData.dividendYield}
                />
                <ShareholdingSection
                    data={mergedData.shareholding}
                    promoterPledge={mergedData.promoterPledge}
                    foreignParticipation={mergedData.foreignParticipation}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <PeerComparisonSection
                        peers={mergedData.peers}
                        currentSymbol={symbol}
                    />
                </div>
                <div className="lg:col-span-1">
                    <RiskSection factors={mergedData.risks} />
                </div>
            </div>

            <EducationSection />
        </div>
    );
}
