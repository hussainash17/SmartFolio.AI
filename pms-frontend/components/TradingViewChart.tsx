import { useEffect, useRef, memo, useState, useCallback } from 'react';
import { MarketService } from '../src/client';

interface Position {
  id: string;
  portfolio_id: string;
  portfolio_name: string;
  symbol: string;
  quantity: number;
  price: number;
  side: string;
  timestamp: number | null;
  unrealized_pnl: number;
  current_value: number;
}

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
  const [positions, setPositions] = useState<Position[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const datafeedRef = useRef<any>(null);
  const quoteListenerIdRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const tickHandlerRef = useRef<((bar: any) => void) | null>(null);
  const symbolChangedHandlerRef = useRef<((info: any) => void) | null>(null);

  const resetQuoteState = useCallback(() => {
    lastPriceRef.current = null;
    setLastPrice(null);
    setPriceChange(null);
    setPriceChangePercent(null);
    setPriceDirection(null);
  }, []);

  const applyQuoteUpdate = useCallback(
    (price?: number | null, change?: number | null, changePercentValue?: number | null) => {
      if (price !== undefined && price !== null && !Number.isNaN(price)) {
        if (lastPriceRef.current !== null) {
          if (price > lastPriceRef.current) {
            setPriceDirection('up');
          } else if (price < lastPriceRef.current) {
            setPriceDirection('down');
          }
        }
        lastPriceRef.current = price;
        setLastPrice(price);
      }

      if (change !== undefined && change !== null && !Number.isNaN(change)) {
        setPriceChange(change);
      }

      if (
        changePercentValue !== undefined &&
        changePercentValue !== null &&
        !Number.isNaN(changePercentValue)
      ) {
        setPriceChangePercent(changePercentValue);
      }
    },
    []
  );

  const fetchLatestQuote = useCallback(
    async (sym: string) => {
      if (!sym) return;
      try {
        const stockResponse = await MarketService.getStock({ symbol: sym });
        const last =
          (stockResponse as any)?.data?.last_trade_price ??
          (stockResponse as any)?.last ??
          (stockResponse as any)?.close ??
          (stockResponse as any)?.price ??
          null;
        const change =
          (stockResponse as any)?.data?.change ??
          (stockResponse as any)?.change ??
          null;
        const changePercentVal =
          (stockResponse as any)?.data?.change_percent ??
          (stockResponse as any)?.change_percent ??
          null;

        const parsedLast = last !== null ? Number(last) : null;
        const parsedChange = change !== null ? Number(change) : null;
        const parsedChangePercent = changePercentVal !== null ? Number(changePercentVal) : null;

        applyQuoteUpdate(
          parsedLast !== null && !Number.isNaN(parsedLast) ? parsedLast : null,
          parsedChange !== null && !Number.isNaN(parsedChange) ? parsedChange : null,
          parsedChangePercent !== null && !Number.isNaN(parsedChangePercent)
            ? parsedChangePercent
            : null
        );
      } catch (error) {
        console.error('Error fetching latest price:', error);
      }
    },
    [applyQuoteUpdate]
  );

  const unsubscribeQuotes = useCallback(() => {
    if (datafeedRef.current && quoteListenerIdRef.current) {
      try {
        datafeedRef.current.unsubscribeQuotes(quoteListenerIdRef.current);
      } catch (error) {
        console.warn('Failed to unsubscribe quotes', error);
      }
      quoteListenerIdRef.current = null;
    }
  }, []);

  const subscribeToQuotes = useCallback(
    (sym: string) => {
      if (!sym || !datafeedRef.current) {
        return;
      }

      unsubscribeQuotes();
      const listenerId = `tv_quotes_${sym}_${Date.now()}`;

      try {
        datafeedRef.current.subscribeQuotes(
          [sym],
          [],
          (quotes: any[]) => {
            if (!Array.isArray(quotes)) return;
            quotes.forEach((quote) => {
              if (!quote) return;
              const values = quote.v ?? {};
              const last =
                values.lp ??
                values.price ??
                values.close ??
                null;
              const change = values.ch ?? null;
              const changePercentVal = values.chp ?? null;

              const parsedLast = last !== null ? Number(last) : null;
              const parsedChange = change !== null ? Number(change) : null;
              const parsedChangePercent = changePercentVal !== null ? Number(changePercentVal) : null;

              applyQuoteUpdate(
                parsedLast !== null && !Number.isNaN(parsedLast) ? parsedLast : null,
                parsedChange !== null && !Number.isNaN(parsedChange) ? parsedChange : null,
                parsedChangePercent !== null && !Number.isNaN(parsedChangePercent)
                  ? parsedChangePercent
                  : null
              );
            });
          },
          listenerId
        );
        quoteListenerIdRef.current = listenerId;
      } catch (error) {
        console.warn('Failed to subscribe to quotes', error);
      }
    },
    [applyQuoteUpdate, unsubscribeQuotes]
  );

  // Fetch positions for the current symbol
  const fetchPositions = useCallback(async (sym: string) => {
    if (!sym || sym.trim() === '') return;
    const normalizedSymbol = sym.trim().toUpperCase();
    
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/tradingview/positions/${normalizedSymbol}`);
      if (response.ok) {
        const data = await response.json();
        setPositions(data || []);
      } else {
        setPositions([]);
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      setPositions([]);
    }
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

  // Fetch positions when symbol changes
  useEffect(() => {
    if (actualSymbol && !isLoadingDefault) {
      fetchPositions(actualSymbol);
    }
  }, [actualSymbol, isLoadingDefault, fetchPositions]);

  useEffect(() => {
    if (!actualSymbol || isLoadingDefault) {
      return;
    }

    const normalized = actualSymbol.toUpperCase();
    resetQuoteState();
    fetchLatestQuote(normalized);
    subscribeToQuotes(normalized);

    return () => {
      unsubscribeQuotes();
    };
  }, [
    actualSymbol,
    isLoadingDefault,
    resetQuoteState,
    fetchLatestQuote,
    subscribeToQuotes,
    unsubscribeQuotes,
  ]);

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
        const datafeedInstance = new window.Datafeeds.UDFCompatibleDatafeed(
          datafeedUrl
          // Remove limitedServerResponse to disable automatic pagination
          // The backend will return all requested data in one response
        );
        datafeedRef.current = datafeedInstance;

        const widget = new window.TradingView.widget({
          symbol: actualSymbol,
          interval: interval,
          container: containerRef.current,
          datafeed: datafeedInstance,
          library_path: '/charting_library/',
          locale: 'en',
          disabled_features: [
            'use_localstorage_for_settings',
          ],
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
          height: height,
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

          const upperSymbol = actualSymbol?.toUpperCase();
          if (upperSymbol) {
            resetQuoteState();
            fetchLatestQuote(upperSymbol);
            subscribeToQuotes(upperSymbol);
          }

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
            } else if (normalized) {
              fetchLatestQuote(normalized);
            }
          };

          chart.onSymbolChanged().subscribe(null, symbolChangedHandler);
          symbolChangedHandlerRef.current = symbolChangedHandler;

          const tickHandler = (bar: any) => {
            if (bar && typeof bar.close !== 'undefined') {
              const closeValue = Number(bar.close);
              if (!Number.isNaN(closeValue)) {
                applyQuoteUpdate(closeValue);
              }
            }
          };

          if (typeof widget.subscribe === 'function') {
            widget.subscribe('onTick', tickHandler);
          }
          tickHandlerRef.current = tickHandler;
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

      if (widgetRef.current && tickHandlerRef.current && typeof widgetRef.current.unsubscribe === 'function') {
        try {
          widgetRef.current.unsubscribe('onTick', tickHandlerRef.current);
        } catch (error) {
          // ignore
        }
      }
      tickHandlerRef.current = null;

      unsubscribeQuotes();

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
    resetQuoteState,
    fetchLatestQuote,
    subscribeToQuotes,
    unsubscribeQuotes,
    applyQuoteUpdate,
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

  const formattedPrice =
    lastPrice !== null
      ? lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '--';

  const formattedChange =
    priceChange !== null
      ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}`
      : null;

  const formattedChangePercent =
    priceChangePercent !== null
      ? `${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%`
      : null;

  const priceColorClass =
    priceDirection === 'up'
      ? 'text-emerald-500'
      : priceDirection === 'down'
        ? 'text-rose-500'
        : 'text-foreground';

  const canPlaceOrder = Boolean(onPlaceOrder && actualSymbol);

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
        height: autosize ? '100vh' : `${height}px`,
        minHeight: autosize ? '520px' : `${Math.max(height, 520)}px`,
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
      <div className="pointer-events-none absolute right-5 top-20 z-20 hidden md:flex flex-col items-end gap-2">
        <div className="flex gap-2 pointer-events-auto">
          <button
            type="button"
            disabled={!canPlaceOrder}
            onClick={() => onPlaceOrder && actualSymbol && onPlaceOrder(actualSymbol, 'sell')}
            className="flex min-w-[84px] flex-col items-start rounded-md bg-rose-500 px-3 py-2 text-white shadow ring-1 ring-rose-500/40 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              Sell
            </span>
            <span className="text-sm font-semibold">{formattedPrice}</span>
          </button>
          <button
            type="button"
            disabled={!canPlaceOrder}
            onClick={() => onPlaceOrder && actualSymbol && onPlaceOrder(actualSymbol, 'buy')}
            className="flex min-w-[84px] flex-col items-start rounded-md bg-emerald-500 px-3 py-2 text-white shadow ring-1 ring-emerald-500/40 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              Buy
            </span>
            <span className="text-sm font-semibold">{formattedPrice}</span>
          </button>
        </div>

        <div className="pointer-events-auto rounded-md border border-border bg-background/90 px-3 py-2 shadow backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {actualSymbol}
          </div>
          <div className={`text-sm font-semibold ${priceColorClass}`}>
            {formattedPrice}
          </div>
          {(formattedChange || formattedChangePercent) && (
            <div className={`text-xs ${priceColorClass}`}>
              {formattedChange ?? '--'}
              {formattedChange && formattedChangePercent ? ' ' : ''}
              {formattedChangePercent ?? ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TradingViewChart.displayName = 'TradingViewChart';

