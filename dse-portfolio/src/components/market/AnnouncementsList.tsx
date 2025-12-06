import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';

const announcements = [
    { id: 1, ticker: 'GP', type: 'Earnings', title: 'Q3 Earnings Report Published', date: '2h ago', tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    { id: 2, ticker: 'BATBC', type: 'Dividend', title: 'Cash Dividend Disbursed', date: '5h ago', tagColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    { id: 3, ticker: 'RENATA', type: 'Board Meeting', title: 'Board Meeting on Oct 25', date: '1d ago', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { id: 4, ticker: 'LHBL', type: 'PSI', title: 'Credit Rating Update', date: '2d ago', tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    { id: 5, ticker: 'BEXIMCO', type: 'Rights', title: 'Rights Issue Approved', date: '3d ago', tagColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

const AnnouncementsList: React.FC = () => {
    const [filter, setFilter] = useState('All');
    const filters = ['All', 'Earnings', 'Dividend', 'Board Meeting', 'PSI'];

    const filteredData = filter === 'All' ? announcements : announcements.filter(a => a.type === filter);

    return (
        <Card
            title="Corporate Announcements"
            action={
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                    <Filter size={18} className="text-gray-500" />
                </button>
            }
        >
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {filters.map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={clsx(
                            "px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap",
                            filter === f
                                ? "bg-primary text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredData.map((item) => (
                    <div key={item.id} className="group cursor-pointer border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{item.ticker}</span>
                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", item.tagColor)}>
                                    {item.type}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors">
                            {item.title}
                        </p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default AnnouncementsList;
