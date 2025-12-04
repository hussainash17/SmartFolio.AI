import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Calendar } from '../ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import {
    Play,
    Pause,
    SkipForward,
    ChevronRight,
    RotateCcw,
    Calendar as CalendarIcon,
    DollarSign,
    TrendingUp,
    TrendingDown
} from 'lucide-react'
import type { SimulationHook } from '../../hooks/useSimulationReducer'

interface SimulationControlsProps {
    simulation: SimulationHook
    availableSymbols: string[]
    isLoading: boolean
    onStartSimulation: () => void
}

export function SimulationControls({
    simulation,
    availableSymbols,
    isLoading,
    onStartSimulation,
}: SimulationControlsProps) {
    const {
        state,
        setSelectedStock,
        setStartDate,
        setStartingCash,
        moveForward,
        skipForward,
        buyPosition,
        closePosition,
        setAutoPlaying,
        setPlaybackSpeed,
        resetSimulation,
        canAdvance,
        canBuy,
        canSell,
    } = simulation

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    // Get max date (yesterday)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() - 1)

    // Get min date (10 years ago)
    const minDate = new Date()
    minDate.setFullYear(minDate.getFullYear() - 10)

    const canStart = state.selectedStock && state.startDate && state.startingCash >= 1000 && !state.isSimulationActive

    // State to control date picker popover
    const [datePickerOpen, setDatePickerOpen] = useState(false)

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    Simulation Controls
                    {state.isSimulationActive && (
                        <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-600">
                            Active
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Setup Section */}
                {!state.isSimulationActive && (
                    <div className="space-y-4">
                        {/* Stock Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="stock-select">Select Stock</Label>
                            <Select
                                value={state.selectedStock || ''}
                                onValueChange={setSelectedStock}
                            >
                                <SelectTrigger id="stock-select">
                                    <SelectValue placeholder="Choose a stock..." />
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

                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label>Simulation Start Date</Label>
                            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {state.startDate ? formatDate(state.startDate) : 'Pick a date...'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={state.startDate || undefined}
                                        onSelect={(date) => {
                                            if (date) {
                                                setStartDate(date)
                                                setDatePickerOpen(false)
                                            }
                                        }}
                                        disabled={(date) => date > maxDate || date < minDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Initial Cash */}
                        <div className="space-y-2">
                            <Label htmlFor="initial-cash">Initial Cash (BDT)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="initial-cash"
                                    type="number"
                                    min={1000}
                                    max={10000000}
                                    step={1000}
                                    value={state.startingCash}
                                    onChange={(e) => setStartingCash(Number(e.target.value))}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Start Button */}
                        <Button
                            className="w-full"
                            onClick={onStartSimulation}
                            disabled={!canStart || isLoading}
                        >
                            {isLoading ? 'Loading Data...' : 'Start Simulation'}
                        </Button>
                    </div>
                )}

                {/* Playback Controls */}
                {state.isSimulationActive && (
                    <div className="space-y-4">
                        {/* Day Navigation */}
                        <div className="space-y-2">
                            <Label>Day Navigation</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={moveForward}
                                    disabled={!canAdvance || state.isAutoPlaying}
                                    className="flex-1"
                                >
                                    <ChevronRight className="h-4 w-4 mr-1" />
                                    Next Day
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => skipForward(5)}
                                    disabled={!canAdvance || state.isAutoPlaying}
                                    className="flex-1"
                                >
                                    <SkipForward className="h-4 w-4 mr-1" />
                                    Skip +5
                                </Button>
                            </div>
                        </div>

                        {/* Auto-play Controls */}
                        <div className="space-y-2">
                            <Label>Auto-play</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant={state.isAutoPlaying ? 'destructive' : 'default'}
                                    size="sm"
                                    onClick={() => setAutoPlaying(!state.isAutoPlaying)}
                                    disabled={!canAdvance}
                                    className="flex-1"
                                >
                                    {state.isAutoPlaying ? (
                                        <>
                                            <Pause className="h-4 w-4 mr-1" />
                                            Pause
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-1" />
                                            Play
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Speed Controls */}
                            <div className="flex gap-1">
                                {([0.5, 1, 2] as const).map((speed) => (
                                    <Button
                                        key={speed}
                                        variant={state.playbackSpeed === speed ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPlaybackSpeed(speed)}
                                        className="flex-1"
                                    >
                                        {speed}x
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Trading Controls */}
                        <div className="space-y-2">
                            <Label>Trading</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={buyPosition}
                                    disabled={!canBuy}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Buy
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={closePosition}
                                    disabled={!canSell}
                                    className="flex-1"
                                >
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                    Close
                                </Button>
                            </div>
                        </div>

                        {/* Reset */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetSimulation}
                            className="w-full"
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset Simulation
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
