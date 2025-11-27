import { Button } from '../ui/button';
import { RefreshCw, Download, Bookmark } from 'lucide-react';

interface ScreenerActionButtonsProps {
    onRefresh: () => void;
    isRefreshing: boolean;
    isDisabled: boolean;
}

export function ScreenerActionButtons({ onRefresh, isRefreshing, isDisabled }: ScreenerActionButtonsProps) {
    return (
        <div className="flex items-center justify-end gap-2">
            <div className="flex gap-2">
                <Button variant="outline">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Save Screen
                </Button>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                </Button>
                <Button onClick={onRefresh} disabled={isRefreshing || isDisabled}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
            </div>
        </div>
    );
}
