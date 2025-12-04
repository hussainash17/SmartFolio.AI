"""
Backtest service for running strategy simulations using vectorbt.
"""
import logging
from datetime import date, datetime
from typing import List, Tuple, Optional
from decimal import Decimal

import numpy as np
import pandas as pd
from sqlmodel import Session, select, and_

from app.model.stock import DailyOHLC
from app.model.company import Company
from app.model.backtest import (
    BacktestRequest,
    BacktestResponse,
    BacktestMetrics,
    BacktestParams,
    EquityCurvePoint,
    TradeRecord,
)

logger = logging.getLogger(__name__)


class BacktestService:
    """Service for running strategy backtests."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def run_backtest(self, request: BacktestRequest) -> BacktestResponse:
        """
        Execute a backtest for the given strategy and parameters.
        
        Args:
            request: Backtest request with symbol, dates, strategy, and params
            
        Returns:
            BacktestResponse with metrics, equity curve, and trades
        """
        # Fetch historical data
        df = self._fetch_historical_data(
            symbol=request.symbol,
            from_date=request.from_,
            to_date=request.to
        )
        
        if df.empty or len(df) < 2:
            raise ValueError(f"Insufficient data for symbol {request.symbol} in the given date range")
        
        # Run the appropriate strategy
        strategy_runners = {
            "buy_hold": self._run_buy_hold,
            "sma": self._run_sma_crossover,
            "ema": self._run_ema_crossover,
            "rsi": self._run_rsi_strategy,
            "bbands": self._run_bollinger_bands,
            "macd": self._run_macd_strategy,
        }
        
        runner = strategy_runners.get(request.strategy)
        if not runner:
            raise ValueError(f"Unknown strategy: {request.strategy}")
        
        # Execute strategy and get results
        entries, exits, signals_df = runner(df, request.params)
        
        # Calculate portfolio performance
        metrics, equity_curve, trades = self._calculate_portfolio(
            df=df,
            entries=entries,
            exits=exits,
            init_cash=request.params.init_cash
        )
        
        # Build price data with signals for charting
        price_data = self._build_price_data(df, signals_df, trades)
        
        return BacktestResponse(
            metrics=metrics,
            equity_curve=equity_curve,
            trades=trades,
            price_data=price_data
        )
    
    def _fetch_historical_data(
        self, 
        symbol: str, 
        from_date: date, 
        to_date: date
    ) -> pd.DataFrame:
        """Fetch OHLCV data from database."""
        # Get company by symbol
        company_stmt = select(Company).where(Company.trading_code == symbol.upper())
        company = self.session.exec(company_stmt).first()
        
        if not company:
            raise ValueError(f"Company not found: {symbol}")
        
        # Fetch daily OHLC data
        stmt = (
            select(DailyOHLC)
            .where(
                and_(
                    DailyOHLC.company_id == company.id,
                    DailyOHLC.date >= from_date,
                    DailyOHLC.date <= to_date
                )
            )
            .order_by(DailyOHLC.date)
        )
        
        records = self.session.exec(stmt).all()
        
        if not records:
            return pd.DataFrame()
        
        # Convert to DataFrame
        data = []
        for r in records:
            data.append({
                "date": r.date,
                "open": float(r.open_price) if r.open_price else 0,
                "high": float(r.high) if r.high else 0,
                "low": float(r.low) if r.low else 0,
                "close": float(r.close_price) if r.close_price else 0,
                "volume": int(r.volume) if r.volume else 0,
            })
        
        df = pd.DataFrame(data)
        df.set_index("date", inplace=True)
        df.index = pd.to_datetime(df.index)
        
        return df
    
    def _run_buy_hold(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Buy at start, hold until end."""
        entries = pd.Series(False, index=df.index)
        exits = pd.Series(False, index=df.index)
        
        # Buy on first day
        entries.iloc[0] = True
        # Sell on last day
        exits.iloc[-1] = True
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["signal"] = "hold"
        signals_df.iloc[0, signals_df.columns.get_loc("signal")] = "buy"
        signals_df.iloc[-1, signals_df.columns.get_loc("signal")] = "sell"
        
        return entries, exits, signals_df
    
    def _run_sma_crossover(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """SMA crossover strategy: buy when fast crosses above slow."""
        close = df["close"]
        
        fast_sma = close.rolling(window=params.fast).mean()
        slow_sma = close.rolling(window=params.slow).mean()
        
        # Generate signals
        entries = (fast_sma > slow_sma) & (fast_sma.shift(1) <= slow_sma.shift(1))
        exits = (fast_sma < slow_sma) & (fast_sma.shift(1) >= slow_sma.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["fast_sma"] = fast_sma
        signals_df["slow_sma"] = slow_sma
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_ema_crossover(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """EMA crossover strategy: buy when fast crosses above slow."""
        close = df["close"]
        
        fast_ema = close.ewm(span=params.fast, adjust=False).mean()
        slow_ema = close.ewm(span=params.slow, adjust=False).mean()
        
        # Generate signals
        entries = (fast_ema > slow_ema) & (fast_ema.shift(1) <= slow_ema.shift(1))
        exits = (fast_ema < slow_ema) & (fast_ema.shift(1) >= slow_ema.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["fast_ema"] = fast_ema
        signals_df["slow_ema"] = slow_ema
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_rsi_strategy(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """RSI strategy: buy when oversold, sell when overbought."""
        close = df["close"]
        
        # Calculate RSI
        delta = close.diff()
        gain = delta.where(delta > 0, 0)
        loss = (-delta).where(delta < 0, 0)
        
        avg_gain = gain.rolling(window=params.rsi_window).mean()
        avg_loss = loss.rolling(window=params.rsi_window).mean()
        
        rs = avg_gain / avg_loss.replace(0, np.inf)
        rsi = 100 - (100 / (1 + rs))
        
        # Generate signals
        entries = (rsi < params.rsi_buy_below) & (rsi.shift(1) >= params.rsi_buy_below)
        exits = (rsi > params.rsi_sell_above) & (rsi.shift(1) <= params.rsi_sell_above)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["rsi"] = rsi
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_bollinger_bands(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Bollinger Bands strategy: buy on breakout above upper, sell below lower."""
        close = df["close"]
        
        middle = close.rolling(window=params.bb_window).mean()
        std = close.rolling(window=params.bb_window).std()
        
        upper = middle + (std * params.bb_n)
        lower = middle - (std * params.bb_n)
        
        # Generate signals - mean reversion approach
        # Buy when price touches lower band (oversold)
        # Sell when price touches upper band (overbought)
        entries = (close <= lower) & (close.shift(1) > lower.shift(1))
        exits = (close >= upper) & (close.shift(1) < upper.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["upper"] = upper
        signals_df["middle"] = middle
        signals_df["lower"] = lower
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_macd_strategy(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """MACD strategy: buy when MACD crosses above signal, sell when below."""
        close = df["close"]
        
        fast_ema = close.ewm(span=params.macd_fast, adjust=False).mean()
        slow_ema = close.ewm(span=params.macd_slow, adjust=False).mean()
        
        macd_line = fast_ema - slow_ema
        signal_line = macd_line.ewm(span=params.macd_signal, adjust=False).mean()
        histogram = macd_line - signal_line
        
        # Generate signals
        entries = (macd_line > signal_line) & (macd_line.shift(1) <= signal_line.shift(1))
        exits = (macd_line < signal_line) & (macd_line.shift(1) >= signal_line.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["macd"] = macd_line
        signals_df["signal_line"] = signal_line
        signals_df["histogram"] = histogram
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _calculate_portfolio(
        self,
        df: pd.DataFrame,
        entries: pd.Series,
        exits: pd.Series,
        init_cash: float
    ) -> Tuple[BacktestMetrics, List[EquityCurvePoint], List[TradeRecord]]:
        """Calculate portfolio performance from entry/exit signals."""
        close = df["close"].values
        dates = df.index
        
        # Simulate portfolio
        cash = init_cash
        shares = 0
        position_entry_price = 0
        position_entry_date = None
        
        trades: List[TradeRecord] = []
        equity_values = []
        
        for i in range(len(close)):
            current_price = close[i]
            current_date = dates[i]
            
            # Check for entry signal
            if entries.iloc[i] and shares == 0:
                # Buy with all available cash
                shares = int(cash / current_price)
                if shares > 0:
                    cash -= shares * current_price
                    position_entry_price = current_price
                    position_entry_date = current_date
            
            # Check for exit signal
            elif exits.iloc[i] and shares > 0:
                # Sell all shares
                proceeds = shares * current_price
                pnl = proceeds - (shares * position_entry_price)
                return_pct = ((current_price / position_entry_price) - 1) * 100
                
                trades.append(TradeRecord(
                    entry_time=position_entry_date.strftime("%Y-%m-%d"),
                    exit_time=current_date.strftime("%Y-%m-%d"),
                    entry_price=position_entry_price,
                    exit_price=current_price,
                    size=shares,
                    pnl=pnl,
                    return_pct=return_pct
                ))
                
                cash += proceeds
                shares = 0
                position_entry_price = 0
                position_entry_date = None
            
            # Calculate total equity
            equity = cash + (shares * current_price)
            equity_values.append(equity)
        
        # Close any open position at the end
        if shares > 0:
            final_price = close[-1]
            final_date = dates[-1]
            proceeds = shares * final_price
            pnl = proceeds - (shares * position_entry_price)
            return_pct = ((final_price / position_entry_price) - 1) * 100
            
            trades.append(TradeRecord(
                entry_time=position_entry_date.strftime("%Y-%m-%d"),
                exit_time=final_date.strftime("%Y-%m-%d"),
                entry_price=position_entry_price,
                exit_price=final_price,
                size=shares,
                pnl=pnl,
                return_pct=return_pct
            ))
        
        # Build equity curve
        equity_curve = [
            EquityCurvePoint(
                time=dates[i].strftime("%Y-%m-%d"),
                value=equity_values[i]
            )
            for i in range(len(equity_values))
        ]
        
        # Calculate metrics
        equity_series = pd.Series(equity_values)
        total_return_pct = ((equity_values[-1] / init_cash) - 1) * 100
        total_profit = equity_values[-1] - init_cash
        
        # Calculate max drawdown
        cummax = equity_series.cummax()
        drawdown = (equity_series - cummax) / cummax
        max_drawdown_pct = abs(drawdown.min()) * 100
        
        # Calculate win rate
        if trades:
            winning_trades = sum(1 for t in trades if t.pnl > 0)
            win_rate = (winning_trades / len(trades)) * 100
        else:
            win_rate = None
        
        # Calculate Sharpe ratio (simplified, assuming daily returns)
        if len(equity_values) > 1:
            returns = equity_series.pct_change().dropna()
            if returns.std() > 0:
                sharpe = (returns.mean() / returns.std()) * np.sqrt(252)  # Annualized
            else:
                sharpe = None
        else:
            sharpe = None
        
        metrics = BacktestMetrics(
            total_return_pct=round(total_return_pct, 2),
            total_profit=round(total_profit, 2),
            max_drawdown_pct=round(max_drawdown_pct, 2),
            sharpe=round(sharpe, 2) if sharpe is not None else None,
            win_rate=round(win_rate, 2) if win_rate is not None else None,
            total_trades=len(trades)
        )
        
        return metrics, equity_curve, trades
    
    def _build_price_data(
        self,
        df: pd.DataFrame,
        signals_df: pd.DataFrame,
        trades: List[TradeRecord]
    ) -> List[dict]:
        """Build price data with signals for charting."""
        # Create a set of trade dates for quick lookup
        buy_dates = set()
        sell_dates = set()
        
        for trade in trades:
            buy_dates.add(trade.entry_time)
            if trade.exit_time:
                sell_dates.add(trade.exit_time)
        
        price_data = []
        for idx, row in df.iterrows():
            date_str = idx.strftime("%Y-%m-%d")
            point = {
                "date": date_str,
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "close": row["close"],
                "volume": row["volume"],
            }
            
            # Add signal markers
            if date_str in buy_dates:
                point["marker"] = "buy"
            elif date_str in sell_dates:
                point["marker"] = "sell"
            
            # Add indicator values from signals_df
            if idx in signals_df.index:
                signal_row = signals_df.loc[idx]
                for col in signals_df.columns:
                    if col != "signal" and pd.notna(signal_row[col]):
                        point[col] = float(signal_row[col])
            
            price_data.append(point)
        
        return price_data
