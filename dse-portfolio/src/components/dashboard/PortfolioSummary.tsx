import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import Card from '../Card';

const data = [
    { value: 180 }, { value: 182 }, { value: 185 }, { value: 188 }, { value: 192 },
    { value: 195 }, { value: 198 }, { value: 202 }, { value: 205 }, { value: 208 },
    { value: 212 }, { value: 215 }, { value: 218 }, { value: 222 }, { value: 225 },
    { value: 228 }, { value: 232 }, { value: 235 }, { value: 238 }, { value: 240 },
    { value: 242 }, { value: 245 }, { value: 248 }, { value: 250 }, { value: 247 },
    { value: 249 }, { value: 251 }, { value: 248 }, { value: 252 }, { value: 249 },
];

const PortfolioSummary: React.FC = () => {
    return (
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900 text-white border-none p-5">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Portfolio Value</p>
                    <div className="flex items-baseline gap-3 mt-1">
                        <h2 className="text-3xl font-bold">৳ 2,487,314</h2>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                            <ArrowUpRight size={12} />
                            +1.98%
                        </span>
                    </div>
                    <p className="text-emerald-100 text-xs mt-1">+৳ 48,297 Today</p>
                </div>
                <button className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                    <ArrowRight size={18} />
                </button>
            </div>

            <div className="h-16 mt-4 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#ffffff"
                            strokeWidth={2}
                            dot={false}
                            strokeOpacity={0.8}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default PortfolioSummary;
