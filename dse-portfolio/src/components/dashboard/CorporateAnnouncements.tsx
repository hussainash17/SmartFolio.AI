import React from 'react';
import Card from '../Card';
import clsx from 'clsx';

const announcements = [
    { id: 1, ticker: 'GP', type: 'Earnings', title: 'Q3 Earnings Report Published', date: '2h ago', tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    { id: 2, ticker: 'BATBC', type: 'Dividend', title: 'Cash Dividend Disbursed', date: '5h ago', tagColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    { id: 3, ticker: 'RENATA', type: 'Board Meeting', title: 'Board Meeting on Oct 25', date: '1d ago', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { id: 4, ticker: 'LHBL', type: 'PSI', title: 'Credit Rating Update', date: '2d ago', tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
];

const CorporateAnnouncements: React.FC = () => {
    return (
        <Card title="Corporate Announcements" action={<button className="text-primary text-sm font-medium">View All</button>}>
            <div className="space-y-4">
                {announcements.map((item) => (
                    <div key={item.id} className="group cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{item.ticker}</span>
                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium", item.tagColor)}>
                                    {item.type}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">{item.date}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors line-clamp-1">
                            {item.title}
                        </p>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default CorporateAnnouncements;
