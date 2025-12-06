import React from 'react';
// Portfolio Components
import PortfolioSummary from '../components/dashboard/PortfolioSummary';
import PortfolioTabs from '../components/dashboard/PortfolioTabs';
import PortfolioImpact from '../components/dashboard/PortfolioImpact';

// Market Components
import MarketSentiment from '../components/market/MarketSentiment';
import IndexOverview from '../components/market/IndexOverview';
import MarketBreadth from '../components/market/MarketBreadth';
import MarketTurnover from '../components/market/MarketTurnover';
import SectorAnalysis from '../components/market/SectorAnalysis';
import MarketDeepDive from '../components/market/MarketDeepDive';
import AnnouncementsList from '../components/market/AnnouncementsList';

const Overview: React.FC = () => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-8">

            {/* LEFT PANE: PORTFOLIO (5 cols) */}
            <div className="xl:col-span-5 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">My Portfolio</h2>
                    <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">Last Updated: 12:30 PM</span>
                </div>

                <PortfolioSummary />
                <PortfolioImpact />
                <PortfolioTabs />
            </div>

            {/* RIGHT PANE: MARKET (7 cols) */}
            <div className="xl:col-span-7 space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Market Overview</h2>
                    <div className="flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-medium text-green-500">Market Open</span>
                    </div>
                </div>

                {/* Row 1: Sentiment & Indices */}
                <div className="space-y-4">
                    <MarketSentiment score={2} />
                    <IndexOverview />
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
    );
};

export default Overview;
