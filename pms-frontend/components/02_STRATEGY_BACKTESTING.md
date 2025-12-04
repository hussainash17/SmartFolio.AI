# Feature Prompt: Strategy Backtesting

## Feature Overview
Implement a comprehensive backtesting system that allows users to test various trading strategies against historical data. The system should support multiple technical analysis strategies and provide detailed performance metrics and visualizations.

## Supported Strategies

### 1. Buy & Hold
- Simple strategy: Buy at start, hold until end
- No parameters required

### 2. SMA (Simple Moving Average) Crossover
- Buy when fast MA crosses above slow MA
- Sell when fast MA crosses below slow MA
- Parameters: Fast period, Slow period

### 3. EMA (Exponential Moving Average) Crossover
- Buy when fast EMA crosses above slow EMA
- Sell when fast EMA crosses below slow EMA
- Parameters: Fast period, Slow period

### 4. RSI (Relative Strength Index)
- Buy when RSI falls below threshold (oversold)
- Sell when RSI rises above threshold (overbought)
- Parameters: Window period, Buy below threshold, Sell above threshold

### 5. Bollinger Bands
- Buy when price breaks above upper band
- Sell when price breaks below lower band
- Parameters: Window period, Standard deviation multiplier (n)

### 6. MACD (Moving Average Convergence Divergence)
- Buy when MACD line crosses above signal line
- Sell when MACD line crosses below signal line
- Parameters: Fast period, Slow period, Signal period

## Core Functionality

### Backtest Configuration
- Stock selection
- Date range selection (from/to dates)
- Strategy selection dropdown
- Strategy-specific parameter inputs
- Initial cash amount input

### Backtest Execution
- Submit backtest request to backend
- Display loading state during execution
- Handle errors gracefully
- Display results when complete

### Results Display
- **Performance Metrics Cards**:
  - Total Return (%)
  - Max Drawdown (%)
  - Sharpe Ratio
  - Win Rate (%)
  - Total Trades
  - Total Profit (absolute)
  
- **Equity Curve Chart**: Plotly line chart showing portfolio value over time
- **Price & Trades Chart**: Plotly chart showing price line with buy/sell markers
- **Trade List**: List of all trades with entry/exit times and P&L

## Backend API Endpoint

### POST /backtest
**Request Body:**
```json
{
  "symbol": "string",
  "from_": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "strategy": "buy_hold" | "sma" | "ema" | "rsi" | "bbands" | "macd",
  "params": {
    "init_cash": 10000.0,
    "fast": 10,
    "slow": 50,
    "rsi_window": 14,
    "rsi_buy_below": 30.0,
    "rsi_sell_above": 70.0,
    "bb_window": 20,
    "bb_n": 2.0,
    "macd_fast": 12,
    "macd_slow": 26,
    "macd_signal": 9
  },
  "jwtToken": "string"
}
```

**Response:**
```json
{
  "metrics": {
    "total_return_pct": 0.0,
    "total_profit": 0.0,
    "max_drawdown_pct": 0.0,
    "sharpe": null,
    "win_rate": null,
    "total_trades": 0
  },
  "equityCurve": [{"time": "YYYY-MM-DD", "value": 0.0}],
  "trades": [{
    "entry_time": "YYYY-MM-DD",
    "exit_time": "YYYY-MM-DD" | null,
    "pnl": 0.0
  }],
  "figures": {
    "equity": {...},
    "price_trades": {...}
  }
}
```

## Frontend Components Required

1. **BacktestingPage Component**
   - Stock selector dropdown
   - Date range inputs (from/to)
   - Initial cash input
   - Strategy selector dropdown
   - Dynamic parameter inputs based on selected strategy
   - Run backtest button
   - Results display section

2. **BacktestPanel Component** (optional, for main page)
   - Quick backtest controls
   - Results summary

3. **BacktestPriceChart Component**
   - Plotly chart displaying price line
   - Buy markers (green triangles)
   - Sell markers (red triangles)
   - Dark theme styling

## Redux State Management

### backtestSlice State
- `isLoading`: Boolean for loading state
- `error`: Error message string or null
- `lastRequest`: Last backtest request parameters
- `results`: Backtest results object or null

### Actions Required
- `runBacktest`: Async thunk to execute backtest
- `clearBacktest`: Clear results and error

## Backend Implementation Requirements

### Strategy Functions
Each strategy should:
- Accept historical OHLCV data (pandas DataFrame)
- Accept strategy-specific parameters
- Accept initial cash amount
- Use vectorbt library for portfolio simulation
- Return vectorbt Portfolio object

### Response Builder
- Extract statistics from portfolio
- Calculate performance metrics
- Generate equity curve data points
- Extract trade records
- Create Plotly figures for visualization
- Handle NaN/Inf values appropriately

## User Experience Flow

1. User navigates to Backtesting page
2. User selects stock from dropdown
3. User selects date range (from/to)
4. User enters initial cash amount
5. User selects strategy from dropdown
6. Strategy-specific parameter inputs appear
7. User adjusts parameters as needed
8. User clicks "Run Backtest"
9. Loading indicator shows
10. Backend executes backtest
11. Results display:
    - Performance metrics cards
    - Equity curve chart
    - Price & trades chart
    - Trade list (if available)

## Deliverables

### Backend
- [ ] Backtest endpoint implementation
- [ ] All 6 strategy implementations using vectorbt
- [ ] Market data fetching integration
- [ ] Response builder with metrics calculation
- [ ] Plotly figure generation
- [ ] Error handling for invalid inputs
- [ ] Data validation

### Frontend
- [ ] BacktestingPage component
- [ ] Strategy selector with dynamic parameter inputs
- [ ] Redux backtestSlice with async thunk
- [ ] API service function for backtest
- [ ] Results display with metrics cards
- [ ] Equity curve chart (Plotly)
- [ ] Price & trades chart (Plotly)
- [ ] Loading states
- [ ] Error handling and display

### Testing Requirements
- [ ] All 6 strategies produce valid results
- [ ] Parameters are correctly passed to backend
- [ ] Results are correctly displayed
- [ ] Charts render correctly
- [ ] Error handling works for invalid inputs
- [ ] Loading states work correctly
- [ ] Edge cases handled (no trades, insufficient data, etc.)

## Dependencies
- Backend: vectorbt, pandas, numpy, plotly
- Frontend: react-plotly.js, plotly.js, Redux Toolkit
- Existing: Market data API integration, JWT authentication

## Notes
- Strategy parameters should have sensible defaults
- Backend should handle missing optional parameters
- Charts should use dark theme for consistency
- All calculations should handle edge cases (no trades, single trade, etc.)


