import React from 'react';
import { Briefcase } from "lucide-react";

// Portfolio Components
import PortfolioSummary from './dashboard/overview/PortfolioSummary';
import PortfolioImpact from './dashboard/overview/PortfolioImpact';
import PortfolioTabs from './dashboard/overview/PortfolioTabs';

// Market Components
import MarketSentiment from './dashboard/overview/MarketSentiment';
import IndexOverview from './dashboard/overview/IndexOverview';
import MarketBreadth from './dashboard/overview/MarketBreadth';
import MarketTurnover from './dashboard/overview/MarketTurnover';
import SectorAnalysis from './dashboard/overview/SectorAnalysis';
import MarketDeepDive from './dashboard/overview/MarketDeepDive';
import AnnouncementsList from './dashboard/overview/AnnouncementsList';

interface ComprehensiveDashboardProps {
    recentTransactions?: any[];
}

export function ComprehensiveDashboard({ recentTransactions }: ComprehensiveDashboardProps) {
    return (
        <div className="space-y-6 pb-8">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* LEFT PANE: PORTFOLIO (5 cols) */}
                <div className="xl:col-span-5 space-y-6">
                    {/* <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold">My Portfolio</h2>
                    </div> */}

                    <PortfolioSummary />
                    <PortfolioImpact />
                    <PortfolioTabs
                        transactions={recentTransactions}
                    />
                </div>

                {/* RIGHT PANE: MARKET (7 cols) */}
                <div className="xl:col-span-7 space-y-6">
                    {/* <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold">Market Overview</h2>
                    </div> */}

                    {/* Row 1: Sentiment & Indices */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-4">
                            <MarketSentiment score={2} />
                        </div>
                        <div className="md:col-span-8">
                            <IndexOverview />
                        </div>
                    </div>

                    {/* Row 2: Pulse (Breadth & Turnover) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MarketBreadth />
                        <MarketTurnover />
                    </div>

                    {/* Row 3: Sector Analysis */}
                    <SectorAnalysis />

                    {/* Row 4: Deep Dive Tabs */}
                    <MarketDeepDive />

                    {/* Row 5: Announcements */}
                    <AnnouncementsList />
                </div>
            </div>
        </div>
    );
}
