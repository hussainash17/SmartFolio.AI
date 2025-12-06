import React, { useState } from 'react';
import { LineChart, PieChart, Activity, List } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';
import PerformanceChart from './PerformanceChart';
import HoldingsSnapshot from './HoldingsSnapshot';
import Allocation from './Allocation';
import RecentActivity from './RecentActivity';

const PortfolioTabs: React.FC = () => {
    const [activeTab, setActiveTab] = useState('performance');

    const tabs = [
        { id: 'performance', label: 'Performance', icon: LineChart },
        { id: 'holdings', label: 'Holdings', icon: List },
        { id: 'allocation', label: 'Allocation', icon: PieChart },
        { id: 'activity', label: 'Activity', icon: Activity },
    ];

    return (
        <Card className="h-full min-h-[500px] flex flex-col">
            <div className="flex gap-1 mb-4 border-b border-gray-100 dark:border-gray-800 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                            activeTab === tab.id
                                ? "bg-primary/10 text-primary"
                                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 mt-2 overflow-y-auto custom-scrollbar pr-1">
                {activeTab === 'performance' && (
                    <div className="h-full">
                        <PerformanceChart />
                    </div>
                )}
                {activeTab === 'holdings' && (
                    <div className="h-full">
                        <HoldingsSnapshot />
                    </div>
                )}
                {activeTab === 'allocation' && (
                    <div className="h-full">
                        <Allocation />
                    </div>
                )}
                {activeTab === 'activity' && (
                    <div className="h-full">
                        <RecentActivity />
                    </div>
                )}
            </div>
        </Card>
    );
};

export default PortfolioTabs;
