import { useQuery } from '@tanstack/react-query'
import { TradingviewService } from '../src/client'
import type { CandlestickData } from './useSimulationReducer'

interface UseSimulationDataOptions {
    symbol: string | null
    startDate: Date | null
    enabled?: boolean
}

export interface SimulationDataResult {
    preSimulationData: CandlestickData[]  // Data before start date (shown immediately)
    simulationData: CandlestickData[]      // Data from start date onwards (revealed progressively)
}

export function useSimulationData({ symbol, startDate, enabled = true }: UseSimulationDataOptions) {
    return useQuery({
        queryKey: ['simulation-data', symbol, startDate?.toISOString()],
        queryFn: async (): Promise<SimulationDataResult> => {
            if (!symbol || !startDate) {
                throw new Error('Symbol and start date are required')
            }

            // Calculate date 2 years before start date for historical context
            const twoYearsAgo = new Date(startDate)
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

            // Get today's date for the end of simulation data
            const today = new Date()

            // Convert to Unix timestamps (seconds)
            const fromTimestamp = Math.floor(twoYearsAgo.getTime() / 1000)
            const toTimestamp = Math.floor(today.getTime() / 1000)
            const startTimestamp = Math.floor(startDate.getTime() / 1000)

            const response = await TradingviewService.getHistory({
                symbol: symbol.toUpperCase(),
                resolution: '1D',
                from: fromTimestamp,
                to: toTimestamp,
            })

            // The TradingView UDF returns data in arrays format
            // { s: 'ok', t: number[], o: number[], h: number[], l: number[], c: number[], v: number[] }
            const data = response as {
                s: string
                t?: number[]
                o?: number[]
                h?: number[]
                l?: number[]
                c?: number[]
                v?: number[]
            }

            if (data.s !== 'ok' || !data.t || data.t.length === 0) {
                throw new Error('No data available for this symbol and date range')
            }

            // Transform to candlestick format
            const candlesticks: CandlestickData[] = data.t.map((time, i) => ({
                time,
                open: data.o?.[i] ?? 0,
                high: data.h?.[i] ?? 0,
                low: data.l?.[i] ?? 0,
                close: data.c?.[i] ?? 0,
                volume: data.v?.[i],
            }))

            // Sort by time ascending
            candlesticks.sort((a, b) => a.time - b.time)

            // Split data at the start date
            // Pre-simulation: candles before start date (shown immediately)
            // Simulation: candles from start date onwards (revealed progressively)
            const preSimulationData = candlesticks.filter(candle => candle.time < startTimestamp)
            const simulationData = candlesticks.filter(candle => candle.time >= startTimestamp)

            if (simulationData.length === 0) {
                throw new Error('No simulation data available from the selected start date')
            }

            return {
                preSimulationData,
                simulationData,
            }
        },
        enabled: enabled && !!symbol && !!startDate,
        staleTime: 1000 * 60 * 30, // 30 minutes
        retry: 2,
        refetchOnWindowFocus: false,
    })
}
