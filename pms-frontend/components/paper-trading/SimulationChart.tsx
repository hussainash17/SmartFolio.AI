'use client';

import { useEffect, useRef, useCallback } from 'react'
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Maximize2 } from 'lucide-react'
import type { CandlestickData, TradeMarker } from '../../hooks/useSimulationReducer'

interface SimulationChartProps {
    visibleData: CandlestickData[]
    tradeMarkers: TradeMarker[]
    symbol: string | null
    currentPrice: number
}

export function SimulationChart({ visibleData, tradeMarkers, symbol, currentPrice }: SimulationChartProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
    const markersPluginRef = useRef<ReturnType<typeof createSeriesMarkers> | null>(null)

    // Initialize chart
    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: '#ffffff' },
                textColor: '#64748b',
            },
            grid: {
                vertLines: { color: '#e2e8f0' },
                horzLines: { color: '#e2e8f0' },
            },
            width: container.clientWidth || 800,
            height: container.clientHeight || 400,
            rightPriceScale: {
                borderColor: '#e2e8f0',
            },
            timeScale: {
                borderColor: '#e2e8f0',
                timeVisible: true,
                secondsVisible: false,
            },
        })

        // Use the new v5 unified series API
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        })

        // Create markers plugin for this series
        const markersPlugin = createSeriesMarkers(candlestickSeries)

        chartRef.current = chart
        candlestickSeriesRef.current = candlestickSeries
        markersPluginRef.current = markersPlugin

        const handleResize = () => {
            if (chart && containerRef.current) {
                chart.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight || 400
                })
            }
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            chart.remove()
            chartRef.current = null
            candlestickSeriesRef.current = null
            markersPluginRef.current = null
        }
    }, [])

    // Update data when visibleData changes
    useEffect(() => {
        if (!candlestickSeriesRef.current || visibleData.length === 0) return

        try {
            const formattedData = visibleData.map((candle) => ({
                time: new Date(candle.time * 1000).toISOString().split('T')[0],
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            }))

            // @ts-ignore - v5 API types
            candlestickSeriesRef.current.setData(formattedData)

            // Update markers using the v5 plugin API
            if (markersPluginRef.current) {
                if (tradeMarkers.length > 0) {
                    const formattedMarkers = tradeMarkers
                        .filter((marker) => visibleData.some((candle) => candle.time === marker.time))
                        .map((marker) => ({
                            time: new Date(marker.time * 1000).toISOString().split('T')[0],
                            position: marker.position,
                            color: marker.color,
                            shape: marker.shape,
                            text: marker.text,
                        }))

                    // @ts-ignore - v5 plugin API
                    markersPluginRef.current.setMarkers(formattedMarkers)
                } else {
                    // @ts-ignore - v5 plugin API
                    markersPluginRef.current.setMarkers([])
                }
            }

            if (chartRef.current) {
                chartRef.current.timeScale().fitContent()
            }
        } catch (error) {
            console.error('Error updating chart data:', error)
        }
    }, [visibleData, tradeMarkers])

    const handleFitContent = useCallback(() => {
        if (chartRef.current) {
            chartRef.current.timeScale().fitContent()
        }
    }, [])

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-BD', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price)
    }

    const priceChange = visibleData.length >= 2
        ? visibleData[visibleData.length - 1].close - visibleData[visibleData.length - 2].close
        : 0
    const isUp = priceChange >= 0
    const priceChangePercent = visibleData.length >= 2 && visibleData[visibleData.length - 2].close !== 0
        ? ((priceChange / visibleData[visibleData.length - 2].close) * 100)
        : 0

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-3">
                        <span>{symbol || 'No Symbol'}</span>
                        {currentPrice > 0 && (
                            <>
                                <span className={`text-xl font-bold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                    ৳{formatPrice(currentPrice)}
                                </span>
                                {visibleData.length >= 2 && (
                                    <Badge
                                        variant="outline"
                                        className={isUp ? 'text-emerald-600 border-emerald-600' : 'text-red-600 border-red-600'}
                                    >
                                        {isUp ? '+' : ''}{formatPrice(priceChange)} ({isUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                                    </Badge>
                                )}
                            </>
                        )}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleFitContent}>
                        <Maximize2 className="h-4 w-4 mr-1" />
                        Fit
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-2 relative">
                <div
                    ref={containerRef}
                    className="w-full h-full"
                    style={{ minHeight: '400px' }}
                />
                {visibleData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-muted-foreground">
                        <div className="text-center">
                            <p className="text-lg mb-2">No chart data</p>
                            <p className="text-sm">Start a simulation to see the chart</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
