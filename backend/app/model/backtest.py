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


StrategyType = Literal["buy_hold", "sma", "ema", "rsi", "bbands", "macd"]


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
