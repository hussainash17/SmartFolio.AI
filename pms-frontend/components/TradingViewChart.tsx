import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { useTradingViewQuote } from '../hooks/useTradingViewQuote';
import { useTradingViewPositions, TradingViewPosition } from '../hooks/useTradingViewPositions';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  height?: number;
  onPlaceOrder?: (symbol: string, side: 'buy' | 'sell') => void;
  onClosePosition?: (portfolioId: string, positionId: string) => Promise<void>;
  onPositionUpdate?: () => void; // Callback when positions are updated
}

declare global {
  interface Window {
    TradingView: any;
    Datafeeds: any;
  }
}

export const TradingViewChart = memo(({
  symbol = '',
  interval = '1D',
  theme = 'light',
  autosize = true,
  height = 600,
  onPlaceOrder,
  onClosePosition,
  onPositionUpdate,
}: TradingViewChartProps) => {
  void onClosePosition;
  void onPositionUpdate;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const chartRef = useRef<any>(null);
  const positionLinesRef = useRef<any[]>([]);
  const [actualSymbol, setActualSymbol] = useState<string>(symbol);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const datafeedRef = useRef<any>(null);
  const lastPriceRef = useRef<number | null>(null);
  const symbolChangedHandlerRef = useRef<((info: any) => void) | null>(null);

  // Use custom hooks for data fetching
  const { data: quoteData } = useTradingViewQuote({
    symbol: actualSymbol,
    enabled: !!actualSymbol && !isLoadingDefault,
  });

  const { data: positions = [] } = useTradingViewPositions({
    symbol: actualSymbol,
    enabled: !!actualSymbol && !isLoadingDefault,
  });

  // Update price display when quote data changes
  useEffect(() => {
    if (!quoteData) return;

    const { lastPrice: newPrice, change, changePercent } = quoteData;

    if (newPrice !== null && !Number.isNaN(newPrice)) {
      if (lastPriceRef.current !== null) {
        if (newPrice > lastPriceRef.current) {
          setPriceDirection('up');
        } else if (newPrice < lastPriceRef.current) {
          setPriceDirection('down');
        }
      }
      lastPriceRef.current = newPrice;
      setLastPrice(newPrice);
    }

    if (change !== null && !Number.isNaN(change)) {
      setPriceChange(change);
    }

    if (changePercent !== null && !Number.isNaN(changePercent)) {
      setPriceChangePercent(changePercent);
    }
  }, [quoteData]);

  const resetQuoteState = useCallback(() => {
    lastPriceRef.current = null;
    setLastPrice(null);
    setPriceChange(null);
    setPriceChangePercent(null);
    setPriceDirection(null);
  }, []);



  // Fetch default symbol if none provided
  useEffect(() => {
    const fetchDefaultSymbol = async () => {
      if (symbol && symbol.trim() !== '') {
        setActualSymbol(symbol.trim().toUpperCase());
        return;
      }

      setIsLoadingDefault(true);
      try {
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
        // Try to get first stock from market/stocks endpoint
        const response = await fetch(`${apiUrl}/api/v1/market/stocks?limit=1`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0 && data[0].symbol) {
            setActualSymbol(String(data[0].symbol).toUpperCase());
          } else {
            // Try tradingview symbols endpoint as fallback
            const tvResponse = await fetch(`${apiUrl}/api/v1/tradingview/symbols?limit=1`);
            if (tvResponse.ok) {
              const tvData = await tvResponse.json();
              if (tvData && tvData.length > 0 && tvData[0].symbol) {
                setActualSymbol(String(tvData[0].symbol).toUpperCase());
              } else {
                setActualSymbol('GP'); // Fallback to common DSE symbol
              }
            } else {
              setActualSymbol('GP');
            }
          }
        } else {
          // Fallback to common DSE symbol
          setActualSymbol('GP');
        }
      } catch (error) {
        console.error('Error fetching default symbol:', error);
        // Fallback to a common DSE symbol
        setActualSymbol('GP');
      } finally {
        setIsLoadingDefault(false);
      }
    };

    fetchDefaultSymbol();
  }, [symbol]);



  useEffect(() => {
    // Wait for scripts to load
    const initWidget = () => {
      if (!window.TradingView || !window.Datafeeds) {
        console.error('TradingView library not loaded');
        return;
      }

      if (!containerRef.current) {
        return;
      }

      // Don't initialize if symbol is empty or still loading
      if (!actualSymbol || actualSymbol.trim() === '' || isLoadingDefault) {
        return;
      }

      // Clean up existing widget safely
      if (widgetRef.current) {
        try {
          // Check if widget has a valid container before trying to remove
          if (widgetRef.current._container && widgetRef.current._container.parentNode) {
            widgetRef.current.remove();
          }
        } catch (error) {
          // Silently ignore cleanup errors
        }
        widgetRef.current = null;
      }

      // Initialize the TradingView widget
      try {
        // Get API URL from environment or use default
        const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
        const datafeedUrl = `${apiUrl}/api/v1/tradingview`;

        // Create base UDF datafeed
        const baseDatafeed = new window.Datafeeds.UDFCompatibleDatafeed(datafeedUrl);

        // Create caching wrapper that properly proxies all methods
        const cache = new Map<string, any>();
        const pendingRequests = new Map<string, Promise<any>>();

        // Store original getBars method
        const originalGetBars = baseDatafeed.getBars.bind(baseDatafeed);

        // Override only getBars method with caching logic
        baseDatafeed.getBars = function (
          symbolInfo: any,
          resolution: string,
          periodParams: any,
          onHistoryCallback: any,
          onErrorCallback: any
        ) {
          const { from, to, countBack, firstDataRequest } = periodParams;

          // Create cache key
          const cacheKey = `${symbolInfo.name}_${resolution}_${from}_${to}`;

          // Check if we have cached data that covers this request
          if (cache.has(cacheKey)) {
            const cachedData = cache.get(cacheKey);
            console.log('[Datafeed] Serving from cache:', cacheKey);
            onHistoryCallback(cachedData.bars, cachedData.meta);
            return;
          }

          // Check if there's a pending request for the same data
          if (pendingRequests.has(cacheKey)) {
            console.log('[Datafeed] Waiting for pending request:', cacheKey);
            pendingRequests.get(cacheKey)!.then(
              (result) => onHistoryCallback(result.bars, result.meta),
              onErrorCallback
            );
            return;
          }

          // For small countBack requests, check if we have overlapping cached data
          if (countBack && countBack < 100 && !firstDataRequest) {
            // Try to find cached data that covers this range
            for (const [key, value] of cache.entries()) {
              if (key.startsWith(`${symbolInfo.name}_${resolution}_`)) {
                const cachedBars = value.bars;
                if (cachedBars && cachedBars.length > 0) {
                  // Check if cached data covers the requested range
                  const cachedFrom = cachedBars[0].time / 1000;
                  const cachedTo = cachedBars[cachedBars.length - 1].time / 1000;

                  if (cachedFrom <= from && cachedTo >= to) {
                    // Filter bars that fall within the requested range
                    const filteredBars = cachedBars.filter(
                      (bar: any) => bar.time / 1000 >= from && bar.time / 1000 <= to
                    );

                    if (filteredBars.length > 0) {
                      console.log('[Datafeed] Serving filtered from existing cache:', filteredBars.length, 'bars');
                      onHistoryCallback(filteredBars, { noData: false });
                      return;
                    }
                  }
                }
              }
            }
          }

          // Make actual request and cache the result
          console.log('[Datafeed] Fetching new data:', cacheKey, { from, to, countBack, firstDataRequest });

          const requestPromise = new Promise((resolve, reject) => {
            originalGetBars(
              symbolInfo,
              resolution,
              periodParams,
              (bars: any[], meta: any) => {
                // Cache the response
                cache.set(cacheKey, { bars, meta });
                pendingRequests.delete(cacheKey);
                resolve({ bars, meta });
                onHistoryCallback(bars, meta);
              },
              (error: any) => {
                pendingRequests.delete(cacheKey);
                reject(error);
                onErrorCallback(error);
              }
            );
          });

          pendingRequests.set(cacheKey, requestPromise);
        };

        datafeedRef.current = baseDatafeed;

        const widget = new window.TradingView.widget({
          symbol: actualSymbol,
          interval: interval,
          container: containerRef.current,
          datafeed: baseDatafeed,
          library_path: '/charting_library/',
          locale: 'en',
          enabled_features: ['study_templates', 'move_logo_to_main_pane'],
          charts_storage_url: 'https://saveload.tradingview.com',
          charts_storage_api_version: '1.1',
          client_id: 'tradingview.com',
          user_id: 'public_user_id',
          time_frames: [
            { text: '1d', resolution: '1D', description: '1 Day', title: '1D' },
            { text: '5d', resolution: '1D', description: '5 Days', title: '5D' },
            { text: '1w', resolution: '1W', description: '1 Week', title: '1W' },
            { text: '1m', resolution: '1D', description: '1 Month', title: '1M' },
            { text: '3m', resolution: '1D', description: '3 Months', title: '3M' },
            { text: '6m', resolution: '1D', description: '6 Months', title: '6M' },
            { text: '1y', resolution: '1D', description: 'Year to Date', title: 'YTD' },
            { text: '12m', resolution: '1W', description: '1 Year', title: '1Y' },
            { text: '5y', resolution: '1M', description: '5 Years', title: '5Y' },
            { text: '1000y', resolution: '1M', description: 'All', title: 'All' },
          ],
          fullscreen: false,
          autosize: autosize,
          height: autosize ? undefined : height,
          theme: theme,
          timezone: 'Asia/Dhaka',
          toolbar_bg: theme === 'dark' ? '#1e1e1e' : '#ffffff',
          loading_screen: { backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff' },
          overrides: theme === 'dark' ? {
            'paneProperties.background': '#1e1e1e',
            'paneProperties.backgroundType': 'solid',
          } : {},
        });

        widgetRef.current = widget;

        // Setup chart when ready
        widget.onChartReady(() => {
          const chart = widget.chart();
          chartRef.current = chart;

          // Quote updates are now handled by useTradingViewQuote hook
          // Position updates are handled by useTradingViewPositions hook

          const symbolChangedHandler = (symbolInfo: any) => {
            const nextSymbol =
              symbolInfo?.name ||
              symbolInfo?.ticker ||
              symbolInfo?.pro_name ||
              symbolInfo?.description ||
              chart?.symbol() ||
              '';
            const normalized = String(nextSymbol).toUpperCase().trim();
            if (normalized && normalized !== actualSymbol) {
              setActualSymbol(normalized);
            }
            // Quote updates for the new symbol will be handled automatically by useTradingViewQuote hook
          };

          chart.onSymbolChanged().subscribe(null, symbolChangedHandler);
          symbolChangedHandlerRef.current = symbolChangedHandler;

          // Tick handler removed - real-time updates now handled by useTradingViewQuote hook
        });
      } catch (error) {
        console.error('Error initializing TradingView widget:', error);
      }
    };

    // Check if scripts are already loaded
    if (window.TradingView && window.Datafeeds) {
      initWidget();
    } else {
      // Load scripts dynamically
      const loadScripts = async () => {
        // Load charting library script
        const chartingLibScript = document.createElement('script');
        chartingLibScript.src = '/charting_library/charting_library.standalone.js';
        chartingLibScript.async = true;

        // Load datafeed script
        const datafeedScript = document.createElement('script');
        datafeedScript.src = '/charting_library/datafeeds/udf/dist/bundle.js';
        datafeedScript.async = true;

        // Wait for both scripts to load
        const loadPromises = [
          new Promise<void>((resolve, reject) => {
            chartingLibScript.onload = () => resolve();
            chartingLibScript.onerror = reject;
          }),
          new Promise<void>((resolve, reject) => {
            datafeedScript.onload = () => resolve();
            datafeedScript.onerror = reject;
          }),
        ];

        document.head.appendChild(chartingLibScript);
        document.head.appendChild(datafeedScript);

        try {
          await Promise.all(loadPromises);
          initWidget();
        } catch (error) {
          console.error('Error loading TradingView scripts:', error);
        }
      };

      loadScripts();
    }

    // Cleanup on unmount
    return () => {
      if (chartRef.current && symbolChangedHandlerRef.current) {
        try {
          chartRef.current.onSymbolChanged().unsubscribe(null, symbolChangedHandlerRef.current);
        } catch (error) {
          // ignore
        }
        symbolChangedHandlerRef.current = null;
      }

      // Tick handler and quote subscriptions are now managed by React Query hooks
      // No manual cleanup needed

      if (widgetRef.current) {
        try {
          // Check if widget has a valid container before trying to remove
          if (widgetRef.current._container && widgetRef.current._container.parentNode) {
            widgetRef.current.remove();
          }
        } catch (error) {
          // Silently ignore cleanup errors
        }
        widgetRef.current = null;
      }
      datafeedRef.current = null;
    };
  }, [
    actualSymbol,
    interval,
    theme,
    autosize,
    height,
    isLoadingDefault,
  ]);

  // Update position lines when positions change
  useEffect(() => {
    if (!chartRef.current || !positions) return;

    // Clear existing position lines
    positionLinesRef.current.forEach(line => {
      try {
        line.remove();
      } catch (e) {
        // Ignore errors
      }
    });
    positionLinesRef.current = [];

    // Add new position marks for current symbol
    if (positions.length > 0) {
      const newLines: any[] = [];
      positions.forEach(position => {
        try {
          const positionLine = chartRef.current.createPositionLine()
            .setText(`${position.portfolio_name}: ${position.quantity} @ ${position.price}`)
            .setPrice(position.price)
            .setQuantity(position.quantity)
            .setLineColor(position.unrealized_pnl >= 0 ? '#26a69a' : '#ef5350')
            .setBodyBackgroundColor(position.unrealized_pnl >= 0 ? 'rgba(38, 166, 154, 0.1)' : 'rgba(239, 83, 80, 0.1)')
            .setBodyBorderColor(position.unrealized_pnl >= 0 ? '#26a69a' : '#ef5350')
            .setBodyTextColor(position.unrealized_pnl >= 0 ? '#26a69a' : '#ef5350')
            .setTooltip(`Portfolio: ${position.portfolio_name}\nQuantity: ${position.quantity}\nAvg Price: ${position.price}\nP&L: ${position.unrealized_pnl.toFixed(2)}`)
            .setProtectTooltip(true);

          newLines.push(positionLine);
        } catch (error) {
          console.error('Error creating position line:', error);
        }
      });
      positionLinesRef.current = newLines;
    }
  }, [positions]);

  // Show loading state while fetching default symbol
  if (isLoadingDefault || !actualSymbol) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-card rounded-lg border border-border">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full tradingview-chart"
      style={{
        height: autosize ? '100%' : `${height}px`,
        minHeight: autosize ? '360px' : `${Math.max(height, 360)}px`,
      }}
    >
      <div
        ref={containerRef}
        className="tradingview-chart-container"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
});

TradingViewChart.displayName = 'TradingViewChart';

