"""
Backtest API routes for strategy backtesting.
"""
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.model.backtest import BacktestRequest, BacktestResponse
from app.services.backtest_service import BacktestService

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(
    request: BacktestRequest,
    session: SessionDep,
    current_user: CurrentUser
) -> BacktestResponse:
    """
    Execute a strategy backtest on historical data.
    
    Supports the following strategies:
    - **buy_hold**: Buy at start, hold until end
    - **sma**: Simple Moving Average crossover
    - **ema**: Exponential Moving Average crossover
    - **rsi**: RSI overbought/oversold signals
    - **bbands**: Bollinger Bands mean reversion
    - **macd**: MACD/Signal line crossover
    
    Returns performance metrics, equity curve, and trade records.
    """
    try:
        service = BacktestService(session)
        result = service.run_backtest(request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backtest execution failed: {str(e)}"
        )
