import { useState, useCallback, useEffect } from 'react';
import { TradingViewChart } from '../TradingViewChart';
import { TopControlBar } from './TopControlBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AnalyticsToolLayoutProps {
    initialSymbol?: string;
    onPlaceOrder?: (symbol: string, side: 'buy' | 'sell') => void;
}

interface LayoutState {
    left: boolean;
    right: boolean;
    bottom: boolean;
}

export function AnalyticsToolLayout({
    initialSymbol = '',
    onPlaceOrder
}: AnalyticsToolLayoutProps) {
    // Layout State with Persistence
    const [layoutState, setLayoutState] = useState<LayoutState>({
        left: true,
        right: true,
        bottom: true
    });

    const [bottomPanelHeight, setBottomPanelHeight] = useState(240);
    const [leftPanelWidth, setLeftPanelWidth] = useState(280);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);

    // Chart state
    const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
    const [timeframe, setTimeframe] = useState('1D');
    const [chartType, setChartType] = useState<'candlestick' | 'line' | 'bar' | 'heikin_ashi'>('candlestick');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Panel width constants
    const MIN_PANEL_WIDTH = 200;
    const MAX_PANEL_WIDTH = 600;
    const MIN_BOTTOM_HEIGHT = 180;
    const MAX_BOTTOM_HEIGHT = 400;

    // Load layout from localStorage on mount
    useEffect(() => {
        const savedLayout = localStorage.getItem('analytics_layout');
        if (savedLayout) {
            try {
                setLayoutState(JSON.parse(savedLayout));
            } catch (e) {
                console.error('Failed to parse saved layout', e);
            }
        }
    }, []);

    // Save layout to localStorage on change
    const handleLayoutChange = useCallback((newLayout: LayoutState) => {
        setLayoutState(newLayout);
        localStorage.setItem('analytics_layout', JSON.stringify(newLayout));
    }, []);

    const handleSymbolChange = useCallback((symbol: string) => {
        setCurrentSymbol(symbol);
    }, []);

    const handleTimeframeChange = useCallback((tf: string) => {
        setTimeframe(tf);
    }, []);

    const handleChartTypeChange = useCallback((type: 'candlestick' | 'line' | 'bar' | 'heikin_ashi') => {
        setChartType(type);
    }, []);

    const handleThemeToggle = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const toggleLeftPanel = useCallback(() => {
        handleLayoutChange({ ...layoutState, left: !layoutState.left });
    }, [layoutState, handleLayoutChange]);

    const toggleRightPanel = useCallback(() => {
        handleLayoutChange({ ...layoutState, right: !layoutState.right });
    }, [layoutState, handleLayoutChange]);

    const handleBottomPanelResize = useCallback((deltaY: number) => {
        setBottomPanelHeight(prev => {
            const newHeight = prev - deltaY;
            return Math.min(Math.max(newHeight, MIN_BOTTOM_HEIGHT), MAX_BOTTOM_HEIGHT);
        });
    }, []);

    const handleLeftPanelResize = useCallback((newWidth: number) => {
        setLeftPanelWidth(Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH));
    }, []);

    const handleRightPanelResize = useCallback((newWidth: number) => {
        setRightPanelWidth(Math.min(Math.max(newWidth, MIN_PANEL_WIDTH), MAX_PANEL_WIDTH));
    }, []);

    return (
        <div className="flex flex-col h-screen w-full bg-background">
            {/* Top Control Bar */}
            <TopControlBar
                currentSymbol={currentSymbol}
                onSymbolChange={handleSymbolChange}
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
                chartType={chartType}
                onChartTypeChange={handleChartTypeChange}
                theme={theme}
                onThemeToggle={handleThemeToggle}
                layoutState={layoutState}
                onLayoutChange={handleLayoutChange}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel */}
                <div
                    className={`relative transition-all duration-300 ease-in-out border-r border-border bg-card ${layoutState.left ? '' : 'w-0'
                        }`}
                    style={{ width: layoutState.left ? `${leftPanelWidth}px` : '0px' }}
                >
                    <div className="h-full overflow-hidden" style={{ width: `${leftPanelWidth}px` }}>
                        <LeftPanel
                            currentSymbol={currentSymbol}
                            onSymbolSelect={handleSymbolChange}
                        />
                    </div>

                    {/* Resize Handle */}
                    {layoutState.left && (
                        <div
                            className="absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors z-20"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.clientX;
                                const startWidth = leftPanelWidth;

                                const handleMouseMove = (moveEvent: MouseEvent) => {
                                    const deltaX = moveEvent.clientX - startX;
                                    handleLeftPanelResize(startWidth + deltaX);
                                };

                                const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                };

                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                            }}
                        />
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={toggleLeftPanel}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 bg-card border border-border rounded-r-md shadow-sm hover:bg-accent transition-colors"
                        aria-label={layoutState.left ? 'Collapse left panel' : 'Expand left panel'}
                    >
                        {layoutState.left ? (
                            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>
                </div>

                {/* Chart Area + Right Panel Container */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Chart + Right Panel Row */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Chart Area */}
                        <div className="flex-1 relative">
                            <TradingViewChart
                                symbol={currentSymbol}
                                interval={timeframe}
                                theme={theme}
                                autosize={true}
                                onPlaceOrder={onPlaceOrder}
                            />
                        </div>

                        {/* Right Panel */}
                        <div
                            className={`relative transition-all duration-300 ease-in-out border-l border-border bg-card ${layoutState.right ? '' : 'w-0'
                                }`}
                            style={{ width: layoutState.right ? `${rightPanelWidth}px` : '0px' }}
                        >
                            <div className="h-full overflow-hidden" style={{ width: `${rightPanelWidth}px` }}>
                                <RightPanel
                                    currentSymbol={currentSymbol}
                                    onPlaceOrder={onPlaceOrder}
                                />
                            </div>

                            {/* Resize Handle */}
                            {layoutState.right && (
                                <div
                                    className="absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors z-20"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        const startX = e.clientX;
                                        const startWidth = rightPanelWidth;

                                        const handleMouseMove = (moveEvent: MouseEvent) => {
                                            const deltaX = startX - moveEvent.clientX;
                                            handleRightPanelResize(startWidth + deltaX);
                                        };

                                        const handleMouseUp = () => {
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                        };

                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                />
                            )}

                            {/* Toggle Button */}
                            <button
                                onClick={toggleRightPanel}
                                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 bg-card border border-border rounded-l-md shadow-sm hover:bg-accent transition-colors"
                                aria-label={layoutState.right ? 'Collapse right panel' : 'Expand right panel'}
                            >
                                {layoutState.right ? (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bottom Panel */}
                    {layoutState.bottom && (
                        <div
                            className="relative border-t border-border bg-card overflow-hidden"
                            style={{ height: `${bottomPanelHeight}px` }}
                        >
                            {/* Resize Handle */}
                            <div
                                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-accent transition-colors z-10"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const startY = e.clientY;
                                    const startHeight = bottomPanelHeight;

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        const deltaY = startY - moveEvent.clientY;
                                        handleBottomPanelResize(deltaY);
                                    };

                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };

                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                            />

                            <BottomPanel currentSymbol={currentSymbol} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
