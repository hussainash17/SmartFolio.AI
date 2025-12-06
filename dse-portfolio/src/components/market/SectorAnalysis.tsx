import React from 'react';
import Card from '../Card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const adData = [
    { name: 'Pharma', up: 18, down: 4, unchanged: 2 },
    { name: 'Bank', up: 12, down: 15, unchanged: 5 },
    { name: 'Engg', up: 8, down: 12, unchanged: 3 },
    { name: 'Textile', up: 5, down: 25, unchanged: 4 },
    { name: 'Fuel', up: 10, down: 5, unchanged: 1 },
];

const turnoverData = [
    { name: 'Pharma', value: 145 },
    { name: 'Bank', value: 112 },
    { name: 'Textile', value: 89 },
    { name: 'Engg', value: 76 },
    { name: 'Fuel', value: 65 },
];

const SectorAnalysis: React.FC = () => {
    return (
        <Card title="Sector Dashboard" className="min-h-[400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Chart 1: Advances/Declines */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Top Sectors by Advances/Declines</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={adData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
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
                </div>

                {/* Chart 2: Turnover */}
                <div>
                    <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Top Sectors by Turnover (₹ Cr)</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={turnoverData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#1A73E8" radius={[0, 4, 4, 0]}>
                                    {turnoverData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fillOpacity={0.6 + (index * 0.1)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </Card>
    );
};

export default SectorAnalysis;
