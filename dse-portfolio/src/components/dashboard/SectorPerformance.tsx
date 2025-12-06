import React from 'react';
import Card from '../Card';
import clsx from 'clsx';

const sectors = [
    { name: 'Pharmaceuticals', change: 2.4, weight: 18 },
    { name: 'Engineering', change: -1.2, weight: 14 },
    { name: 'Bank', change: 0.8, weight: 12 },
    { name: 'Food & Allied', change: 1.5, weight: 10 },
    { name: 'Fuel & Power', change: -0.5, weight: 9 },
    { name: 'Textile', change: -2.1, weight: 8 },
    { name: 'Telecommunication', change: 1.2, weight: 7 },
    { name: 'Cement', change: 0.3, weight: 5 },
    { name: 'Insurance', change: -0.8, weight: 5 },
    { name: 'IT', change: 3.2, weight: 4 },
    { name: 'Travel & Leisure', change: -1.5, weight: 3 },
    { name: 'Ceramics', change: 0.5, weight: 3 },
];

const SectorPerformance: React.FC = () => {
    return (
        <Card title="Sector Performance">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sectors.map((sector) => (
                    <div
                        key={sector.name}
                        className={clsx(
                            "p-4 rounded-lg flex flex-col justify-between h-24 transition-transform hover:scale-105 cursor-pointer",
                            sector.change >= 0
                                ? "bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30"
                                : "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30"
                        )}
                    >
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={sector.name}>
                            {sector.name}
                        </span>
                        <span className={clsx(
                            "text-lg font-bold",
                            sector.change >= 0 ? "text-positive" : "text-negative"
                        )}>
                            {sector.change > 0 ? '+' : ''}{sector.change}%
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default SectorPerformance;
