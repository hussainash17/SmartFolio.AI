'use client';

import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

export interface PriceChartProps {
  data: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  colors?: {
    backgroundColor?: string;
    lineColor?: string;
    textColor?: string;
    areaTopColor?: string;
    areaBottomColor?: string;
    borderVisible?: boolean;
  };
}

export function PriceChart({ data, colors = {} }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candlestickSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeries = useRef<ISeriesApi<'Histogram'> | null>(null);
  
  // Sort data in chronological order
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [data]);

  if (sortedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No price data available
      </div>
    );
  }

  const {
    backgroundColor = 'white',
    textColor = 'black',
    lineColor = '#2962FF',
    areaTopColor = '#2962FF',
    areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    borderVisible = false,
  } = colors;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Initialize chart
    chart.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: backgroundColor },
        textColor,
      },
      grid: {
        vertLines: { color: '#f0f3fa' },
        horzLines: { color: '#f0f3fa' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    // Add candlestick series
    candlestickSeries.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series (optional)
    volumeSeries.current = chart.current.addHistogramSeries({
      color: 'rgba(120, 123, 134, 0.8)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    // Handle window resize
    const handleResize = () => {
      if (chart.current && chartContainerRef.current) {
        chart.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
        chart.current = null;
      }
    };
  }, [backgroundColor, textColor, lineColor, areaTopColor, areaBottomColor, borderVisible]);

  useEffect(() => {
    if (!candlestickSeries.current || !chart.current || !sortedData || sortedData.length === 0) return;

    try {
      // Format data for the chart
      const formattedData = sortedData.map(d => ({
        time: d.time.split('T')[0], // Extract date part only
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      // Update candlestick data
      candlestickSeries.current.setData(formattedData);

      // Update volume data if available
      if (volumeSeries.current) {
        const volumeData = sortedData.map(d => ({
          time: d.time.split('T')[0], // Match the time format
          value: d.volume || 0,
          color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
        }));
        volumeSeries.current.setData(volumeData);
      }

      // Fit the content with some padding
      chart.current.timeScale().fitContent();
      
      // Set a reasonable visible range
      const timeScale = chart.current.timeScale();
      const barsInfo = candlestickSeries.current.barsInLogicalRange({
        from: 0,
        to: sortedData.length - 1
      });
      
      if (barsInfo && barsInfo.barsBefore !== undefined) {
        timeScale.setVisibleLogicalRange({
          from: Math.max(0, barsInfo.barsBefore - 5), // Show 5 more bars before
          to: Math.min(sortedData.length - 1, sortedData.length - 1 + 5) // Show 5 more bars after
        });
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }, [sortedData]);

  return (
    <div className="w-full">
      <div ref={chartContainerRef} className="w-full" style={{ height: '500px' }} />
    </div>
  );
}
