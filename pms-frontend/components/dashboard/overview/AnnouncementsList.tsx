import React from 'react';
import { Bell, Calendar, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { useTopUpcomingEvents } from '../../../hooks/useUpcomingEvents';

const AnnouncementsList: React.FC = () => {
    const { data, isLoading, error } = useTopUpcomingEvents(10);

    // Format date for display
    const formatEventDate = (dateStr: string, timeStr: string, timestamp: number) => {
        try {
            // Use timestamp if available (Unix timestamp in seconds)
            const eventDate = timestamp ? new Date(timestamp * 1000) : new Date(dateStr);
            const now = new Date();
            const diffTime = eventDate.getTime() - now.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return `Today, ${timeStr}`;
            } else if (diffDays === 1) {
                return `Tomorrow, ${timeStr}`;
            } else if (diffDays === -1) {
                return `Yesterday, ${timeStr}`;
            } else if (diffDays > 1) {
                return `In ${diffDays} days, ${timeStr}`;
            } else if (diffDays < -1) {
                return `${Math.abs(diffDays)} days ago, ${timeStr}`;
            } else {
                // Fallback to formatted date string
                return `${dateStr}, ${timeStr}`;
            }
        } catch {
            return `${dateStr} ${timeStr}`;
        }
    };

    // Format event title based on type and code
    const formatEventTitle = (code: string, type: string) => {
        const typeMap: Record<string, string> = {
            'AGM': 'Annual General Meeting',
            'Board Meeting': 'Board Meeting',
            'Record Date': 'Record Date',
        };
        const typeLabel = typeMap[type] || type;
        return `${code}: ${typeLabel}`;
    };

    if (isLoading) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Bell size={16} /> Latest Announcements
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex gap-3 items-start animate-pulse">
                                <div className="w-12 h-12 rounded-lg bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                    <div className="h-3 bg-muted rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                        <Bell size={16} /> Latest Announcements
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Failed to load announcements</p>
                </CardContent>
            </Card>
        );
    }

    const events = data?.data || [];

    return (
        <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Bell size={16} /> Latest Announcements
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-xs">View All</Button>
            </CardHeader>
            <CardContent>
                {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming events</p>
                ) : (
                    <div className="space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="flex gap-3 items-start group cursor-pointer">
                                <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center flex-shrink-0">
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        {event.code.substring(0, 3)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-medium truncate pr-2 group-hover:text-primary transition-colors">
                                            {formatEventTitle(event.code, event.type)}
                                        </h4>
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                            {event.type}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Calendar size={10} className="text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">
                                            {formatEventDate(event.date, event.time, event.timestamp)}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight
                                    size={16}
                                    className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AnnouncementsList;
