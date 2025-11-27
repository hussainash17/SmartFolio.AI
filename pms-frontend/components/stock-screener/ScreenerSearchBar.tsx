import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface ScreenerSearchBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    sortBy: string;
    onSortChange: (value: string) => void;
}

export function ScreenerSearchBar({ searchTerm, onSearchChange, sortBy, onSortChange }: ScreenerSearchBarProps) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by symbol or company name..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="sort-by" className="text-sm">Sort by:</Label>
                        <Select value={sortBy} onValueChange={onSortChange}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="marketCap">Market Cap</SelectItem>
                                <SelectItem value="price">Price</SelectItem>
                                <SelectItem value="changePercent">Change %</SelectItem>
                                <SelectItem value="volume">Volume</SelectItem>
                                <SelectItem value="peRatio">P/E Ratio</SelectItem>
                                <SelectItem value="dividendYield">Dividend Yield</SelectItem>
                                <SelectItem value="rsi">RSI</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
