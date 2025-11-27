import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { SECTORS, type ScreenerFilters } from '../../lib/screener-utils';
import { formatNumber } from '../../lib/screener-utils';

interface ScreenerFiltersPanelProps {
    filters: ScreenerFilters;
    activeFilters: number;
    onUpdateFilter: <K extends keyof ScreenerFilters>(key: K, value: ScreenerFilters[K]) => void;
    onClearFilters: () => void;
}

export function ScreenerFiltersPanel({ filters, activeFilters, onUpdateFilter, onClearFilters }: ScreenerFiltersPanelProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Filters</CardTitle>
                    <div className="flex items-center gap-2">
                        {activeFilters > 0 && (
                            <Badge variant="secondary">{activeFilters}</Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={onClearFilters}>
                            Clear All
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs defaultValue="fundamental" className="space-y-4">
                    <TabsList className="grid grid-cols-2 w-full">
                        <TabsTrigger value="fundamental">Fundamental</TabsTrigger>
                        <TabsTrigger value="technical">Technical</TabsTrigger>
                    </TabsList>

                    <TabsContent value="fundamental" className="space-y-4">
                        {/* Sector Filter */}
                        <div className="space-y-2">
                            <Label>Sector</Label>
                            <Select value={filters.sector} onValueChange={(value) => onUpdateFilter('sector', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sectors</SelectItem>
                                    {SECTORS.map(sector => (
                                        <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Market Cap */}
                        <div className="space-y-2">
                            <Label>Market Cap (Cr)</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.marketCap}
                                    onValueChange={(value) => onUpdateFilter('marketCap', value as [number, number])}
                                    max={1000000}
                                    step={1000}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>৳{formatNumber(filters.marketCap[0] / 10)} Cr</span>
                                    <span>৳{formatNumber(filters.marketCap[1] / 10)} Cr</span>
                                </div>
                            </div>
                        </div>

                        {/* P/E Ratio */}
                        <div className="space-y-2">
                            <Label>P/E Ratio</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.peRatio}
                                    onValueChange={(value) => onUpdateFilter('peRatio', value as [number, number])}
                                    max={100}
                                    step={0.5}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{filters.peRatio[0]}</span>
                                    <span>{filters.peRatio[1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dividend Yield */}
                        <div className="space-y-2">
                            <Label>Dividend Yield (%)</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.dividendYield}
                                    onValueChange={(value) => onUpdateFilter('dividendYield', value as [number, number])}
                                    max={10}
                                    step={0.1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{filters.dividendYield[0]}%</span>
                                    <span>{filters.dividendYield[1]}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Revenue Growth */}
                        <div className="space-y-2">
                            <Label>Revenue Growth (%)</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.revenueGrowth}
                                    onValueChange={(value) => onUpdateFilter('revenueGrowth', value as [number, number])}
                                    min={-50}
                                    max={100}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{filters.revenueGrowth[0]}%</span>
                                    <span>{filters.revenueGrowth[1]}%</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="technical" className="space-y-4">
                        {/* Price Range */}
                        <div className="space-y-2">
                            <Label>Price Range ($)</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.priceRange}
                                    onValueChange={(value) => onUpdateFilter('priceRange', value as [number, number])}
                                    max={1000}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>${filters.priceRange[0]}</span>
                                    <span>${filters.priceRange[1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* RSI */}
                        <div className="space-y-2">
                            <Label>RSI</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.rsi}
                                    onValueChange={(value) => onUpdateFilter('rsi', value as [number, number])}
                                    max={100}
                                    step={1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{filters.rsi[0]}</span>
                                    <span>{filters.rsi[1]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Price Change */}
                        <div className="space-y-2">
                            <Label>Price Change (%)</Label>
                            <div className="px-2">
                                <Slider
                                    value={filters.priceChange}
                                    onValueChange={(value) => onUpdateFilter('priceChange', value as [number, number])}
                                    min={-20}
                                    max={20}
                                    step={0.1}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{filters.priceChange[0]}%</span>
                                    <span>{filters.priceChange[1]}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Moving Average */}
                        <div className="space-y-2">
                            <Label>Moving Average Position</Label>
                            <Select value={filters.movingAverage} onValueChange={(value) => onUpdateFilter('movingAverage', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="above_20">Above 20-day MA</SelectItem>
                                    <SelectItem value="above_50">Above 50-day MA</SelectItem>
                                    <SelectItem value="below_20">Below 20-day MA</SelectItem>
                                    <SelectItem value="below_50">Below 50-day MA</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
