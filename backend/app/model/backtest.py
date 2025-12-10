"""
Backtest models and schemas for strategy backtesting.
"""
from datetime import date
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class BacktestParams(BaseModel):
    """Parameters for backtesting strategies."""
    init_cash: float = Field(default=100000.0, description="Initial cash amount")
    
    # SMA/EMA parameters
    fast: int = Field(default=10, description="Fast moving average period")
    slow: int = Field(default=50, description="Slow moving average period")
    
    # RSI parameters
    rsi_window: int = Field(default=14, description="RSI calculation window")
    rsi_buy_below: float = Field(default=30.0, description="RSI oversold threshold (buy signal)")
    rsi_sell_above: float = Field(default=70.0, description="RSI overbought threshold (sell signal)")
    
    # Bollinger Bands parameters
    bb_window: int = Field(default=20, description="Bollinger Bands calculation window")
    bb_n: float = Field(default=2.0, description="Standard deviation multiplier")
    
    # MACD parameters
    macd_fast: int = Field(default=12, description="MACD fast period")
    macd_slow: int = Field(default=26, description="MACD slow period")
    macd_signal: int = Field(default=9, description="MACD signal period")
    
    # Stochastic Oscillator parameters
    stoch_k_window: int = Field(default=14, description="Stochastic %K calculation window")
    stoch_d_window: int = Field(default=3, description="Stochastic %D smoothing period")
    stoch_buy_below: float = Field(default=20.0, description="Stochastic oversold threshold (buy signal)")
    stoch_sell_above: float = Field(default=80.0, description="Stochastic overbought threshold (sell signal)")
    
    # ATR Breakout parameters
    atr_window: int = Field(default=14, description="ATR calculation window")
    atr_lookback: int = Field(default=20, description="Lookback period for high/low bands")
    atr_multiplier: float = Field(default=1.5, description="ATR multiplier for breakout bands")
    
    # Triple MA parameters
    ma_short: int = Field(default=10, description="Short moving average period")
    ma_medium: int = Field(default=30, description="Medium moving average period")
    ma_long: int = Field(default=50, description="Long moving average period")
    
    # Z-Score Mean Reversion parameters
    zscore_window: int = Field(default=20, description="Window for z-score calculation")
    zscore_threshold: float = Field(default=2.0, description="Z-score threshold for mean reversion signals")
    
    # ADX Trend Following parameters
    adx_window: int = Field(default=14, description="ADX calculation window")
    adx_threshold: float = Field(default=25.0, description="ADX threshold for trend strength")
    
    # Ichimoku Cloud parameters
    ichimoku_conversion: int = Field(default=9, description="Tenkan-sen (conversion line) period")
    ichimoku_base: int = Field(default=26, description="Kijun-sen (base line) period")
    ichimoku_span_b: int = Field(default=52, description="Senkou Span B period")
    
    # Williams %R parameters
    williams_period: int = Field(default=14, description="Williams %R calculation period")
    williams_buy_below: float = Field(default=-80.0, description="Williams %R oversold threshold")
    williams_sell_above: float = Field(default=-20.0, description="Williams %R overbought threshold")
    
    # CCI (Commodity Channel Index) parameters
    cci_window: int = Field(default=20, description="CCI calculation window")
    cci_buy_below: float = Field(default=-100.0, description="CCI oversold threshold")
    cci_sell_above: float = Field(default=100.0, description="CCI overbought threshold")
    
    # VWMA (Volume Weighted Moving Average) parameters
    vwma_period: int = Field(default=20, description="VWMA calculation period")
    
    # Donchian Channel parameters
    donchian_period: int = Field(default=20, description="Donchian Channel period")
    
    # Momentum Strategy parameters
    momentum_period: int = Field(default=10, description="Momentum calculation period")
    momentum_threshold: float = Field(default=0.05, description="Momentum threshold (5% change)")
    
    # Support/Resistance Mean Reversion parameters
    sr_lookback: int = Field(default=20, description="Lookback period for support/resistance levels")
    sr_touch_threshold: float = Field(default=0.02, description="Price touch threshold (2% from level)")


StrategyType = Literal[
    "buy_hold", "sma", "ema", "rsi", "bbands", "macd",
    "stochastic", "atr_breakout", "triple_ma", "zscore_reversion",
    "adx_trend", "ichimoku", "williams_r", "cci", "vwma_crossover",
    "donchian", "momentum", "sr_reversion"
]


class BacktestRequest(BaseModel):
    """Request payload for running a backtest."""
    symbol: str = Field(..., description="Stock symbol to backtest")
    from_: date = Field(..., description="Start date for backtest")
    to: date = Field(..., description="End date for backtest")
    strategy: StrategyType = Field(..., description="Strategy to use")
    params: BacktestParams = Field(default_factory=BacktestParams, description="Strategy parameters")


class BacktestMetrics(BaseModel):
    """Performance metrics from backtest."""
    total_return_pct: float = Field(..., description="Total return percentage")
    total_profit: float = Field(..., description="Total profit in absolute terms")
    max_drawdown_pct: float = Field(..., description="Maximum drawdown percentage")
    sharpe: Optional[float] = Field(None, description="Sharpe ratio (risk-adjusted return)")
    win_rate: Optional[float] = Field(None, description="Percentage of winning trades")
    total_trades: int = Field(..., description="Total number of trades executed")


class EquityCurvePoint(BaseModel):
    """Single point on the equity curve."""
    time: str = Field(..., description="Date in YYYY-MM-DD format")
    value: float = Field(..., description="Portfolio value at this point")


class TradeRecord(BaseModel):
    """Record of a single trade."""
    entry_time: str = Field(..., description="Entry date in YYYY-MM-DD format")
    exit_time: Optional[str] = Field(None, description="Exit date (None if still open)")
    entry_price: float = Field(..., description="Entry price")
    exit_price: Optional[float] = Field(None, description="Exit price")
    size: float = Field(..., description="Position size (number of shares)")
    pnl: float = Field(..., description="Profit/loss for this trade")
    return_pct: float = Field(..., description="Return percentage for this trade")


class BacktestResponse(BaseModel):
    """Response containing backtest results."""
    metrics: BacktestMetrics = Field(..., description="Performance metrics")
    equity_curve: List[EquityCurvePoint] = Field(..., description="Portfolio value over time")
    trades: List[TradeRecord] = Field(..., description="List of executed trades")
    price_data: List[dict] = Field(default_factory=list, description="Price data with signals for charting")
