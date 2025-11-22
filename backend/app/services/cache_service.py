from datetime import datetime, timedelta, date
from typing import Callable, Optional

from sqlmodel import Session, select, and_

from app.model.performance import PortfolioPerformanceCache


def _build_base_query(
    session: Session,
    portfolio_id: str,
    period: str,
    benchmark_id: Optional[str],
    calculation_date: date,
):
    query = select(PortfolioPerformanceCache).where(
        and_(
            PortfolioPerformanceCache.portfolio_id == portfolio_id,
            PortfolioPerformanceCache.period == period,
            PortfolioPerformanceCache.calculation_date == calculation_date,
        )
    )

    if benchmark_id is None:
        query = query.where(PortfolioPerformanceCache.benchmark_id.is_(None))
    else:
        query = query.where(PortfolioPerformanceCache.benchmark_id == benchmark_id)

    return query


def get_cache_entry(
    session: Session,
    portfolio_id: str,
    period: str,
    benchmark_id: Optional[str],
    calculation_date: date,
    ttl_seconds: int = 900,
):
    cutoff_time = datetime.utcnow() - timedelta(seconds=ttl_seconds)

    query = _build_base_query(session, portfolio_id, period, benchmark_id, calculation_date)
    entry = session.exec(query).first()

    if not entry:
        return None

    if entry.created_at and entry.created_at >= cutoff_time:
        return entry

    return None


def store_cache_entry(
    session: Session,
    portfolio_id: str,
    period: str,
    benchmark_id: Optional[str],
    calculation_date: date,
    cache_type: str,
    metrics_data: dict,
):
    query = _build_base_query(session, portfolio_id, period, benchmark_id, calculation_date)
    existing = session.exec(query).first()

    if existing:
        metrics = existing.metrics or {}
        metrics[cache_type] = metrics_data
        existing.metrics = metrics
        existing.created_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    new_entry = PortfolioPerformanceCache(
        portfolio_id=portfolio_id,
        period=period,
        benchmark_id=benchmark_id,
        calculation_date=calculation_date,
        metrics={cache_type: metrics_data},
        created_at=datetime.utcnow(),
    )
    session.add(new_entry)
    session.commit()
    session.refresh(new_entry)
    return new_entry


def get_db_cached_or_compute(
    session: Session,
    portfolio_id: str,
    period: str,
    benchmark_id: Optional[str],
    cache_type: str,
    compute_fn: Callable[[], dict],
    ttl_seconds: int = 900,
):
    calculation_date = date.today()

    try:
        cached = get_cache_entry(
            session=session,
            portfolio_id=portfolio_id,
            period=period,
            benchmark_id=benchmark_id,
            calculation_date=calculation_date,
            ttl_seconds=ttl_seconds,
        )
    except Exception:
        cached = None

    if cached and isinstance(cached.metrics, dict):
        metrics = cached.metrics
        if cache_type in metrics:
            return metrics[cache_type]
        if metrics:
            return metrics

    result = compute_fn()

    try:
        store_cache_entry(
            session=session,
            portfolio_id=portfolio_id,
            period=period,
            benchmark_id=benchmark_id,
            calculation_date=calculation_date,
            cache_type=cache_type,
            metrics_data=result,
        )
    except Exception:
        # If DB fails, still return computed result
        pass

    return result

