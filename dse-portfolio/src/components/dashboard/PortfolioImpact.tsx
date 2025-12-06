import React from 'react';
import { ArrowUp, ArrowDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';

const ImpactRow = ({ event, impact, exposure }: any) => (
    <div className="grid grid-cols-12 gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 items-center">
        <div className="col-span-4">
            <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{event.name}</p>
            <p className={clsx("text-xs font-medium mt-0.5", event.change >= 0 ? "text-positive" : "text-negative")}>
                {event.change >= 0 ? '+' : ''}{event.change}% Today
            </p>
        </div>
        <div className="col-span-4">
            <div className="flex items-center gap-1.5">
                {impact.value > 0 ? <ArrowUp size={14} className="text-positive" /> :
                    impact.value < 0 ? <ArrowDown size={14} className="text-negative" /> :
                        <Minus size={14} className="text-gray-400" />}
                <span className={clsx("font-bold text-sm",
                    impact.value > 0 ? "text-positive" :
                        impact.value < 0 ? "text-negative" : "text-gray-500"
                )}>
                    {impact.value > 0 ? '+' : ''}৳ {Math.abs(impact.value).toLocaleString()}
                </span>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight mt-1">{impact.desc}</p>
        </div>
        <div className="col-span-4">
            <p className="font-medium text-sm">{exposure.value}% <span className="text-xs text-gray-400 font-normal">(vs Mkt {exposure.market}%)</span></p>
            <p className="text-[10px] text-gray-500 leading-tight mt-1">{exposure.desc}</p>
        </div>
    </div>
);

const SectorVisual = ({ name, weight, performance }: any) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 w-1/3">
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">{name}</span>
        </div>

        {/* Composition Bar */}
        <div className="flex-1 px-4 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div style={{ width: `${weight}%` }} className="h-full bg-primary/80 rounded-full"></div>
            </div>
            <span className="text-xs font-bold w-8 text-right">{weight}%</span>
        </div>

        {/* Performance */}
        <div className="w-1/4 text-right flex justify-end items-center gap-1">
            <span className={clsx("text-xs font-bold", performance >= 0 ? "text-positive" : "text-negative")}>
                {performance > 0 ? '+' : ''}{performance}%
            </span>
            {performance >= 0 ? <ArrowUpRight size={12} className="text-positive" /> : <ArrowDownRight size={12} className="text-negative" />}
        </div>
    </div>
);

const PortfolioImpact: React.FC = () => {
    return (
        <Card title="Market Impact Analysis" subtitle="How today's market affects you">
            {/* Impact Table */}
            <div className="mb-6">
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-4">Market Event</div>
                    <div className="col-span-4">Impact on You</div>
                    <div className="col-span-4">Your Exposure</div>
                </div>

                <ImpactRow
                    event={{ name: 'Pharma Sector', change: 2.4 }}
                    impact={{ value: 1240, desc: 'Your SQURPHARMA + RENATA' }}
                    exposure={{ value: 38, market: 28, desc: 'Overweighting helping today' }}
                />
                <ImpactRow
                    event={{ name: 'Bank Liquidity', change: -0.5 }}
                    impact={{ value: 340, desc: 'Bonds up, Banks down' }}
                    exposure={{ value: 19, market: 15, desc: 'Mixed impact from rate news' }}
                />
                <ImpactRow
                    event={{ name: 'Textile Rally', change: -2.1 }}
                    impact={{ value: -85, desc: 'Minimal holding in Textile' }}
                    exposure={{ value: 2, market: 12, desc: 'Missed rally, consider adding?' }}
                />
            </div>

            {/* Composition vs Performance */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">Composition vs Performance</h4>
                    <span className="text-[10px] text-gray-400">Real-time</span>
                </div>
                <div className="space-y-1">
                    <SectorVisual name="Pharma" weight={38} performance={2.4} />
                    <SectorVisual name="Bank" weight={15} performance={-0.5} />
                    <SectorVisual name="Engg" weight={12} performance={1.2} />
                    <SectorVisual name="Textile" weight={2} performance={-2.1} />
                </div>
            </div>
        </Card>
    );
};

export default PortfolioImpact;
