import { useEffect, useRef, memo, useState, useCallback } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const chartRef = useRef<any>(null);
  const positionLinesRef = useRef<any[]>([]);
  const [actualSymbol, setActualSymbol] = useState<string>(symbol);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // Fetch positions for the current symbol
  const fetchPositions = useCallback(async (sym: string) => {
    if (!sym || sym.trim() === '') return;
    
    try {
      const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/tradingview/positions/${sym}`);
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
        setActualSymbol(symbol.trim());
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
            setActualSymbol(data[0].symbol);
          } else {
            // Try tradingview symbols endpoint as fallback
            const tvResponse = await fetch(`${apiUrl}/api/v1/tradingview/symbols?limit=1`);
            if (tvResponse.ok) {
              const tvData = await tvResponse.json();
              if (tvData && tvData.length > 0 && tvData[0].symbol) {
                setActualSymbol(tvData[0].symbol);
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
        
        const widget = new window.TradingView.widget({
          symbol: actualSymbol,
          interval: interval,
          container: containerRef.current,
          datafeed: new window.Datafeeds.UDFCompatibleDatafeed(
            datafeedUrl
            // Remove limitedServerResponse to disable automatic pagination
            // The backend will return all requested data in one response
          ),
          library_path: '/charting_library/',
          locale: 'en',
          disabled_features: [
            'use_localstorage_for_settings',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
            'header_chart_type',
            'header_resolutions',
            'header_saveload',
            'header_symbol_search',
            'header_interval_dialog_button',
            'show_interval_dialog_on_key_press',
            'header_widget',
            'header_widget_dom_node',
            'context_menus',  // Disable TradingView's context menu
          ],
          enabled_features: ['study_templates'],
          charts_storage_url: 'https://saveload.tradingview.com',
          charts_storage_api_version: '1.1',
          client_id: 'tradingview.com',
          user_id: 'public_user_id',
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
          chartRef.current = widget.chart();
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
    };
  }, [actualSymbol, interval, theme, autosize, height, isLoadingDefault, onPlaceOrder]);

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

  // Attach context menu handler with proper cleanup
  useEffect(() => {
    if (!containerRef.current || !onPlaceOrder) {
      console.log('Context menu not attached:', { hasContainer: !!containerRef.current, hasCallback: !!onPlaceOrder });
      return;
    }

    const handleContextMenu = (e: MouseEvent) => {
      console.log('Context menu triggered at:', { x: e.clientX, y: e.clientY, symbol: actualSymbol });
      e.preventDefault();
      e.stopPropagation();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    };

    const container = containerRef.current;
    container.addEventListener('contextmenu', handleContextMenu);
    console.log('Context menu handler attached successfully');

    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
      console.log('Context menu handler removed');
    };
  }, [onPlaceOrder, actualSymbol]);

  // Handle closing context menu
  const handleCloseMenu = useCallback(() => {
    console.log('Context menu closed');
    setShowContextMenu(false);
  }, []);

  // Log when context menu state changes
  useEffect(() => {
    console.log('Context menu visibility changed:', showContextMenu);
  }, [showContextMenu]);

  // Handle buy/sell actions
  const handleBuy = useCallback(() => {
    if (onPlaceOrder && actualSymbol) {
      onPlaceOrder(actualSymbol, 'buy');
    }
    handleCloseMenu();
  }, [onPlaceOrder, actualSymbol, handleCloseMenu]);

  const handleSell = useCallback(() => {
    if (onPlaceOrder && actualSymbol) {
      onPlaceOrder(actualSymbol, 'sell');
    }
    handleCloseMenu();
  }, [onPlaceOrder, actualSymbol, handleCloseMenu]);

  // Handle close position
  const handleClosePositionClick = useCallback(async (position: Position) => {
    if (onClosePosition) {
      try {
        await onClosePosition(position.portfolio_id, position.id);
        // Refresh positions after closing
        await fetchPositions(actualSymbol);
        // Notify parent of position update
        if (onPositionUpdate) {
          onPositionUpdate();
        }
      } catch (error) {
        console.error('Error closing position:', error);
      }
    }
    handleCloseMenu();
  }, [onClosePosition, actualSymbol, fetchPositions, handleCloseMenu, onPositionUpdate]);

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
    <>
      <div 
        ref={containerRef} 
        className="tradingview-chart-container"
        style={{ 
          width: '100%', 
          height: autosize ? '100vh' : `${height}px`,
          minHeight: '100vh'
        }}
      />
      
      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={handleCloseMenu}
            style={{ backgroundColor: 'transparent' }}
          />
          <div 
            className="fixed z-50 rounded-lg shadow-2xl py-2 min-w-[200px]"
            style={{ 
              left: `${contextMenuPosition.x}px`, 
              top: `${contextMenuPosition.y}px`,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="space-y-1 px-2">
              <button
                className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm font-medium text-green-600 hover:text-green-700"
                onClick={handleBuy}
              >
                Buy {actualSymbol}
              </button>
              
              {positions.length > 0 && (
                <>
                  <button
                    className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm font-medium text-red-600 hover:text-red-700"
                    onClick={handleSell}
                  >
                    Sell {actualSymbol}
                  </button>
                  
                  <div className="border-t border-border my-1" />
                  
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Positions
                  </div>
                  
                  {positions.map((position) => (
                    <div key={position.id} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{position.portfolio_name}</span>
                        <span className={`text-xs ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {position.quantity} @ {position.price}
                      </div>
                      <button
                        className="mt-1 text-xs text-red-600 hover:text-red-700 hover:underline"
                        onClick={() => handleClosePositionClick(position)}
                      >
                        Close Position
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
});

TradingViewChart.displayName = 'TradingViewChart';

