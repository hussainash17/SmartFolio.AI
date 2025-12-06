import React from 'react';
import Card from '../Card';

const MarketBreadth: React.FC = () => {
    const data = { gainers: 142, losers: 85, unchanged: 124 };
    const total = data.gainers + data.losers + data.unchanged;

    const getWidth = (val: number) => `${(val / total) * 100}%`;

    return (
        <Card title="Market Breadth" className="h-full">
            <div className="flex h-4 rounded-full overflow-hidden mb-4">
                <div style={{ width: getWidth(data.gainers) }} className="bg-positive" title={`Gainers: ${data.gainers}`} />
                <div style={{ width: getWidth(data.unchanged) }} className="bg-gray-300 dark:bg-gray-600" title={`Unchanged: ${data.unchanged}`} />
                <div style={{ width: getWidth(data.losers) }} className="bg-negative" title={`Losers: ${data.losers}`} />
            </div>

            <div className="flex justify-between text-sm">
                <div className="text-center">
                    <p className="text-positive font-bold">{data.gainers}</p>
                    <p className="text-xs text-gray-500">Gainers</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 font-bold">{data.unchanged}</p>
                    <p className="text-xs text-gray-500">Unchanged</p>
                </div>
                <div className="text-center">
                    <p className="text-negative font-bold">{data.losers}</p>
                    <p className="text-xs text-gray-500">Losers</p>
                </div>
            </div>
        </Card>
    );
};

export default MarketBreadth;
