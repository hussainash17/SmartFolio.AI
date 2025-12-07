import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { useSectorAnalysisCharts } from '../../../hooks/useDashboardMarket';

const SectorAnalysis: React.FC = () => {
    const { data, isLoading, error } = useSectorAnalysisCharts();

    // Use API data or fallback to empty arrays
    const adData = data?.advances_declines || [];
    const turnoverData = data?.turnover || [];

    // Sort by total activity (up + down + unchanged) for advances/declines chart
    const sortedAdData = [...adData].sort((a, b) => {
        const totalA = a.up + a.down + a.unchanged;
        const totalB = b.up + b.down + b.unchanged;
        return totalB - totalA;
    }).slice(0, 10); // Top 10 sectors

    // Sort by turnover value (already sorted by API, but ensure top 10)
    // Sort by turnover value (already sorted by API, but ensure top 10)
    // And convert to Crores (Backend returns value / 10,000,000, but DB is in Millions, so we need to multiply by 1,000,000 to get Crores)
    // Example: DB = 10 (Million). Backend = 0.000001. Target = 1 (Crore). 0.000001 * 1,000,000 = 1.
    const sortedTurnoverData = [...turnoverData]
        .slice(0, 10)
        .map(item => ({
            ...item,
            value: item.value
        }));

    if (isLoading) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Sector Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64">
                        <p className="text-muted-foreground">Loading sector data...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle>Sector Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64">
                        <p className="text-destructive">Error loading sector data</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle>Sector Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Chart 1: Advances/Declines */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Top Sectors by Advances/Declines</h4>
                        {sortedAdData.length > 0 ? (
                            <>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={sortedAdData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} interval={0} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Bar dataKey="up" stackId="a" fill="#00A676" name="Advances" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="unchanged" stackId="a" fill="#9E9E9E" name="Unchanged" />
                                            <Bar dataKey="down" stackId="a" fill="#E53935" name="Declines" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#00A676] rounded-full"></div>Advances</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#9E9E9E] rounded-full"></div>Unchanged</div>
                                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#E53935] rounded-full"></div>Declines</div>
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex items-center justify-center">
                                <p className="text-muted-foreground">No data available</p>
                            </div>
                        )}
                    </div>

                    {/* Chart 2: Turnover */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Top Sectors by Turnover (Cr)</h4>
                        {sortedTurnoverData.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={sortedTurnoverData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} interval={0} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            formatter={(value: number) => [`${value} Cr`, 'Turnover']}
                                        />
                                        <Bar dataKey="value" fill="#1A73E8" radius={[0, 4, 4, 0]}>
                                            {sortedTurnoverData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fillOpacity={0.6 + (index * 0.1)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center">
                                <p className="text-muted-foreground">No data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SectorAnalysis;
