import { useMemo, useState, useRef, useEffect } from 'react'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { ChartWidget } from './ChartWidget'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Plus, LayoutGrid, Trash2 } from 'lucide-react'
import { useMultiChart } from '../hooks/useMultiChart'

// Dynamic layout calculation based on chart count
const getResponsiveLayout = (chartCount: number) => {
    if (chartCount === 1) {
        return { cols: 12, rows: 1, chartCols: 12, chartRows: 12 } // Full screen
    } else if (chartCount === 2) {
        return { cols: 12, rows: 1, chartCols: 6, chartRows: 12 } // Side by side
    } else if (chartCount <= 4) {
        return { cols: 12, rows: 2, chartCols: 6, chartRows: 6 } // 2x2
    } else if (chartCount <= 6) {
        return { cols: 12, rows: 2, chartCols: 4, chartRows: 6 } // 2x3
    } else if (chartCount <= 9) {
        return { cols: 12, rows: 3, chartCols: 4, chartRows: 4 } // 3x3
    } else {
        return { cols: 12, rows: 3, chartCols: 3, chartRows: 4 } // 3x4
    }
}

export function MultiChartGrid() {
    const {
        charts,
        handleLayoutChange,
        addChart,
        removeChart,
        updateChart,
        applyPreset,
        clearAll
    } = useMultiChart()

    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(1200)

    // Measure container width for responsive grid
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth)
            }
        }

        updateWidth()
        window.addEventListener('resize', updateWidth)
        return () => window.removeEventListener('resize', updateWidth)
    }, [])

    // Dynamic layout based on chart count
    const responsiveConfig = useMemo(() => getResponsiveLayout(charts.length), [charts.length])

    // Convert charts to layout format with dynamic positioning
    const layout = useMemo(() => {
        const { chartCols, chartRows } = responsiveConfig

        return charts.map((chart, index) => {
            // Auto-calculate position based on index
            const col = index % (12 / chartCols)
            const row = Math.floor(index / (12 / chartCols))

            return {
                i: chart.i,
                x: col * chartCols,
                y: row * chartRows,
                w: chartCols,
                h: chartRows,
                minW: 3,
                minH: 3,
            }
        })
    }, [charts, responsiveConfig])

    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => addChart()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chart
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Presets
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => applyPreset('single')}>
                            1 Chart (Full)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('2x2')}>
                            4 Charts (2×2)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('2x3')}>
                            6 Charts (2×3)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('3x3')}>
                            9 Charts (3×3)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('3x4')}>
                            12 Charts (3×4)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" size="sm" onClick={clearAll} disabled={charts.length === 0}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                </Button>

                <div className="flex-1" />

                <div className="text-xs text-muted-foreground">
                    {charts.length} {charts.length === 1 ? 'chart' : 'charts'}
                </div>
            </div>

            {/* Responsive Grid - No Scrollbars */}
            <div ref={containerRef} className="flex-1 overflow-hidden p-2">
                {charts.length > 0 ? (
                    <GridLayout
                        className="layout"
                        layout={layout}
                        cols={12}
                        rowHeight={Math.max(50, ((containerRef.current?.offsetHeight || 800) - 16) / responsiveConfig.rows / responsiveConfig.chartRows)}
                        width={containerWidth - 16}
                        onLayoutChange={handleLayoutChange}
                        isDraggable={true}
                        isResizable={true}
                        compactType={null}
                        preventCollision={false}
                        margin={[8, 8]}
                        containerPadding={[0, 0]}
                        draggableHandle=".cursor-move"
                    >
                        {charts.map((chart) => (
                            <div key={chart.i} className="border rounded-lg overflow-hidden shadow-sm">
                                <ChartWidget
                                    config={chart}
                                    onUpdate={(updates) => updateChart(chart.i, updates)}
                                    onRemove={() => removeChart(chart.i)}
                                />
                            </div>
                        ))}
                    </GridLayout>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <LayoutGrid className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Charts Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your first chart to start monitoring multiple symbols
                        </p>
                        <Button onClick={() => addChart()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Your First Chart
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
