import React from 'react';
import { Bell, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

const announcements = [
    { id: 1, ticker: 'GP', title: 'Board Meeting regarding Dividend', date: 'Today, 3:00 PM', type: 'Dividend' },
    { id: 2, ticker: 'SQURPHARMA', title: 'Q3 Earnings Report Published', date: 'Yesterday', type: 'Earnings' },
    { id: 3, ticker: 'BATBC', title: 'Corporate Action: AGM Date Set', date: '2 days ago', type: 'AGM' },
    { id: 4, ticker: 'RENATA', title: 'Credit Rating Update', date: '3 days ago', type: 'General' },
];

const AnnouncementsList: React.FC = () => {
    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Bell size={16} /> Latest Announcements
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-xs">View All</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {announcements.map((item) => (
                        <div key={item.id} className="flex gap-3 items-start group cursor-pointer">
                            <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground">{item.ticker.substring(0, 3)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-medium truncate pr-2 group-hover:text-primary transition-colors">{item.title}</h4>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">{item.type}</Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Calendar size={10} className="text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">{item.date}</p>
                                </div>
                            </div>
                            <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default AnnouncementsList;
