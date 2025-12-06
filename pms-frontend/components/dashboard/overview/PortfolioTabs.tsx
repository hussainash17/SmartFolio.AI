import React, { useState } from 'react';
import { LineChart, PieChart, Activity, List } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import PerformanceChart from './PerformanceChart';
import HoldingsSnapshot from './HoldingsSnapshot';
import Allocation from './Allocation';
import RecentActivity from './RecentActivity';
import { Transaction } from '../../../types/trading';

interface PortfolioTabsProps {
    portfolioId?: string;
    transactions?: Transaction[];
    allocationData?: any[];
}

const PortfolioTabs: React.FC<PortfolioTabsProps> = ({ portfolioId, transactions, allocationData }) => {
    return (
        <Card className="h-full min-h-[420px] flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
                <Tabs defaultValue="performance" className="flex-1 flex flex-col">
                    <TabsList className="w-full justify-start mb-4 bg-transparent border-b rounded-none h-auto p-0 space-x-6">
                        <TabsTrigger
                            value="performance"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 gap-2 text-muted-foreground data-[state=active]:text-primary"
                        >
                            <LineChart size={16} />
                            Performance
                        </TabsTrigger>
                        <TabsTrigger
                            value="holdings"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 gap-2 text-muted-foreground data-[state=active]:text-primary"
                        >
                            <List size={16} />
                            Holdings
                        </TabsTrigger>
                        <TabsTrigger
                            value="allocation"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 gap-2 text-muted-foreground data-[state=active]:text-primary"
                        >
                            <PieChart size={16} />
                            Allocation
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 gap-2 text-muted-foreground data-[state=active]:text-primary"
                        >
                            <Activity size={16} />
                            Activity
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-2">
                        <TabsContent value="performance" className="h-full m-0">
                            <PerformanceChart portfolioId={portfolioId} />
                        </TabsContent>
                        <TabsContent value="holdings" className="h-full m-0">
                            <HoldingsSnapshot portfolioId={portfolioId} />
                        </TabsContent>
                        <TabsContent value="allocation" className="h-full m-0">
                            <Allocation data={allocationData} />
                        </TabsContent>
                        <TabsContent value="activity" className="h-full m-0">
                            <RecentActivity transactions={transactions} />
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default PortfolioTabs;
