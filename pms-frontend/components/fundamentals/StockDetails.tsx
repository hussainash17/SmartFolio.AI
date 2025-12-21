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

interface StockDetailsProps {
    symbol: string;
    data: any; // Using any for now to handle the mix of API and mock data
    onBack: () => void;
}

export function StockDetails({ symbol, data, onBack }: StockDetailsProps) {
    // Mock data for demonstration where API data is missing
    const mockData = {
        category: "Mainboard (A)",
        valuationLabel: "Slightly Undervalued",
        industryPe: 18.4,
        interestCoverage: 12.5,
        cashPosition: 450.5,
        operatingCashFlow: 125.8,
        healthScore: 85,
        quarterlyEps: [
            { quarter: 'Q1 22', eps: 4.5, isPositive: true },
            { quarter: 'Q2 22', eps: 4.8, isPositive: true },
            { quarter: 'Q3 22', eps: 4.2, isPositive: true },
            { quarter: 'Q4 22', eps: 4.6, isPositive: true },
            { quarter: 'Q1 23', eps: 5.1, isPositive: true },
            { quarter: 'Q2 23', eps: 5.5, isPositive: true },
            { quarter: 'Q3 23', eps: 5.8, isPositive: true },
            { quarter: 'Q4 23', eps: 6.1, isPositive: true },
        ],
        navTrend: [
            { year: '2019', nav: 158.0 },
            { year: '2020', nav: 175.0 },
            { year: '2021', nav: 205.0 },
            { year: '2022', nav: 230.0 },
            { year: '2023', nav: 265.0 },
        ],
        dividendHistory: [
            { year: '2019', amount: 4.0 },
            { year: '2020', amount: 4.5 },
            { year: '2021', amount: 5.0 },
            { year: '2022', amount: 5.5 },
            { year: '2023', amount: 6.0 },
        ],
        payoutRatio: 45.2,
        industryYield: 2.8,
        foreignParticipation: 15.4,
        promoterPledge: 0.0,
        shareholding: [
            { name: 'Sponsor', value: 45, color: '#22c55e' },
            { name: 'Public', value: 35, color: '#3b82f6' },
            { name: 'Institution', value: 20, color: '#ef4444' },
        ],
        risks: [
            { label: "Low Debt", status: 'good' as const, description: "The company maintains a very healthy debt-to-equity ratio, reducing financial risk." },
            { label: "Consistent Growth", status: 'good' as const, description: "Revenue and EPS have shown steady growth over the last 5 years." },
            { label: "Dividend Cut Risk", status: 'warning' as const, description: "Payout ratio is slightly higher than historical average, though still sustainable." },
            { label: "Market Volatility", status: 'warning' as const, description: "Stock price shows higher sensitivity to overall market movements." },
        ],
        peers: [
            { symbol: 'SQUAREPHARMA', price: 238.5, pe: 14.5, pb: 2.8, divYield: 3.5, roe: 18.4 },
            { symbol: 'BEXIMCO', price: 195.0, pe: 18.2, pb: 3.1, divYield: 1.8, roe: 12.5 },
            { symbol: 'RENATA', price: 110.0, pe: 22.5, pb: 3.5, divYield: 1.2, roe: 15.8 },
            { symbol: 'ACI', price: 85.0, pe: 15.8, pb: 2.2, divYield: 2.0, roe: 10.5 },
        ]
    };

    // Merge API data with mock data
    const mergedData = {
        ...mockData,
        ...data,
        // Ensure specific fields from API are used if available
        currentPrice: data?.currentPrice || 238.5,
        priceChange: data?.priceChange || 2.5,
        priceChangePercent: data?.priceChangePercent || 1.25,
        pe: data?.pe || 14.5,
        pb: data?.pb || 2.8,
        dividendYield: data?.dividendYield || 3.5,
        roe: data?.roe || 18.4,
        debtToEquity: data?.debtToEquity || 0.25,
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
