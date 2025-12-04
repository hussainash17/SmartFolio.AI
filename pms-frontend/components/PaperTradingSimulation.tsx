import { useCallback, useMemo } from 'react'
import { useSimulationReducer } from '../hooks/useSimulationReducer'
import { useSimulationData } from '../hooks/useSimulationData'
import { useAutoPlay } from '../hooks/useAutoPlay'
import { SimulationControls } from './paper-trading/SimulationControls'
import { PositionPanel } from './paper-trading/PositionPanel'
import { SimulationChart } from './paper-trading/SimulationChart'
import { Alert, AlertDescription } from './ui/alert'
import { AlertCircle } from 'lucide-react'

interface PaperTradingSimulationProps {
    availableSymbols: string[]
    defaultSymbol?: string
}

export function PaperTradingSimulation({ availableSymbols, defaultSymbol }: PaperTradingSimulationProps) {
    const simulation = useSimulationReducer()
    const { state, initializeSimulation, moveForward, setAutoPlaying, canAdvance } = simulation

    // Fetch data when ready to start
    const { data: historicalData, isLoading, error, refetch } = useSimulationData({
        symbol: state.selectedStock,
        startDate: state.startDate,
        enabled: false, // We'll trigger manually
    })

    // Handle starting simulation
    const handleStartSimulation = useCallback(async () => {
        if (!state.selectedStock || !state.startDate) return

        try {
            const result = await refetch()
            if (result.data && result.data.simulationData.length > 0) {
                initializeSimulation(result.data.preSimulationData, result.data.simulationData)
            }
        } catch (err) {
            console.error('Failed to fetch simulation data:', err)
        }
    }, [state.selectedStock, state.startDate, refetch, initializeSimulation])

    // Auto-play hook
    useAutoPlay({
        isPlaying: state.isAutoPlaying,
        speed: state.playbackSpeed,
        onTick: moveForward,
        canAdvance,
    })

    // Stop auto-play when reaching end
    const handleMoveForward = useCallback(() => {
        moveForward()
        if (!canAdvance) {
            setAutoPlaying(false)
        }
    }, [moveForward, canAdvance, setAutoPlaying])

    // Memoize symbol list
    const symbols = useMemo(() => {
        const uniqueSymbols = Array.from(new Set(availableSymbols))
        if (defaultSymbol && !uniqueSymbols.includes(defaultSymbol)) {
            uniqueSymbols.unshift(defaultSymbol)
        }
        return uniqueSymbols.length > 0 ? uniqueSymbols : ['GP', 'BRACBANK', 'SQURPHARMA', 'BATBC']
    }, [availableSymbols, defaultSymbol])

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Failed to load historical data. Please try again.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Layout */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left Panel - Controls */}
                <div className="w-[280px] flex-shrink-0">
                    <SimulationControls
                        simulation={simulation}
                        availableSymbols={symbols}
                        isLoading={isLoading}
                        onStartSimulation={handleStartSimulation}
                    />
                </div>

                {/* Center - Chart */}
                <div className="flex-1 min-w-0">
                    <SimulationChart
                        visibleData={simulation.visibleData}
                        tradeMarkers={state.tradeMarkers}
                        symbol={state.selectedStock}
                        currentPrice={simulation.currentPrice}
                    />
                </div>

                {/* Right Panel - Position & P&L */}
                <div className="w-[320px] flex-shrink-0">
                    <PositionPanel simulation={simulation} />
                </div>
            </div>
        </div>
    )
}
