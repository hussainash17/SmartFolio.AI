import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';

const holdings = [
    { ticker: 'GP', ltp: 286.5, change: 1.2, qty: 500, avg: 240.0, value: 143250, gain: 23250, gainPercent: 19.4 },
    { ticker: 'BATBC', ltp: 518.7, change: -0.5, qty: 200, avg: 480.0, value: 103740, gain: 7740, gainPercent: 8.1 },
    { ticker: 'SQURPHARMA', ltp: 215.0, change: 0.8, qty: 400, avg: 210.0, value: 86000, gain: 2000, gainPercent: 2.4 },
    { ticker: 'RENATA', ltp: 1240.0, change: -1.5, qty: 50, avg: 1280.0, value: 62000, gain: -2000, gainPercent: -3.1 },
    { ticker: 'BEXIMCO', ltp: 115.6, change: 2.1, qty: 1000, avg: 100.0, value: 115600, gain: 15600, gainPercent: 15.6 },
];

const HoldingsSnapshot: React.FC = () => {
    return (
        <Card title="Top Holdings" action={<button className="text-primary text-sm font-medium">View All Holdings</button>}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <tr>
                            <th className="pb-3 font-medium">Ticker</th>
                            <th className="pb-3 font-medium text-right">LTP</th>
                            <th className="pb-3 font-medium text-right">Qty</th>
                            <th className="pb-3 font-medium text-right">Value</th>
                            <th className="pb-3 font-medium text-right">Gain/Loss</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {holdings.map((stock) => (
                            <tr key={stock.ticker} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-3 font-medium">{stock.ticker}</td>
                                <td className="py-3 text-right">
                                    <div>{stock.ltp.toFixed(1)}</div>
                                    <div className={clsx("text-xs flex items-center justify-end gap-0.5", stock.change >= 0 ? "text-positive" : "text-negative")}>
                                        {stock.change >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                        {Math.abs(stock.change)}%
                                    </div>
                                </td>
                                <td className="py-3 text-right">{stock.qty}</td>
                                <td className="py-3 text-right font-medium">৳ {stock.value.toLocaleString()}</td>
                                <td className="py-3 text-right">
                                    <div className={clsx("font-medium", stock.gain >= 0 ? "text-positive" : "text-negative")}>
                                        {stock.gain >= 0 ? '+' : ''}{stock.gain.toLocaleString()}
                                    </div>
                                    <div className={clsx("text-xs", stock.gainPercent >= 0 ? "text-positive" : "text-negative")}>
                                        {stock.gainPercent >= 0 ? '+' : ''}{stock.gainPercent}%
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default HoldingsSnapshot;
