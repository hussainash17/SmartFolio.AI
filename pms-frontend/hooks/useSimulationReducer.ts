import { useReducer, useCallback } from 'react'

// Types
export interface CandlestickData {
    time: number // Unix timestamp in seconds
    open: number
    high: number
    low: number
    close: number
    volume?: number
}

export interface Position {
    symbol: string
    entryPrice: number
    quantity: number
    entryDate: string
}

export interface TradeMarker {
    time: number
    position: 'aboveBar' | 'belowBar'
    color: string
    shape: 'arrowDown' | 'arrowUp'
    text: string
}

export interface SimulationState {
    // Setup
    selectedStock: string | null
    startDate: Date | null
    startingCash: number

    // Simulation data
    preSimulationData: CandlestickData[]  // Candles before start date (shown immediately)
    simulationData: CandlestickData[]      // Candles from start date onwards (revealed progressively)
    currentDayIndex: number
    isSimulationActive: boolean

    // Position & P&L
    position: Position | null
    currentCash: number
    pnl: {
        realized: number
        unrealized: number
    }
    tradeMarkers: TradeMarker[]

    // Playback
    isAutoPlaying: boolean
    playbackSpeed: 0.5 | 1 | 2
}

export type SimulationAction =
    | { type: 'SET_SELECTED_STOCK'; payload: string }
    | { type: 'SET_START_DATE'; payload: Date }
    | { type: 'SET_STARTING_CASH'; payload: number }
    | { type: 'INITIALIZE_SIMULATION'; payload: { preSimulationData: CandlestickData[]; simulationData: CandlestickData[] } }
    | { type: 'MOVE_FORWARD' }
    | { type: 'SKIP_FORWARD'; payload: number }
    | { type: 'BUY_POSITION' }
    | { type: 'CLOSE_POSITION' }
    | { type: 'SET_AUTO_PLAYING'; payload: boolean }
    | { type: 'SET_PLAYBACK_SPEED'; payload: 0.5 | 1 | 2 }
    | { type: 'RESET_SIMULATION' }

const initialState: SimulationState = {
    selectedStock: null,
    startDate: null,
    startingCash: 100000,
    preSimulationData: [],
    simulationData: [],
    currentDayIndex: 0,
    isSimulationActive: false,
    position: null,
    currentCash: 100000,
    pnl: {
        realized: 0,
        unrealized: 0,
    },
    tradeMarkers: [],
    isAutoPlaying: false,
    playbackSpeed: 1,
}

function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
    switch (action.type) {
        case 'SET_SELECTED_STOCK':
            return { ...state, selectedStock: action.payload }

        case 'SET_START_DATE':
            return { ...state, startDate: action.payload }

        case 'SET_STARTING_CASH':
            return {
                ...state,
                startingCash: action.payload,
                currentCash: action.payload
            }

        case 'INITIALIZE_SIMULATION':
            return {
                ...state,
                preSimulationData: action.payload.preSimulationData,
                simulationData: action.payload.simulationData,
                currentDayIndex: 0,
                isSimulationActive: true,
                currentCash: state.startingCash,
                position: null,
                pnl: { realized: 0, unrealized: 0 },
                tradeMarkers: [],
                isAutoPlaying: false,
            }

        case 'MOVE_FORWARD': {
            if (state.currentDayIndex >= state.simulationData.length - 1) {
                return { ...state, isAutoPlaying: false }
            }

            const newIndex = state.currentDayIndex + 1
            const currentCandle = state.simulationData[newIndex]

            // Update unrealized P&L if position exists
            let unrealizedPnl = 0
            if (state.position && currentCandle) {
                unrealizedPnl = (currentCandle.close - state.position.entryPrice) * state.position.quantity
            }

            return {
                ...state,
                currentDayIndex: newIndex,
                pnl: {
                    ...state.pnl,
                    unrealized: unrealizedPnl,
                },
            }
        }

        case 'SKIP_FORWARD': {
            const maxIndex = state.simulationData.length - 1
            const targetIndex = Math.min(state.currentDayIndex + action.payload, maxIndex)

            if (targetIndex >= maxIndex) {
                // Stop auto-play if we reach the end
                const currentCandle = state.simulationData[targetIndex]
                let unrealizedPnl = 0
                if (state.position && currentCandle) {
                    unrealizedPnl = (currentCandle.close - state.position.entryPrice) * state.position.quantity
                }

                return {
                    ...state,
                    currentDayIndex: targetIndex,
                    isAutoPlaying: false,
                    pnl: {
                        ...state.pnl,
                        unrealized: unrealizedPnl,
                    },
                }
            }

            const currentCandle = state.simulationData[targetIndex]
            let unrealizedPnl = 0
            if (state.position && currentCandle) {
                unrealizedPnl = (currentCandle.close - state.position.entryPrice) * state.position.quantity
            }

            return {
                ...state,
                currentDayIndex: targetIndex,
                pnl: {
                    ...state.pnl,
                    unrealized: unrealizedPnl,
                },
            }
        }

        case 'BUY_POSITION': {
            if (state.position || !state.selectedStock) return state

            const currentCandle = state.simulationData[state.currentDayIndex]
            if (!currentCandle || state.currentCash <= 0) return state

            const price = currentCandle.close
            const quantity = Math.floor(state.currentCash / price)
            if (quantity <= 0) return state

            const cost = quantity * price
            const entryDate = new Date(currentCandle.time * 1000).toISOString().split('T')[0]

            const buyMarker: TradeMarker = {
                time: currentCandle.time,
                position: 'belowBar',
                color: '#22c55e',
                shape: 'arrowUp',
                text: `Buy ${quantity} @ ${price.toFixed(2)}`,
            }

            return {
                ...state,
                position: {
                    symbol: state.selectedStock,
                    entryPrice: price,
                    quantity,
                    entryDate,
                },
                currentCash: state.currentCash - cost,
                tradeMarkers: [...state.tradeMarkers, buyMarker],
            }
        }

        case 'CLOSE_POSITION': {
            if (!state.position) return state

            const currentCandle = state.simulationData[state.currentDayIndex]
            if (!currentCandle) return state

            const price = currentCandle.close
            const proceeds = state.position.quantity * price
            const realizedPnl = (price - state.position.entryPrice) * state.position.quantity

            const sellMarker: TradeMarker = {
                time: currentCandle.time,
                position: 'aboveBar',
                color: '#ef4444',
                shape: 'arrowDown',
                text: `Sell ${state.position.quantity} @ ${price.toFixed(2)}`,
            }

            return {
                ...state,
                position: null,
                currentCash: state.currentCash + proceeds,
                pnl: {
                    realized: state.pnl.realized + realizedPnl,
                    unrealized: 0,
                },
                tradeMarkers: [...state.tradeMarkers, sellMarker],
            }
        }

        case 'SET_AUTO_PLAYING':
            return { ...state, isAutoPlaying: action.payload }

        case 'SET_PLAYBACK_SPEED':
            return { ...state, playbackSpeed: action.payload }

        case 'RESET_SIMULATION':
            return {
                ...initialState,
                selectedStock: state.selectedStock,
                startingCash: state.startingCash,
                startDate: state.startDate,
            }

        default:
            return state
    }
}

export function useSimulationReducer() {
    const [state, dispatch] = useReducer(simulationReducer, initialState)

    // Convenience action creators
    const setSelectedStock = useCallback((stock: string) => {
        dispatch({ type: 'SET_SELECTED_STOCK', payload: stock })
    }, [])

    const setStartDate = useCallback((date: Date) => {
        dispatch({ type: 'SET_START_DATE', payload: date })
    }, [])

    const setStartingCash = useCallback((cash: number) => {
        dispatch({ type: 'SET_STARTING_CASH', payload: cash })
    }, [])

    const initializeSimulation = useCallback((preSimulationData: CandlestickData[], simulationData: CandlestickData[]) => {
        dispatch({ type: 'INITIALIZE_SIMULATION', payload: { preSimulationData, simulationData } })
    }, [])

    const moveForward = useCallback(() => {
        dispatch({ type: 'MOVE_FORWARD' })
    }, [])

    const skipForward = useCallback((days: number = 5) => {
        dispatch({ type: 'SKIP_FORWARD', payload: days })
    }, [])

    const buyPosition = useCallback(() => {
        dispatch({ type: 'BUY_POSITION' })
    }, [])

    const closePosition = useCallback(() => {
        dispatch({ type: 'CLOSE_POSITION' })
    }, [])

    const setAutoPlaying = useCallback((playing: boolean) => {
        dispatch({ type: 'SET_AUTO_PLAYING', payload: playing })
    }, [])

    const setPlaybackSpeed = useCallback((speed: 0.5 | 1 | 2) => {
        dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed })
    }, [])

    const resetSimulation = useCallback(() => {
        dispatch({ type: 'RESET_SIMULATION' })
    }, [])

    // Computed values
    // Combine pre-simulation data (always visible) with revealed simulation data
    const revealedSimulationData = state.simulationData.slice(0, state.currentDayIndex + 1)
    const visibleData = [...state.preSimulationData, ...revealedSimulationData]
    const currentCandle = state.simulationData[state.currentDayIndex] || null
    const currentPrice = currentCandle?.close ?? 0
    const positionValue = state.position ? state.position.quantity * currentPrice : 0
    const totalValue = state.currentCash + positionValue
    const totalReturn = totalValue - state.startingCash
    const totalReturnPercent = state.startingCash > 0 ? (totalReturn / state.startingCash) * 100 : 0
    const daysSimulated = state.currentDayIndex
    const totalDays = state.simulationData.length
    const progress = totalDays > 0 ? (daysSimulated / totalDays) * 100 : 0
    const canAdvance = state.currentDayIndex < state.simulationData.length - 1
    const canBuy = !state.position && state.currentCash > 0 && currentPrice > 0 && state.currentCash >= currentPrice
    const canSell = !!state.position

    return {
        state,
        dispatch,
        // Actions
        setSelectedStock,
        setStartDate,
        setStartingCash,
        initializeSimulation,
        moveForward,
        skipForward,
        buyPosition,
        closePosition,
        setAutoPlaying,
        setPlaybackSpeed,
        resetSimulation,
        // Computed
        visibleData,
        currentCandle,
        currentPrice,
        positionValue,
        totalValue,
        totalReturn,
        totalReturnPercent,
        daysSimulated,
        totalDays,
        progress,
        canAdvance,
        canBuy,
        canSell,
    }
}

export type SimulationHook = ReturnType<typeof useSimulationReducer>
