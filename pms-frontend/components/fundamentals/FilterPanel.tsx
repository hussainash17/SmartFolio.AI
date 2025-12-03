import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { Filter, X, Star } from "lucide-react";

export interface FilterCriteria {
    sector?: string;
    minPE?: number;
    maxPE?: number;
    minDivYield?: number;
    maxDivYield?: number;
    minScore?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
}

interface FilterPanelProps {
    filters: FilterCriteria;
    onFiltersChange: (filters: FilterCriteria) => void;
    sectors?: string[];
    onApplyTemplate?: (template: string) => void;
}

const FILTER_TEMPLATES = [
    {
        id: 'value',
        name: 'Value Stocks',
        icon: '💎',
        description: 'Low P/E, High dividends, Strong fundamentals',
        filters: { maxPE: 15, minDivYield: 3, minScore: 70 }
    },
    {
        id: 'growth',
        name: 'Growth Stocks',
        icon: '🚀',
        description: 'High growth potential',
        filters: { minScore: 60, minMarketCap: 1000 }
    },
    {
        id: 'dividend',
        name: 'Dividend Kings',
        icon: '👑',
        description: 'Consistent high dividend payouts',
        filters: { minDivYield: 5, minScore: 50 }
    },
    {
        id: 'quality',
        name: 'Quality Stocks',
        icon: '⭐',
        description: 'Strong fundamentals, low debt',
        filters: { minScore: 75 }
    },
];

export function FilterPanel({ filters, onFiltersChange, sectors = [], onApplyTemplate }: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleTemplateClick = (template: typeof FILTER_TEMPLATES[0]) => {
        onFiltersChange({ ...filters, ...template.filters });
        if (onApplyTemplate) {
            onApplyTemplate(template.id);
        }
    };

    const handleReset = () => {
        onFiltersChange({});
    };

    const activeFilterCount = Object.keys(filters).filter(key =>
        filters[key as keyof FilterCriteria] !== undefined
    ).length;

    return (
        <div className="space-y-4">
            {/* Quick Templates */}
            <div className="flex flex-wrap gap-2">
                {FILTER_TEMPLATES.map((template) => (
                    <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTemplateClick(template)}
                        className="flex items-center gap-2"
                    >
                        <span>{template.icon}</span>
                        <span>{template.name}</span>
                    </Button>
                ))}
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2"
                >
                    <Filter className="h-4 w-4" />
                    Advanced Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="text-red-600 hover:text-red-700"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Clear All
                    </Button>
                )}
            </div>

            {/* Advanced Filter Panel */}
            {isOpen && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Filter Criteria</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Sector Filter */}
                        {sectors.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="sector">Sector</Label>
                                <Select
                                    value={filters.sector || 'all'}
                                    onValueChange={(value) =>
                                        onFiltersChange({
                                            ...filters,
                                            sector: value === 'all' ? undefined : value
                                        })
                                    }
                                >
                                    <SelectTrigger id="sector">
                                        <SelectValue placeholder="All Sectors" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sectors</SelectItem>
                                        {sectors.map((sector) => (
                                            <SelectItem key={sector} value={sector}>
                                                {sector}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <Separator />

                        {/* P/E Range */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>P/E Ratio</Label>
                                <span className="text-sm text-muted-foreground">
                                    {filters.minPE || 0} - {filters.maxPE || 100}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Min</Label>
                                    <Slider
                                        value={[filters.minPE || 0]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, minPE: value })
                                        }
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Max</Label>
                                    <Slider
                                        value={[filters.maxPE || 100]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, maxPE: value })
                                        }
                                        min={0}
                                        max={100}
                                        step={1}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dividend Yield Range */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Dividend Yield %</Label>
                                <span className="text-sm text-muted-foreground">
                                    {filters.minDivYield || 0}% - {filters.maxDivYield || 20}%
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Min</Label>
                                    <Slider
                                        value={[filters.minDivYield || 0]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, minDivYield: value })
                                        }
                                        min={0}
                                        max={20}
                                        step={0.5}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Max</Label>
                                    <Slider
                                        value={[filters.maxDivYield || 20]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, maxDivYield: value })
                                        }
                                        min={0}
                                        max={20}
                                        step={0.5}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Fundamental Score */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    Minimum Score
                                </Label>
                                <span className="text-sm text-muted-foreground">
                                    {filters.minScore || 0}
                                </span>
                            </div>
                            <Slider
                                value={[filters.minScore || 0]}
                                onValueChange={([value]) =>
                                    onFiltersChange({ ...filters, minScore: value })
                                }
                                min={0}
                                max={100}
                                step={5}
                            />
                        </div>

                        <Separator />

                        {/* Market Cap Range */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Market Cap (Million)</Label>
                                <span className="text-sm text-muted-foreground">
                                    {filters.minMarketCap || 0} - {filters.maxMarketCap || 50000}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Min</Label>
                                    <Slider
                                        value={[filters.minMarketCap || 0]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, minMarketCap: value })
                                        }
                                        min={0}
                                        max={50000}
                                        step={100}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Max</Label>
                                    <Slider
                                        value={[filters.maxMarketCap || 50000]}
                                        onValueChange={([value]) =>
                                            onFiltersChange({ ...filters, maxMarketCap: value })
                                        }
                                        min={0}
                                        max={50000}
                                        step={100}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
