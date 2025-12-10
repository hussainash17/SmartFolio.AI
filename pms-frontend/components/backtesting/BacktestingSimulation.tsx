import { useState, useCallback } from 'react'
import { useBacktest } from '../../hooks/useBacktest'
import { BacktestControls } from './BacktestControls'
import { BacktestResults } from './BacktestResults'
import { BacktestChart } from './BacktestChart'
import { Alert, AlertDescription } from '../ui/alert'
import { AlertCircle, LineChart } from 'lucide-react'
import { Card, CardContent } from '../ui/card'

interface BacktestingSimulationProps {
    availableSymbols: string[]
    defaultSymbol?: string
}

export type StrategyType = 
    | 'buy_hold' 
    | 'sma' 
    | 'ema' 
    | 'rsi' 
    | 'bbands' 
    | 'macd'
    | 'stochastic'
    | 'atr_breakout'
    | 'triple_ma'
    | 'zscore_reversion'
    | 'adx_trend'
    | 'ichimoku'
    | 'williams_r'
    | 'cci'
    | 'vwma_crossover'
    | 'donchian'
    | 'momentum'
    | 'sr_reversion'

export interface BacktestParams {
    init_cash: number
    fast: number
    slow: number
    rsi_window: number
    rsi_buy_below: number
    rsi_sell_above: number
    bb_window: number
    bb_n: number
    macd_fast: number
    macd_slow: number
    macd_signal: number
    stoch_k_window: number
    stoch_d_window: number
    stoch_buy_below: number
    stoch_sell_above: number
    atr_window: number
    atr_lookback: number
    atr_multiplier: number
    ma_short: number
    ma_medium: number
    ma_long: number
    zscore_window: number
    zscore_threshold: number
    adx_window: number
    adx_threshold: number
    ichimoku_conversion: number
    ichimoku_base: number
    ichimoku_span_b: number
    williams_period: number
    williams_buy_below: number
    williams_sell_above: number
    cci_window: number
    cci_buy_below: number
    cci_sell_above: number
    vwma_period: number
    donchian_period: number
    momentum_period: number
    momentum_threshold: number
    sr_lookback: number
    sr_touch_threshold: number
}

export interface BacktestRequest {
    symbol: string
    from_: string
    to: string
    strategy: StrategyType
    params: BacktestParams
}

export interface BacktestMetrics {
    total_return_pct: number
    total_profit: number
    max_drawdown_pct: number
    sharpe: number | null
    win_rate: number | null
    total_trades: number
}

export interface EquityCurvePoint {
    time: string
    value: number
}

export interface TradeRecord {
    entry_time: string
    exit_time: string | null
    entry_price: number
    exit_price: number | null
    size: number
    pnl: number
    return_pct: number
}

export interface BacktestResponse {
    metrics: BacktestMetrics
    equity_curve: EquityCurvePoint[]
    trades: TradeRecord[]
    price_data: Array<{
        date: string
        open: number
        high: number
        low: number
        close: number
        volume: number
        marker?: 'buy' | 'sell'
        [key: string]: unknown
    }>
}

const DEFAULT_PARAMS: BacktestParams = {
    init_cash: 100000,
    fast: 10,
    slow: 50,
    rsi_window: 14,
    rsi_buy_below: 30,
    rsi_sell_above: 70,
    bb_window: 20,
    bb_n: 2,
    macd_fast: 12,
    macd_slow: 26,
    macd_signal: 9,
    stoch_k_window: 14,
    stoch_d_window: 3,
    stoch_buy_below: 20,
    stoch_sell_above: 80,
    atr_window: 14,
    atr_lookback: 20,
    atr_multiplier: 1.5,
    ma_short: 10,
    ma_medium: 30,
    ma_long: 50,
    zscore_window: 20,
    zscore_threshold: 2.0,
    adx_window: 14,
    adx_threshold: 25.0,
    ichimoku_conversion: 9,
    ichimoku_base: 26,
    ichimoku_span_b: 52,
    williams_period: 14,
    williams_buy_below: -80,
    williams_sell_above: -20,
    cci_window: 20,
    cci_buy_below: -100,
    cci_sell_above: 100,
    vwma_period: 20,
    donchian_period: 20,
    momentum_period: 10,
    momentum_threshold: 0.05,
    sr_lookback: 20,
    sr_touch_threshold: 0.02,
}

export function BacktestingSimulation({ availableSymbols, defaultSymbol }: BacktestingSimulationProps) {
    const [selectedSymbol, setSelectedSymbol] = useState<string>(defaultSymbol || availableSymbols[0] || '')
    const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
    const [toDate, setToDate] = useState<Date | undefined>(undefined)
    const [strategy, setStrategy] = useState<StrategyType>('sma')
    const [params, setParams] = useState<BacktestParams>(DEFAULT_PARAMS)

    const { mutate: runBacktest, data: results, isPending, error, reset } = useBacktest()

    const handleRunBacktest = useCallback(() => {
        if (!selectedSymbol || !fromDate || !toDate) return

        const request: BacktestRequest = {
            symbol: selectedSymbol,
            from_: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
            strategy,
            params,
        }

        runBacktest(request)
    }, [selectedSymbol, fromDate, toDate, strategy, params, runBacktest])

    const handleReset = useCallback(() => {
        reset()
    }, [reset])

    const canRun = selectedSymbol && fromDate && toDate && !isPending

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {error instanceof Error ? error.message : 'Backtest failed. Please try again.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Layout */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left Panel - Controls */}
                <div className="w-[300px] flex-shrink-0">
                    <BacktestControls
                        availableSymbols={availableSymbols}
                        selectedSymbol={selectedSymbol}
                        onSymbolChange={setSelectedSymbol}
                        fromDate={fromDate}
                        onFromDateChange={setFromDate}
                        toDate={toDate}
                        onToDateChange={setToDate}
                        strategy={strategy}
                        onStrategyChange={setStrategy}
                        params={params}
                        onParamsChange={setParams}
                        onRunBacktest={handleRunBacktest}
                        onReset={handleReset}
                        isLoading={isPending}
                        canRun={canRun}
                    />
                </div>

                {/* Center - Chart */}
                <div className="flex-1 min-w-0">
                    {results ? (
                        <BacktestChart
                            equityCurve={results.equity_curve}
                            priceData={results.price_data}
                            trades={results.trades}
                            symbol={selectedSymbol}
                        />
                    ) : (
                        <Card className="h-full flex items-center justify-center">
                            <CardContent className="text-center text-muted-foreground">
                                <LineChart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No Backtest Results</p>
                                <p className="text-sm">Configure your strategy and click "Run Backtest" to see results</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel - Results */}
                <div className="w-[320px] flex-shrink-0">
                    <BacktestResults
                        metrics={results?.metrics}
                        trades={results?.trades || []}
                        isLoading={isPending}
                    />
                </div>
            </div>
        </div>
    )
}
