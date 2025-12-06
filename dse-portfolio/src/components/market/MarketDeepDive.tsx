import React, { useState } from 'react';
import { ArrowUp, Activity, Zap, Globe } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';
import MarketMovers from '../dashboard/MarketMovers';

const BlockTrades = () => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <tr>
                    <th className="pb-2 font-medium">Ticker</th>
                    <th className="pb-2 font-medium text-right">Vol</th>
                    <th className="pb-2 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Value</th>
                    <th className="pb-2 font-medium text-right">Time</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                    { ticker: 'GP', vol: '50k', price: 286.5, val: '1.43Cr', time: '12:30' },
                    { ticker: 'BATBC', vol: '20k', price: 518.7, val: '1.03Cr', time: '12:28' },
                    { ticker: 'SQURPHARMA', vol: '35k', price: 215.0, val: '0.75Cr', time: '12:15' },
                    { ticker: 'BEXIMCO', vol: '100k', price: 115.6, val: '1.15Cr', time: '11:45' },
                ].map((trade, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-2 font-medium">{trade.ticker}</td>
                        <td className="py-2 text-right">{trade.vol}</td>
                        <td className="py-2 text-right">{trade.price}</td>
                        <td className="py-2 text-right">{trade.val}</td>
                        <td className="py-2 text-right text-gray-500">{trade.time}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const CircuitBreakers = () => (
    <div className="space-y-4">
        <div>
            <h4 className="text-xs font-semibold text-positive uppercase mb-2">Upper Circuit (Top 3)</h4>
            <div className="space-y-2">
                {['ZEALBANGLA', 'MEGHNALIFE', 'FINEFOODS'].map(t => (
                    <div key={t} className="flex justify-between items-center bg-green-50 dark:bg-green-900/10 p-2 rounded">
                        <span className="font-medium text-sm">{t}</span>
                        <span className="text-positive text-sm font-bold">+10.0%</span>
                    </div>
                ))}
            </div>
        </div>
        <div>
            <h4 className="text-xs font-semibold text-negative uppercase mb-2">Lower Circuit (Top 3)</h4>
            <div className="space-y-2">
                {['BEACONPHAR', 'ORIONINFU', 'BSC'].map(t => (
                    <div key={t} className="flex justify-between items-center bg-red-50 dark:bg-red-900/10 p-2 rounded">
                        <span className="font-medium text-sm">{t}</span>
                        <span className="text-negative text-sm font-bold">-10.0%</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ForeignActivity = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div>
                <p className="text-sm text-gray-500">Net Buy/Sell (Today)</p>
                <p className="text-xl font-bold text-positive">+৳ 12.5 Cr</p>
            </div>
            <Globe className="text-gray-300" size={32} />
        </div>
        <div>
            <p className="text-xs font-medium mb-2">Top Foreign Interest</p>
            <div className="flex flex-wrap gap-2">
                {['SQURPHARMA', 'BRACBANK', 'OLYMPIC', 'RENATA'].map(t => (
                    <span key={t} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium">{t}</span>
                ))}
            </div>
        </div>
    </div>
);

const MarketDeepDive: React.FC = () => {
    const [activeTab, setActiveTab] = useState('movers');

    const tabs = [
        { id: 'movers', label: 'Top Movers', icon: Activity },
        { id: 'block', label: 'Block Trades', icon: Zap },
        { id: 'circuit', label: 'Circuits', icon: ArrowUp },
        { id: 'foreign', label: 'Foreign', icon: Globe },
    ];

    return (
        <Card className="h-full min-h-[400px]">
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

            <div className="mt-2">
                {activeTab === 'movers' && <MarketMovers />}
                {activeTab === 'block' && <BlockTrades />}
                {activeTab === 'circuit' && <CircuitBreakers />}
                {activeTab === 'foreign' && <ForeignActivity />}
            </div>
        </Card>
    );
};

export default MarketDeepDive;
