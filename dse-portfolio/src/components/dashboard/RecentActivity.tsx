import React from 'react';
import { ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';
import Card from '../Card';
import clsx from 'clsx';

const activities = [
    { id: 1, type: 'Buy', ticker: 'GP', amount: '50,000', date: 'Today, 10:30 AM', icon: ShoppingCart, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { id: 2, type: 'Sell', ticker: 'BATBC', amount: '25,000', date: 'Yesterday', icon: TrendingUp, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
    { id: 3, type: 'Dividend', ticker: 'SQURPHARMA', amount: '2,500', date: '2 days ago', icon: DollarSign, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
    { id: 4, type: 'Buy', ticker: 'BRACBANK', amount: '12,000', date: 'Last week', icon: ShoppingCart, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
];

const RecentActivity: React.FC = () => {
    return (
        <Card title="Recent Activity" action={<button className="text-primary text-sm font-medium">View All</button>}>
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4">
                        <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", activity.color)}>
                            <activity.icon size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{activity.type} {activity.ticker}</p>
                            <p className="text-xs text-gray-500">{activity.date}</p>
                        </div>
                        <div className="font-medium text-sm">
                            {activity.type === 'Buy' ? '-' : '+'}৳ {activity.amount}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RecentActivity;
