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
            "stochastic": self._run_stochastic_strategy,
            "atr_breakout": self._run_atr_breakout,
            "triple_ma": self._run_triple_ma,
            "zscore_reversion": self._run_zscore_reversion,
            "adx_trend": self._run_adx_trend,
            "ichimoku": self._run_ichimoku,
            "williams_r": self._run_williams_r,
            "cci": self._run_cci_strategy,
            "vwma_crossover": self._run_vwma_crossover,
            "donchian": self._run_donchian,
            "momentum": self._run_momentum,
            "sr_reversion": self._run_sr_reversion,
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
    
    def _run_stochastic_strategy(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Stochastic Oscillator strategy: buy when oversold, sell when overbought."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate Stochastic Oscillator
        low_min = low.rolling(window=params.stoch_k_window).min()
        high_max = high.rolling(window=params.stoch_k_window).max()
        
        k_percent = 100 * ((close - low_min) / (high_max - low_min))
        d_percent = k_percent.rolling(window=params.stoch_d_window).mean()
        
        # Generate signals
        entries = (k_percent < params.stoch_buy_below) & (k_percent.shift(1) >= params.stoch_buy_below)
        exits = (k_percent > params.stoch_sell_above) & (k_percent.shift(1) <= params.stoch_sell_above)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["k_percent"] = k_percent
        signals_df["d_percent"] = d_percent
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_atr_breakout(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """ATR Breakout: buy when price breaks above high + ATR threshold."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate True Range
        hl = high - low
        hc = abs(high - close.shift(1))
        lc = abs(low - close.shift(1))
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        
        atr = tr.rolling(window=params.atr_window).mean()
        
        # Upper and lower bands
        upper_band = high.rolling(window=params.atr_lookback).max() + (atr * params.atr_multiplier)
        lower_band = low.rolling(window=params.atr_lookback).min() - (atr * params.atr_multiplier)
        
        # Generate signals
        entries = (close > upper_band) & (close.shift(1) <= upper_band.shift(1))
        exits = (close < lower_band) & (close.shift(1) >= lower_band.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["atr"] = atr
        signals_df["upper_band"] = upper_band
        signals_df["lower_band"] = lower_band
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_triple_ma(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Triple MA: buy when all three MAs align bullishly."""
        close = df["close"]
        
        ma_short = close.rolling(window=params.ma_short).mean()
        ma_medium = close.rolling(window=params.ma_medium).mean()
        ma_long = close.rolling(window=params.ma_long).mean()
        
        # Buy when short > medium > long (all aligned)
        bullish = (ma_short > ma_medium) & (ma_medium > ma_long)
        prev_bullish = (ma_short.shift(1) > ma_medium.shift(1)) & (ma_medium.shift(1) > ma_long.shift(1))
        
        entries = bullish & ~prev_bullish
        
        # Sell when alignment breaks
        exits = ~bullish & prev_bullish
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["ma_short"] = ma_short
        signals_df["ma_medium"] = ma_medium
        signals_df["ma_long"] = ma_long
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_zscore_reversion(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Z-Score Mean Reversion: buy when oversold, sell when overbought."""
        close = df["close"]
        
        # Calculate rolling mean and std
        rolling_mean = close.rolling(window=params.zscore_window).mean()
        rolling_std = close.rolling(window=params.zscore_window).std()
        
        # Calculate z-score
        zscore = (close - rolling_mean) / rolling_std
        
        # Generate signals
        entries = (zscore < -params.zscore_threshold) & (zscore.shift(1) >= -params.zscore_threshold)
        exits = (zscore > params.zscore_threshold) & (zscore.shift(1) <= params.zscore_threshold)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["zscore"] = zscore
        signals_df["rolling_mean"] = rolling_mean
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_adx_trend(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """ADX Trend Following: buy when strong uptrend, sell when strong downtrend."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate True Range
        hl = high - low
        hc = abs(high - close.shift(1))
        lc = abs(low - close.shift(1))
        tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
        
        # Calculate Directional Movement
        plus_dm = high.diff()
        minus_dm = -low.diff()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        
        # Smooth the values
        atr = tr.rolling(window=params.adx_window).mean()
        plus_di = 100 * (plus_dm.rolling(window=params.adx_window).mean() / atr)
        minus_di = 100 * (minus_dm.rolling(window=params.adx_window).mean() / atr)
        
        # Calculate ADX
        dx = 100 * abs(plus_di - minus_di) / (plus_di + minus_di)
        adx = dx.rolling(window=params.adx_window).mean()
        
        # Generate signals: buy when ADX > threshold and +DI > -DI
        strong_trend = adx > params.adx_threshold
        bullish = plus_di > minus_di
        bearish = minus_di > plus_di
        
        entries = strong_trend & bullish & ~(strong_trend.shift(1) & bullish.shift(1))
        exits = strong_trend & bearish & ~(strong_trend.shift(1) & bearish.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["adx"] = adx
        signals_df["plus_di"] = plus_di
        signals_df["minus_di"] = minus_di
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_ichimoku(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Ichimoku Cloud: buy when price above cloud, sell when below."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Tenkan-sen (Conversion Line)
        tenkan_high = high.rolling(window=params.ichimoku_conversion).max()
        tenkan_low = low.rolling(window=params.ichimoku_conversion).min()
        tenkan_sen = (tenkan_high + tenkan_low) / 2
        
        # Kijun-sen (Base Line)
        kijun_high = high.rolling(window=params.ichimoku_base).max()
        kijun_low = low.rolling(window=params.ichimoku_base).min()
        kijun_sen = (kijun_high + kijun_low) / 2
        
        # Senkou Span A (Leading Span A)
        senkou_span_a = (tenkan_sen + kijun_sen) / 2
        senkou_span_a = senkou_span_a.shift(params.ichimoku_base)
        
        # Senkou Span B (Leading Span B)
        senkou_high = high.rolling(window=params.ichimoku_span_b).max()
        senkou_low = low.rolling(window=params.ichimoku_span_b).min()
        senkou_span_b = (senkou_high + senkou_low) / 2
        senkou_span_b = senkou_span_b.shift(params.ichimoku_base)
        
        # Cloud top and bottom
        cloud_top = pd.concat([senkou_span_a, senkou_span_b], axis=1).max(axis=1)
        cloud_bottom = pd.concat([senkou_span_a, senkou_span_b], axis=1).min(axis=1)
        
        # Generate signals
        # Buy when price crosses above cloud and tenkan > kijun
        above_cloud = close > cloud_top
        bullish_cross = (tenkan_sen > kijun_sen) & (tenkan_sen.shift(1) <= kijun_sen.shift(1))
        entries = above_cloud & bullish_cross
        
        # Sell when price crosses below cloud and tenkan < kijun
        below_cloud = close < cloud_bottom
        bearish_cross = (tenkan_sen < kijun_sen) & (tenkan_sen.shift(1) >= kijun_sen.shift(1))
        exits = below_cloud & bearish_cross
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["tenkan_sen"] = tenkan_sen
        signals_df["kijun_sen"] = kijun_sen
        signals_df["senkou_span_a"] = senkou_span_a
        signals_df["senkou_span_b"] = senkou_span_b
        signals_df["cloud_top"] = cloud_top
        signals_df["cloud_bottom"] = cloud_bottom
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_williams_r(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Williams %R: buy when oversold, sell when overbought."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate Williams %R
        highest_high = high.rolling(window=params.williams_period).max()
        lowest_low = low.rolling(window=params.williams_period).min()
        
        williams_r = -100 * ((highest_high - close) / (highest_high - lowest_low))
        
        # Generate signals
        entries = (williams_r < params.williams_buy_below) & (williams_r.shift(1) >= params.williams_buy_below)
        exits = (williams_r > params.williams_sell_above) & (williams_r.shift(1) <= params.williams_sell_above)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["williams_r"] = williams_r
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_cci_strategy(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """CCI (Commodity Channel Index): buy when oversold, sell when overbought."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate Typical Price
        typical_price = (high + low + close) / 3
        
        # Calculate CCI
        sma = typical_price.rolling(window=params.cci_window).mean()
        mad = typical_price.rolling(window=params.cci_window).apply(
            lambda x: np.abs(x - x.mean()).mean()
        )
        
        cci = (typical_price - sma) / (0.015 * mad)
        
        # Generate signals
        entries = (cci < params.cci_buy_below) & (cci.shift(1) >= params.cci_buy_below)
        exits = (cci > params.cci_sell_above) & (cci.shift(1) <= params.cci_sell_above)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["cci"] = cci
        signals_df["typical_price"] = typical_price
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_vwma_crossover(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """VWMA Crossover: buy when price crosses above VWMA."""
        close = df["close"]
        volume = df["volume"]
        
        # Calculate Volume Weighted Moving Average
        vwma = (close * volume).rolling(window=params.vwma_period).sum() / volume.rolling(window=params.vwma_period).sum()
        
        # Calculate regular SMA for comparison
        sma = close.rolling(window=params.vwma_period).mean()
        
        # Generate signals
        entries = (close > vwma) & (close.shift(1) <= vwma.shift(1))
        exits = (close < vwma) & (close.shift(1) >= vwma.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["vwma"] = vwma
        signals_df["sma"] = sma
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_donchian(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Donchian Channel Breakout: buy on upper breakout, sell on lower breakout."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Calculate Donchian Channels
        upper_band = high.rolling(window=params.donchian_period).max()
        lower_band = low.rolling(window=params.donchian_period).min()
        middle_band = (upper_band + lower_band) / 2
        
        # Generate signals
        entries = (close > upper_band) & (close.shift(1) <= upper_band.shift(1))
        exits = (close < lower_band) & (close.shift(1) >= lower_band.shift(1))
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["upper_band"] = upper_band
        signals_df["middle_band"] = middle_band
        signals_df["lower_band"] = lower_band
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_momentum(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Momentum Strategy: buy on positive momentum, sell on negative momentum."""
        close = df["close"]
        
        # Calculate momentum as percentage change
        momentum = close.pct_change(periods=params.momentum_period) * 100
        
        # Generate signals
        entries = (momentum > params.momentum_threshold) & (momentum.shift(1) <= params.momentum_threshold)
        exits = (momentum < -params.momentum_threshold) & (momentum.shift(1) >= -params.momentum_threshold)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["momentum"] = momentum
        signals_df["signal"] = "hold"
        signals_df.loc[entries, "signal"] = "buy"
        signals_df.loc[exits, "signal"] = "sell"
        
        return entries.fillna(False), exits.fillna(False), signals_df
    
    def _run_sr_reversion(
        self, 
        df: pd.DataFrame, 
        params: BacktestParams
    ) -> Tuple[pd.Series, pd.Series, pd.DataFrame]:
        """Support/Resistance Mean Reversion: buy at support, sell at resistance."""
        close = df["close"]
        high = df["high"]
        low = df["low"]
        
        # Identify support (local minima) and resistance (local maxima)
        support_levels = low.rolling(window=params.sr_lookback).min()
        resistance_levels = high.rolling(window=params.sr_lookback).max()
        
        # Calculate distance from support/resistance
        dist_to_support = (close - support_levels) / support_levels
        dist_to_resistance = (resistance_levels - close) / resistance_levels
        
        # Generate signals
        # Buy when price touches or gets close to support
        entries = (dist_to_support <= params.sr_touch_threshold) & (dist_to_support.shift(1) > params.sr_touch_threshold)
        
        # Sell when price touches or gets close to resistance
        exits = (dist_to_resistance <= params.sr_touch_threshold) & (dist_to_resistance.shift(1) > params.sr_touch_threshold)
        
        signals_df = pd.DataFrame(index=df.index)
        signals_df["support"] = support_levels
        signals_df["resistance"] = resistance_levels
        signals_df["dist_to_support"] = dist_to_support
        signals_df["dist_to_resistance"] = dist_to_resistance
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
