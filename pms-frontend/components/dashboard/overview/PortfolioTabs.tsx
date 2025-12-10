import React, { useMemo } from 'react';
import { LineChart, PieChart, Activity, List, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import PerformanceChart from './PerformanceChart';
import HoldingsSnapshot, { HoldingItem } from './HoldingsSnapshot';
import Allocation from './Allocation';
import RecentActivity from './RecentActivity';
import { Transaction } from '../../../types/trading';
import { useUserAllocation, useUserHoldings } from '../../../hooks/useAnalytics';

interface PortfolioTabsProps {
    portfolioId?: string;
    transactions?: Transaction[];
    allocationData?: any[];
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#22c55e', '#eab308', '#06b6d4'];

const PortfolioTabs: React.FC<PortfolioTabsProps> = ({ portfolioId, transactions, allocationData }) => {

    // Fetch aggregated allocation if no portfolio selected
    const { data: userAllocation, isLoading: isAllocationLoading } = useUserAllocation();

    // Fetch aggregated holdings if no portfolio selected
    const { data: userHoldings, isLoading: isHoldingsLoading } = useUserHoldings();

    // Prepare allocation data for the chart
    const effectiveAllocationData = useMemo(() => {
        if (portfolioId && allocationData) return allocationData;

        if (userAllocation?.sector_wise_allocation) {
            return userAllocation.sector_wise_allocation.map((s: any, idx: number) => ({
                name: s.sector,
                allocation_percent: Number(s.allocation_percent || 0),
                allocation_value: Number(s.value || 0),
                color: PALETTE[idx % PALETTE.length]
            }));
        }

        return [];
    }, [portfolioId, allocationData, userAllocation]);
    console.log(effectiveAllocationData);

    return (
        <Card className="min-h-[420px] flex flex-col">
            <CardContent className="p-6 flex flex-col">
                <Tabs defaultValue="performance" className="flex flex-col">
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

                    <div className="mt-2">
                        <TabsContent value="performance" className="m-0">
                            <PerformanceChart portfolioId={portfolioId} />
                        </TabsContent>
                        <TabsContent value="holdings" className="m-0">
                            {isHoldingsLoading && !portfolioId ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <HoldingsSnapshot portfolioId={portfolioId} holdings={!portfolioId ? userHoldings : undefined} />
                            )}
                        </TabsContent>
                        <TabsContent value="allocation" className="m-0">
                            {isAllocationLoading && !portfolioId ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <Allocation data={effectiveAllocationData} />
                            )}
                        </TabsContent>
                        <TabsContent value="activity" className="m-0">
                            <RecentActivity transactions={transactions} />
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default PortfolioTabs;
