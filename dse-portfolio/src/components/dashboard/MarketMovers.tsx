import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';

const moversData = {
    gainers: [
        { ticker: 'ZEALBANGLA', price: 185.2, change: 9.8 },
        { ticker: 'MEGHNALIFE', price: 78.5, change: 8.4 },
        { ticker: 'FINEFOODS', price: 124.0, change: 7.2 },
        { ticker: 'AAMRATECH', price: 42.1, change: 6.5 },
        { ticker: 'GENEXIL', price: 68.9, change: 5.9 },
    ],
    losers: [
        { ticker: 'BEACONPHAR', price: 245.0, change: -8.2 },
        { ticker: 'ORIONINFU', price: 312.5, change: -6.4 },
        { ticker: 'BSC', price: 118.0, change: -5.1 },
        { ticker: 'LHBL', price: 65.4, change: -4.2 },
        { ticker: 'OLYMPIC', price: 154.2, change: -3.8 },
    ],
};

const MarketMovers: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');

    return (
        <Card className="h-full">
            <div className="flex items-center gap-4 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                <button
                    onClick={() => setActiveTab('gainers')}
                    className={clsx(
                        "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                        activeTab === 'gainers'
                            ? "border-positive text-positive"
                            : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                >
                    Top Gainers
                </button>
                <button
                    onClick={() => setActiveTab('losers')}
                    className={clsx(
                        "text-sm font-medium pb-2 -mb-2.5 border-b-2 transition-colors",
                        activeTab === 'losers'
                            ? "border-negative text-negative"
                            : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                >
                    Top Losers
                </button>
            </div>

            <div className="space-y-3">
                {moversData[activeTab].map((stock) => (
                    <div key={stock.ticker} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{stock.ticker}</p>
                            <p className="text-xs text-gray-500">৳ {stock.price}</p>
                        </div>
                        <div className={clsx(
                            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded",
                            activeTab === 'gainers' ? "bg-green-50 text-positive dark:bg-green-900/20" : "bg-red-50 text-negative dark:bg-red-900/20"
                        )}>
                            {activeTab === 'gainers' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                            {Math.abs(stock.change)}%
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default MarketMovers;
