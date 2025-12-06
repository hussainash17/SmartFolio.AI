import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import Card from '../Card';
import SectorPerformance from '../dashboard/SectorPerformance';

const SectorZone: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card
            title="Sector Performance"
            action={
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            }
        >
            <div className={isExpanded ? "" : "max-h-64 overflow-hidden relative"}>
                <SectorPerformance />
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white dark:from-surface-card-dark to-transparent flex items-end justify-center pb-4">
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="text-primary text-sm font-medium hover:underline"
                        >
                            Show Full Heatmap
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default SectorZone;
