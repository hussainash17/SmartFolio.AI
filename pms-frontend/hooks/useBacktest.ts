import { useMutation } from '@tanstack/react-query'
import { OpenAPI } from '../src/client'
import type { BacktestRequest, BacktestResponse } from '../components/backtesting/BacktestingSimulation'

interface UseBacktestOptions {
    onSuccess?: (data: BacktestResponse) => void
    onError?: (error: Error) => void
}

async function runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
    const baseUrl = (OpenAPI.BASE || '').replace(/\/$/, '')

    const response = await fetch(`${baseUrl}/api/v1/research/backtest`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(OpenAPI.TOKEN ? { Authorization: `Bearer ${OpenAPI.TOKEN as unknown as string}` } : {}),
        },
        credentials: OpenAPI.WITH_CREDENTIALS ? 'include' : 'omit',
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Backtest failed with status ${response.status}`)
    }

    return response.json()
}

export function useBacktest(options?: UseBacktestOptions) {
    return useMutation({
        mutationFn: runBacktest,
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })
}
