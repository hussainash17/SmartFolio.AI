"""seed_dse_data

Revision ID: c706cbb4d1ab
Revises: ea5530c74046
Create Date: 2025-08-14 12:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from decimal import Decimal
from datetime import datetime, timedelta
import uuid

# Best-effort HTTP scraping with graceful fallback
try:
    import requests
    from bs4 import BeautifulSoup
except Exception:  # pragma: no cover
    requests = None
    BeautifulSoup = None


# revision identifiers, used by Alembic.
revision = "c706cbb4d1ab"
down_revision = "ea5530c74046"
branch_labels = None
depends_on = None


def _safe_decimal(value: float | int | str | None) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _now() -> datetime:
    return datetime.utcnow()


def _scrape_dse_companies() -> list[dict]:
    """Scrape trading codes and names from DSE. Fallback to static sample."""
    static = [
        {"trading_code": "GP", "full_name": "Grameenphone Limited", "sector": "Telecommunications", "industry": "Telecom Services"},
        {"trading_code": "ROBI", "full_name": "Robi Axiata Limited", "sector": "Telecommunications", "industry": "Telecom Services"},
        {"trading_code": "SQUARETEXT", "full_name": "Square Textiles Limited", "sector": "Textiles", "industry": "Textile Manufacturing"},
        {"trading_code": "RECKITTBEN", "full_name": "Reckitt Benckiser (Bangladesh) PLC", "sector": "Consumer Staples", "industry": "Household & Personal Products"},
        {"trading_code": "MARICO", "full_name": "Marico Bangladesh Limited", "sector": "Consumer Staples", "industry": "Personal Products"},
        {"trading_code": "BRACBANK", "full_name": "BRAC Bank Limited", "sector": "Financial Services", "industry": "Banks"},
        {"trading_code": "BXPHARMA", "full_name": "Beximco Pharmaceuticals Ltd.", "sector": "Healthcare", "industry": "Pharmaceuticals"},
        {"trading_code": "ACI", "full_name": "Advanced Chemical Industries Limited", "sector": "Industrials", "industry": "Conglomerates"},
        {"trading_code": "BATBC", "full_name": "British American Tobacco Bangladesh Company Ltd.", "sector": "Consumer Staples", "industry": "Tobacco"},
        {"trading_code": "WALTONHIL", "full_name": "Walton Hi-Tech Industries PLC", "sector": "Technology", "industry": "Consumer Electronics"},
    ]

    if requests is None or BeautifulSoup is None:
        return static

    try:
        url = "https://dsebd.org/company_listing.php"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        body = soup.find("div", class_="BodyContent")
        if not body:
            return static
        result: list[dict] = []
        for link in body.find_all("a", class_="ab1"):
            trading_code = (link.get_text(strip=True) or "").upper()
            if not trading_code:
                continue
            # Best-effort name extraction from sibling span
            full_name = trading_code
            sibling = link.next_sibling
            while sibling is not None:
                try:
                    if getattr(sibling, "name", None) == "span":
                        text = sibling.get_text(strip=True)
                        if text and text.startswith("(") and text.endswith(")"):
                            text = text[1:-1]
                        if text:
                            full_name = text
                        break
                except Exception:
                    break
                sibling = getattr(sibling, "next_sibling", None)

            # Assign a naive sector/industry guess (fallbacks)
            sector = "Unknown"
            industry = "Unknown"
            upper_name = f"{trading_code} {full_name}".upper()
            if any(k in upper_name for k in ["PHONE", "ROBI", "TELE", "TEL"]):
                sector, industry = "Telecommunications", "Telecom Services"
            elif any(k in upper_name for k in ["TEXT", "TEXTILE", "YARN"]):
                sector, industry = "Textiles", "Textile Manufacturing"
            elif any(k in upper_name for k in ["BANK", "FINANCE"]):
                sector, industry = "Financial Services", "Banks"
            elif any(k in upper_name for k in ["PHARMA", "PHARM"]):
                sector, industry = "Healthcare", "Pharmaceuticals"
            elif any(k in upper_name for k in ["TOBACCO", "BAT"]):
                sector, industry = "Consumer Staples", "Tobacco"
            elif any(k in upper_name for k in ["TECH", "ELECTR"]):
                sector, industry = "Technology", "Consumer Electronics"

            result.append({
                "trading_code": trading_code,
                "full_name": full_name,
                "sector": sector,
                "industry": industry,
            })
        # If parsing yields very few, fallback to static to ensure UI has data
        return result if len(result) >= 5 else static
    except Exception:
        return static


def _scrape_latest_prices() -> dict[str, dict]:
    """Scrape latest share prices; keyed by trading_code. Fallback to sample."""
    sample = {
        "RECKITTBEN": {
            "ltp": 45.50, "high": 46.20, "low": 45.00, "closep": 45.50, "ycp": 45.00,
            "change_amount": 0.50, "trade_count": 1250, "value_mn": 5.68, "volume": 125000,
        },
        "GP": {
            "ltp": 125.80, "high": 126.50, "low": 125.20, "closep": 125.80, "ycp": 125.00,
            "change_amount": 0.80, "trade_count": 3200, "value_mn": 40.25, "volume": 320000,
        },
        "ROBI": {
            "ltp": 28.90, "high": 29.10, "low": 28.70, "closep": 28.90, "ycp": 28.50,
            "change_amount": 0.40, "trade_count": 1800, "value_mn": 5.20, "volume": 180000,
        },
        "SQUARETEXT": {
            "ltp": 55.20, "high": 56.10, "low": 54.80, "closep": 55.00, "ycp": 54.20,
            "change_amount": 1.00, "trade_count": 2100, "value_mn": 8.10, "volume": 220000,
        },
        "MARICO": {
            "ltp": 250.00, "high": 252.00, "low": 248.00, "closep": 249.50, "ycp": 248.00,
            "change_amount": 2.00, "trade_count": 900, "value_mn": 12.50, "volume": 90000,
        },
        "BRACBANK": {
            "ltp": 48.60, "high": 49.10, "low": 48.10, "closep": 48.40, "ycp": 48.00,
            "change_amount": 0.60, "trade_count": 1500, "value_mn": 6.75, "volume": 160000,
        },
        "BXPHARMA": {
            "ltp": 125.10, "high": 126.30, "low": 124.50, "closep": 125.00, "ycp": 124.20,
            "change_amount": 0.90, "trade_count": 1750, "value_mn": 15.40, "volume": 140000,
        },
        "ACI": {
            "ltp": 300.00, "high": 303.00, "low": 297.00, "closep": 299.00, "ycp": 298.00,
            "change_amount": 1.50, "trade_count": 800, "value_mn": 10.20, "volume": 70000,
        },
        "BATBC": {
            "ltp": 520.00, "high": 525.00, "low": 515.00, "closep": 518.00, "ycp": 515.00,
            "change_amount": 5.00, "trade_count": 600, "value_mn": 20.50, "volume": 50000,
        },
        "WALTONHIL": {
            "ltp": 900.00, "high": 910.00, "low": 890.00, "closep": 895.00, "ycp": 890.00,
            "change_amount": 10.00, "trade_count": 450, "value_mn": 30.00, "volume": 35000,
        },
    }

    if requests is None or BeautifulSoup is None:
        return sample

    try:
        url = "https://dsebd.org/latest_share_price_scroll_by_ltp.php"
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        data: dict[str, dict] = {}
        for row in soup.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) >= 11:
                code = (cols[1].get_text(strip=True) or "").upper()
                if not code:
                    continue
                # Parse numeric helpers
                def _num(t: str) -> float | None:
                    if t is None:
                        return None
                    s = t.replace(",", "").replace("(", "-").replace(")", "").strip()
                    try:
                        return float(s)
                    except Exception:
                        return None
                d = {
                    "ltp": _num(cols[2].get_text(strip=True)),
                    "high": _num(cols[3].get_text(strip=True)),
                    "low": _num(cols[4].get_text(strip=True)),
                    "closep": _num(cols[5].get_text(strip=True)),
                    "ycp": _num(cols[6].get_text(strip=True)),
                    "change_amount": _num(cols[7].get_text(strip=True)),
                    "trade_count": _num(cols[8].get_text(strip=True)),
                    "value_mn": _num(cols[9].get_text(strip=True)),
                    "volume": _num(cols[10].get_text(strip=True)),
                }
                data[code] = d
        # If scraping failed to populate, use sample
        return data if len(data) >= 5 else sample
    except Exception:
        return sample


def upgrade():
    connection = op.get_bind()

    # 1) Companies (both legacy `company` and new `stockcompany`)
    companies = _scrape_dse_companies()

    # Insert into legacy `company` table for completeness (minimal fields)
    for c in companies:
        connection.execute(
            sa.text(
                """
                INSERT INTO company (name, trading_code)
                VALUES (:name, :trading_code)
                ON CONFLICT (trading_code) DO NOTHING
                """
            ),
            {"name": c["full_name"], "trading_code": c["trading_code"]},
        )

    # Insert into `stockcompany`
    for c in companies:
        params = {
            "id": str(uuid.uuid4()),
            "symbol": c["trading_code"],
            "company_name": c["full_name"],
            "sector": c.get("sector") or "Unknown",
            "industry": c.get("industry") or "Unknown",
            "is_active": True,
            "created_at": _now(),
            "updated_at": _now(),
        }
        connection.execute(
            sa.text(
                """
                INSERT INTO stockcompany (
                    id, symbol, company_name, sector, industry, is_active, created_at, updated_at
                ) VALUES (
                    :id, :symbol, :company_name, :sector, :industry, :is_active, :created_at, :updated_at
                )
                ON CONFLICT (symbol) DO NOTHING
                """
            ),
            params,
        )

    # Build symbol->id map
    symbol_to_id: dict[str, str] = {}
    for c in companies:
        sym = c["trading_code"]
        row = connection.execute(
            sa.text("SELECT id FROM stockcompany WHERE symbol = :s"), {"s": sym}
        ).first()
        if row and row[0]:
            symbol_to_id[sym] = str(row[0])

    # 2) Latest prices into `stockdata` and one tick into `intradaytick`
    prices = _scrape_latest_prices()
    total_trades = 0
    total_volume = 0
    total_turnover = Decimal(0)
    advancers = 0
    decliners = 0
    unchanged = 0

    for sym, pid in symbol_to_id.items():
        p = prices.get(sym)
        if not p:
            continue
        ltp = _safe_decimal(p.get("ltp")) or Decimal("0")
        ycp = _safe_decimal(p.get("ycp")) or Decimal("0")
        change_amount = _safe_decimal(p.get("change_amount")) or (ltp - ycp)
        change_percent = Decimal("0")
        if ycp and ycp != 0:
            try:
                change_percent = (ltp - ycp) / ycp * Decimal("100")
            except Exception:
                change_percent = Decimal("0")
        high = _safe_decimal(p.get("high")) or ltp
        low = _safe_decimal(p.get("low")) or ltp
        closep = _safe_decimal(p.get("closep")) or ltp
        openp = closep  # best-effort
        volume = int(p.get("volume") or 0)
        turnover = _safe_decimal(p.get("value_mn"))
        if turnover is not None:
            turnover = turnover * Decimal("1000000")  # convert Mn to units
        else:
            turnover = Decimal("0")
        trades_count = int(p.get("trade_count") or 0)

        total_trades += trades_count
        total_volume += volume
        total_turnover += turnover
        if change_amount > 0:
            advancers += 1
        elif change_amount < 0:
            decliners += 1
        else:
            unchanged += 1

        connection.execute(
            sa.text(
                """
                INSERT INTO stockdata (
                    id, company_id, last_trade_price, change, change_percent, high, low, open_price,
                    previous_close, volume, turnover, trades_count, timestamp
                ) VALUES (
                    :id, :company_id, :last_trade_price, :change, :change_percent, :high, :low, :open_price,
                    :previous_close, :volume, :turnover, :trades_count, :timestamp
                )
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "company_id": pid,
                "last_trade_price": ltp,
                "change": change_amount,
                "change_percent": change_percent,
                "high": high,
                "low": low,
                "open_price": openp,
                "previous_close": ycp,
                "volume": volume,
                "turnover": turnover,
                "trades_count": trades_count,
                "timestamp": _now(),
            },
        )

        # Optional intraday tick so 1D chart has at least one point
        connection.execute(
            sa.text(
                """
                INSERT INTO intradaytick (id, company_id, price, volume, timestamp)
                VALUES (:id, :company_id, :price, :volume, :timestamp)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "company_id": pid,
                "price": ltp,
                "volume": volume,
                "timestamp": _now(),
            },
        )

    # 3) Generate 30 days of Daily OHLC for first 5 symbols
    selected_symbols = list(symbol_to_id.keys())[:5]
    for sym in selected_symbols:
        pid = symbol_to_id[sym]
        base = prices.get(sym, {})
        base_close = float(base.get("closep") or base.get("ltp") or 100.0)
        for i in range(30):
            day = _now() - timedelta(days=i)
            # Simple synthetic series with small drift and noise
            open_px = base_close + (i * 0.05) + ((i % 3) - 1) * 0.5
            high_px = open_px + 1.5 + (i % 5) * 0.1
            low_px = open_px - 1.2 - (i % 4) * 0.1
            close_px = open_px + ((i % 7) - 3) * 0.3
            vol = 100000 + (i % 10) * 10000
            trn = Decimal(str(round(vol * close_px, 2)))
            chg = Decimal(str(round(close_px - open_px, 2)))
            chg_pct = Decimal("0")
            try:
                chg_pct = Decimal(str(round(((close_px - open_px) / open_px) * 100, 2)))
            except Exception:
                chg_pct = Decimal("0")

            connection.execute(
                sa.text(
                    """
                    INSERT INTO dailyohlc (
                        id, company_id, date, open_price, high, low, close_price, volume, turnover,
                        trades_count, change, change_percent
                    ) VALUES (
                        :id, :company_id, :date, :open_price, :high, :low, :close_price, :volume, :turnover,
                        :trades_count, :change, :change_percent
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "company_id": pid,
                    "date": day.replace(hour=0, minute=0, second=0, microsecond=0),
                    "open_price": Decimal(str(round(open_px, 2))),
                    "high": Decimal(str(round(high_px, 2))),
                    "low": Decimal(str(round(low_px, 2))),
                    "close_price": Decimal(str(round(close_px, 2))),
                    "volume": vol,
                    "turnover": trn,
                    "trades_count": 1000 + (i % 5) * 200,
                    "change": chg,
                    "change_percent": chg_pct,
                },
            )

    # 4) Insert a Market Summary snapshot
    connection.execute(
        sa.text(
            """
            INSERT INTO marketsummary (
                id, date, total_trades, total_volume, total_turnover, dse_index, dse_index_change,
                dse_index_change_percent, cse_index, cse_index_change, cse_index_change_percent,
                advancers, decliners, unchanged, timestamp
            ) VALUES (
                :id, :date, :total_trades, :total_volume, :total_turnover, :dse_index, :dse_index_change,
                :dse_index_change_percent, :cse_index, :cse_index_change, :cse_index_change_percent,
                :advancers, :decliners, :unchanged, :timestamp
            )
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "date": _now(),
            "total_trades": total_trades,
            "total_volume": total_volume,
            "total_turnover": total_turnover,
            "dse_index": None,
            "dse_index_change": None,
            "dse_index_change_percent": None,
            "cse_index": None,
            "cse_index_change": None,
            "cse_index_change_percent": None,
            "advancers": advancers,
            "decliners": decliners,
            "unchanged": unchanged,
            "timestamp": _now(),
        },
    )


def downgrade():
    connection = op.get_bind()

    # Symbols we may have inserted
    symbols = [
        "GP", "ROBI", "SQUARETEXT", "RECKITTBEN", "MARICO",
        "BRACBANK", "BXPHARMA", "ACI", "BATBC", "WALTONHIL",
    ]

    # Remove dependent data first
    connection.execute(
        sa.text(
            "DELETE FROM stockdata WHERE company_id IN (SELECT id FROM stockcompany WHERE symbol = ANY(:syms))"
        ),
        {"syms": symbols},
    )
    connection.execute(
        sa.text(
            "DELETE FROM intradaytick WHERE company_id IN (SELECT id FROM stockcompany WHERE symbol = ANY(:syms))"
        ),
        {"syms": symbols},
    )
    connection.execute(
        sa.text(
            "DELETE FROM dailyohlc WHERE company_id IN (SELECT id FROM stockcompany WHERE symbol = ANY(:syms))"
        ),
        {"syms": symbols},
    )

    # Best-effort remove most recent marketsummary we added (may not be exact)
    connection.execute(
        sa.text(
            "DELETE FROM marketsummary WHERE timestamp >= :cutoff"
        ),
        {"cutoff": _now() - timedelta(days=1)},
    )

    # Remove stock companies
    connection.execute(
        sa.text("DELETE FROM stockcompany WHERE symbol = ANY(:syms)"), {"syms": symbols}
    )

    # Remove legacy companies
    connection.execute(
        sa.text("DELETE FROM company WHERE trading_code = ANY(:syms)"), {"syms": symbols}
    )