import { useState, useCallback } from 'react';
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

export function AnalyticsToolLayout({
    initialSymbol = '',
    onPlaceOrder
}: AnalyticsToolLayoutProps) {
    // Panel visibility states
    const [leftPanelVisible, setLeftPanelVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);
    const [bottomPanelHeight, setBottomPanelHeight] = useState(240);

    // Chart state
    const [currentSymbol, setCurrentSymbol] = useState(initialSymbol);
    const [timeframe, setTimeframe] = useState('1D');
    const [chartType, setChartType] = useState<'candlestick' | 'line' | 'bar'>('candlestick');
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    // Panel width constants
    const LEFT_PANEL_WIDTH = 280;
    const RIGHT_PANEL_WIDTH = 320;
    const MIN_BOTTOM_HEIGHT = 180;
    const MAX_BOTTOM_HEIGHT = 400;

    const handleSymbolChange = useCallback((symbol: string) => {
        setCurrentSymbol(symbol);
    }, []);

    const handleTimeframeChange = useCallback((tf: string) => {
        setTimeframe(tf);
    }, []);

    const handleChartTypeChange = useCallback((type: 'candlestick' | 'line' | 'bar') => {
        setChartType(type);
    }, []);

    const handleThemeToggle = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const toggleLeftPanel = useCallback(() => {
        setLeftPanelVisible(prev => !prev);
    }, []);

    const toggleRightPanel = useCallback(() => {
        setRightPanelVisible(prev => !prev);
    }, []);

    const handleBottomPanelResize = useCallback((deltaY: number) => {
        setBottomPanelHeight(prev => {
            const newHeight = prev - deltaY;
            return Math.min(Math.max(newHeight, MIN_BOTTOM_HEIGHT), MAX_BOTTOM_HEIGHT);
        });
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
            />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel */}
                <div
                    className={`relative transition-all duration-300 ease-in-out border-r border-border bg-card ${leftPanelVisible ? 'w-[280px]' : 'w-0'
                        }`}
                    style={{ width: leftPanelVisible ? `${LEFT_PANEL_WIDTH}px` : '0px' }}
                >
                    {leftPanelVisible && (
                        <LeftPanel
                            currentSymbol={currentSymbol}
                            onSymbolSelect={handleSymbolChange}
                        />
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={toggleLeftPanel}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 bg-card border border-border rounded-r-md shadow-sm hover:bg-accent transition-colors"
                        aria-label={leftPanelVisible ? 'Collapse left panel' : 'Expand left panel'}
                    >
                        {leftPanelVisible ? (
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
                            className={`relative transition-all duration-300 ease-in-out border-l border-border bg-card ${rightPanelVisible ? 'w-[320px]' : 'w-0'
                                }`}
                            style={{ width: rightPanelVisible ? `${RIGHT_PANEL_WIDTH}px` : '0px' }}
                        >
                            {rightPanelVisible && (
                                <RightPanel
                                    currentSymbol={currentSymbol}
                                    onPlaceOrder={onPlaceOrder}
                                />
                            )}

                            {/* Toggle Button */}
                            <button
                                onClick={toggleRightPanel}
                                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-12 bg-card border border-border rounded-l-md shadow-sm hover:bg-accent transition-colors"
                                aria-label={rightPanelVisible ? 'Collapse right panel' : 'Expand right panel'}
                            >
                                {rightPanelVisible ? (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bottom Panel */}
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
                </div>
            </div>
        </div>
    );
}
