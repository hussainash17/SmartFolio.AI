import React, { useState } from 'react';
import { useTradingIdeas } from '../../hooks/useTradingIdeas';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { X, Plus, Send, TrendingUp, TrendingDown, Minus, Clock, Info, BarChart3, ArrowLeft, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TradingViewChart, TradingViewChartRef } from '../TradingViewChart';
import { useRef } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover";
import { useMarketData } from '../../hooks/useMarketData';

interface IdeaEditorProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export const IdeaEditor: React.FC<IdeaEditorProps> = ({ onSuccess, onCancel }) => {
    const { createIdea } = useTradingIdeas();
    const chartRef = useRef<TradingViewChartRef>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [symbols, setSymbols] = useState<string[]>([]);
    const [bias, setBias] = useState('NEUTRAL');
    const [timeframe, setTimeframe] = useState('1D');
    const [isCapturingChart, setIsCapturingChart] = useState(false);

    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch market data for symbol search
    const { data: searchResults } = useMarketData({
        searchQuery: searchQuery,
        limit: 10,
        enabled: searchQuery.length > 0
    });

    const handleAddSymbol = (symbol: string) => {
        if (symbol && !symbols.includes(symbol)) {
            setSymbols([...symbols, symbol.toUpperCase()]);
            setOpen(false);
            setSearchQuery("");
        }
    };

    const handleRemoveSymbol = (s: string) => {
        setSymbols(symbols.filter(item => item !== s));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content || symbols.length === 0) return;

        setIsCapturingChart(true);
        try {
            // Capture chart state if available
            let chartState = null;
            if (chartRef.current) {
                try {
                    chartState = await chartRef.current.saveChartState();
                } catch (error) {
                    console.error('Failed to save chart state:', error);
                    // Continue without chart state
                }
            }

            await createIdea.mutateAsync({
                title,
                content,
                symbols,
                bias,
                timeframe,
                chart_state: chartState,
                is_published: true
            });
            onSuccess();
        } finally {
            setIsCapturingChart(false);
        }
    };

    return (
        <div>
            <Button
                variant="ghost"
                onClick={onCancel}
                className="mb-4 hover:bg-primary/10"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
            </Button>

            <form onSubmit={handleSubmit}>
                <Card className="bg-card/50 backdrop-blur-md border-primary/10 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Publish Trading Idea</CardTitle>
                        <CardDescription>Share your market analysis with the community</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., GP Bullish Breakout on Daily Chart"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-background/50 text-lg font-medium"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Symbols</Label>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className="w-full justify-between bg-background/50"
                                        >
                                            {"Select symbol..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search symbol..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No symbol found.</CommandEmpty>
                                                <CommandGroup>
                                                    {searchResults?.map((stock) => (
                                                        <CommandItem
                                                            key={stock.symbol}
                                                            value={stock.symbol}
                                                            onSelect={(currentValue) => {
                                                                handleAddSymbol(currentValue);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    symbols.includes(stock.symbol) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{stock.symbol}</span>
                                                                <span className="text-xs text-muted-foreground">{stock.companyName}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {symbols.map(s => (
                                        <Badge key={s} className="bg-primary/20 text-primary border-primary/30 px-2 py-1 gap-1">
                                            {s}
                                            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveSymbol(s)} />
                                        </Badge>
                                    ))}
                                    {symbols.length === 0 && (
                                        <span className="text-xs text-muted-foreground italic">Add at least one symbol</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bias</Label>
                                    <Select value={bias} onValueChange={setBias}>
                                        <SelectTrigger className="bg-background/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LONG">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                                    <span>Long</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="SHORT">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                                    <span>Short</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="NEUTRAL">
                                                <div className="flex items-center gap-2">
                                                    <Minus className="w-4 h-4 text-muted-foreground" />
                                                    <span>Neutral</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timeframe</Label>
                                    <Select value={timeframe} onValueChange={setTimeframe}>
                                        <SelectTrigger className="bg-background/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1D">Daily</SelectItem>
                                            <SelectItem value="1W">Weekly</SelectItem>
                                            <SelectItem value="4h">4 Hours</SelectItem>
                                            <SelectItem value="1h">1 Hour</SelectItem>
                                            <SelectItem value="15m">15 Mins</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Analysis & Description</Label>
                            <Textarea
                                id="content"
                                placeholder="Describe your analysis, key levels, and reasoning..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[250px] bg-background/50 leading-relaxed"
                                required
                            />
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                                <Info className="w-3 h-3" />
                                Markdown is supported for rich text formatting.
                            </div>
                        </div>

                        {/* TradingView Chart for Drawing */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    Chart Analysis
                                </Label>
                                <span className="text-[10px] text-muted-foreground">Add drawings and indicators to support your idea</span>
                            </div>
                            <div className="rounded-xl overflow-hidden border border-primary/10 bg-card shadow-xl h-[500px]">
                                <TradingViewChart
                                    ref={chartRef}
                                    symbol={symbols[0] || ''}
                                    interval={timeframe}
                                    theme="dark"
                                    autosize={true}
                                    enableSaveLoad={true}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <Info className="w-3 h-3" />
                                Your drawings, indicators, and chart settings will be saved with this idea.
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-primary/5 p-6 bg-primary/5">
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createIdea.isPending || isCapturingChart || !title || !content || symbols.length === 0}
                            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 min-w-[150px]"
                        >
                            {createIdea.isPending || isCapturingChart ? (
                                isCapturingChart ? 'Capturing Chart...' : 'Publishing...'
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Publish Idea
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};
