import { GripVertical, X } from 'lucide-react'
import { Button } from './ui/button'
import { TradingViewChart } from './TradingViewChart'
import type { ChartConfig } from '../hooks/useMultiChart'

interface ChartWidgetProps {
    config: ChartConfig
    onUpdate: (updates: Partial<ChartConfig>) => void
    onRemove: () => void
}

export function ChartWidget({ config, onUpdate, onRemove }: ChartWidgetProps) {
    return (
        <div className="h-full flex flex-col bg-card">
            {/* Minimal Draggable Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30 cursor-move">
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">{config.symbol}</span>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                    onClick={onRemove}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>

            {/* TradingView Chart - Full Control */}
            <div className="flex-1 min-h-0">
                <TradingViewChart
                    symbol={config.symbol}
                    interval={config.timeframe}
                    theme="light"
                    autosize
                />
            </div>
        </div>
    )
}
