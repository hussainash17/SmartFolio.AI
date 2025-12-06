import React from 'react';
import { ShoppingCart, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { cn, formatCurrency } from '../../../lib/utils';
import { Transaction } from '../../../types/trading';

interface RecentActivityProps {
    transactions?: Transaction[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ transactions = [] }) => {
    // Map transactions to display format or use mock if empty
    const activities = transactions.length > 0 ? transactions.slice(0, 5).map(t => ({
        id: t.id,
        type: t.type === 'buy' ? 'Buy' : t.type === 'sell' ? 'Sell' : 'Transaction',
        ticker: t.symbol,
        amount: formatCurrency(t.amount * t.price),
        date: new Date(t.date).toLocaleDateString(),
        icon: t.type === 'buy' ? ShoppingCart : t.type === 'sell' ? TrendingUp : Activity,
        color: t.type === 'buy' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' :
            t.type === 'sell' ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                'text-gray-500 bg-gray-50 dark:bg-gray-800'
    })) : [
        { id: '1', type: 'Buy', ticker: 'GP', amount: '৳ 50,000', date: 'Today', icon: ShoppingCart, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        { id: '2', type: 'Sell', ticker: 'BATBC', amount: '৳ 25,000', date: 'Yesterday', icon: TrendingUp, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
        { id: '3', type: 'Dividend', ticker: 'SQURPHARMA', amount: '৳ 2,500', date: '2 days ago', icon: DollarSign, color: 'text-green-500 bg-green-50 dark:bg-green-900/20' },
    ];

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                <Button variant="link" className="text-primary text-xs font-medium h-auto p-0">View All</Button>
            </CardHeader>
            <div className="space-y-4">
                {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", activity.color)}>
                            <activity.icon size={18} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium">{activity.type} {activity.ticker}</p>
                            <p className="text-xs text-muted-foreground">{activity.date}</p>
                        </div>
                        <div className="font-medium text-sm">
                            {activity.type === 'Buy' ? '-' : '+'}{activity.amount}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RecentActivity;
