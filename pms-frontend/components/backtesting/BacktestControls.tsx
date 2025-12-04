import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CalendarIcon, Play, RotateCcw, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import type { StrategyType, BacktestParams } from './BacktestingSimulation'
import { useState } from 'react'

interface BacktestControlsProps {
    availableSymbols: string[]
    selectedSymbol: string
    onSymbolChange: (symbol: string) => void
    fromDate: Date | undefined
    onFromDateChange: (date: Date | undefined) => void
    toDate: Date | undefined
    onToDateChange: (date: Date | undefined) => void
    strategy: StrategyType
    onStrategyChange: (strategy: StrategyType) => void
    params: BacktestParams
    onParamsChange: (params: BacktestParams) => void
    onRunBacktest: () => void
    onReset: () => void
    isLoading: boolean
    canRun: boolean
}

const STRATEGY_OPTIONS: { value: StrategyType; label: string; description: string }[] = [
    { value: 'buy_hold', label: 'Buy & Hold', description: 'Buy at start, hold until end' },
    { value: 'sma', label: 'SMA Crossover', description: 'Simple Moving Average crossover' },
    { value: 'ema', label: 'EMA Crossover', description: 'Exponential Moving Average crossover' },
    { value: 'rsi', label: 'RSI', description: 'Relative Strength Index signals' },
    { value: 'bbands', label: 'Bollinger Bands', description: 'Mean reversion strategy' },
    { value: 'macd', label: 'MACD', description: 'MACD/Signal line crossover' },
]

export function BacktestControls({
    availableSymbols,
    selectedSymbol,
    onSymbolChange,
    fromDate,
    onFromDateChange,
    toDate,
    onToDateChange,
    strategy,
    onStrategyChange,
    params,
    onParamsChange,
    onRunBacktest,
    onReset,
    isLoading,
    canRun,
}: BacktestControlsProps) {
    const [fromCalendarOpen, setFromCalendarOpen] = useState(false)
    const [toCalendarOpen, setToCalendarOpen] = useState(false)

    const updateParam = (key: keyof BacktestParams, value: number) => {
        onParamsChange({ ...params, [key]: value })
    }

    const renderStrategyParams = () => {
        switch (strategy) {
            case 'buy_hold':
                return null

            case 'sma':
            case 'ema':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Fast Period</Label>
                            <Input
                                type="number"
                                value={params.fast}
                                onChange={(e) => updateParam('fast', parseInt(e.target.value) || 10)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Slow Period</Label>
                            <Input
                                type="number"
                                value={params.slow}
                                onChange={(e) => updateParam('slow', parseInt(e.target.value) || 50)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                    </div>
                )

            case 'rsi':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">RSI Window</Label>
                            <Input
                                type="number"
                                value={params.rsi_window}
                                onChange={(e) => updateParam('rsi_window', parseInt(e.target.value) || 14)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Buy Below (Oversold)</Label>
                            <Input
                                type="number"
                                value={params.rsi_buy_below}
                                onChange={(e) => updateParam('rsi_buy_below', parseFloat(e.target.value) || 30)}
                                min={0}
                                max={100}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Sell Above (Overbought)</Label>
                            <Input
                                type="number"
                                value={params.rsi_sell_above}
                                onChange={(e) => updateParam('rsi_sell_above', parseFloat(e.target.value) || 70)}
                                min={0}
                                max={100}
                                className="h-8"
                            />
                        </div>
                    </div>
                )

            case 'bbands':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Window Period</Label>
                            <Input
                                type="number"
                                value={params.bb_window}
                                onChange={(e) => updateParam('bb_window', parseInt(e.target.value) || 20)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Std Dev Multiplier</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={params.bb_n}
                                onChange={(e) => updateParam('bb_n', parseFloat(e.target.value) || 2)}
                                min={0.1}
                                className="h-8"
                            />
                        </div>
                    </div>
                )

            case 'macd':
                return (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Fast Period</Label>
                            <Input
                                type="number"
                                value={params.macd_fast}
                                onChange={(e) => updateParam('macd_fast', parseInt(e.target.value) || 12)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Slow Period</Label>
                            <Input
                                type="number"
                                value={params.macd_slow}
                                onChange={(e) => updateParam('macd_slow', parseInt(e.target.value) || 26)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Signal Period</Label>
                            <Input
                                type="number"
                                value={params.macd_signal}
                                onChange={(e) => updateParam('macd_signal', parseInt(e.target.value) || 9)}
                                min={1}
                                className="h-8"
                            />
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Backtest Configuration</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
                {/* Symbol Selection */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Symbol</Label>
                    <Select value={selectedSymbol} onValueChange={onSymbolChange}>
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select stock" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                            {availableSymbols.map((symbol) => (
                                <SelectItem key={symbol} value={symbol}>
                                    {symbol}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs">From Date</Label>
                        <Popover open={fromCalendarOpen} onOpenChange={setFromCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={clsx(
                                        'w-full h-8 justify-start text-left font-normal text-xs',
                                        !fromDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                                    {fromDate ? format(fromDate, 'PP') : 'Pick date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={fromDate}
                                    onSelect={(date) => {
                                        onFromDateChange(date)
                                        setFromCalendarOpen(false)
                                    }}
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">To Date</Label>
                        <Popover open={toCalendarOpen} onOpenChange={setToCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={clsx(
                                        'w-full h-8 justify-start text-left font-normal text-xs',
                                        !toDate && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-1.5 h-3 w-3" />
                                    {toDate ? format(toDate, 'PP') : 'Pick date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={toDate}
                                    onSelect={(date) => {
                                        onToDateChange(date)
                                        setToCalendarOpen(false)
                                    }}
                                    disabled={(date) => date > new Date() || (fromDate && date < fromDate)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Initial Cash */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Initial Cash (৳)</Label>
                    <Input
                        type="number"
                        value={params.init_cash}
                        onChange={(e) => updateParam('init_cash', parseFloat(e.target.value) || 100000)}
                        min={1000}
                        step={10000}
                        className="h-8"
                    />
                </div>

                {/* Strategy Selection */}
                <div className="space-y-1.5">
                    <Label className="text-xs">Strategy</Label>
                    <Select value={strategy} onValueChange={(v) => onStrategyChange(v as StrategyType)}>
                        <SelectTrigger className="h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STRATEGY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div>
                                        <div className="font-medium">{opt.label}</div>
                                        <div className="text-xs text-muted-foreground">{opt.description}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Strategy-specific params */}
                {strategy !== 'buy_hold' && (
                    <div className="pt-2 border-t">
                        <Label className="text-xs text-muted-foreground mb-2 block">Strategy Parameters</Label>
                        {renderStrategyParams()}
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                    <Button
                        onClick={onRunBacktest}
                        disabled={!canRun}
                        className="flex-1"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Run Backtest
                            </>
                        )}
                    </Button>
                    <Button variant="outline" size="icon" onClick={onReset}>
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
