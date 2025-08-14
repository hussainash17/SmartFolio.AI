from datetime import datetime

import httpx
from sqlmodel import select

from app.core.db import get_session
from app.model import StockCompany, DailyOHLC

INSTRUMENTS_URL = "https://stocknow.com.bd/api/v1/instruments"
DAILY_URL = "https://stocknow.com.bd/api/v1/instruments?before={date}"

# Best-effort mapping from StockNow sector_id to sector names
SECTOR_ID_TO_NAME = {
    1: "Banking",
    2: "NBFI",
    3: "Fuel & Power",
    4: "Cement",
    5: "Ceramics",
    6: "Engineering",
    7: "Food & Allied",
    8: "IT",
    9: "Jute",
    10: "Miscellaneous",
    11: "Paper & Printing",
    12: "Pharmaceuticals & Chemicals",
    13: "Services & Real Estate",
    14: "Tannery",
    15: "Telecommunication",
    16: "Travel & Leisure",
    17: "Textiles",
    18: "Mutual Funds",
    19: "Insurance",
}


def _sector_name(value):
    try:
        if value is None:
            return "Unknown"
        if isinstance(value, int):
            return SECTOR_ID_TO_NAME.get(value, "Unknown")
        # if comes as string number
        if isinstance(value, str) and value.isdigit():
            return SECTOR_ID_TO_NAME.get(int(value), "Unknown")
        # otherwise assume already a name
        return value
    except Exception:
        return "Unknown"


def fetch_and_store_stocknow():
    # 1. Fetch instrument details
    instrument_resp = httpx.get(INSTRUMENTS_URL)
    instrument_data = instrument_resp.json()
    print(f"Fetched {len(instrument_data)} instruments from StockNow.")
    # 2. Fetch daily OHLC/trade data
    today = datetime.now().strftime("%Y-%m-%d")
    daily_resp = httpx.get(DAILY_URL.format(date=today))
    daily_data = daily_resp.json()

    with next(get_session()) as session:
        for code, details in instrument_data.items():
            # Skip if code is too long or contains spaces (likely not a stock symbol)
            if len(code) > 50 or ' ' in code:
                print(f"Skipping invalid symbol: '{code}' (too long or contains spaces)")
                continue
                
            # Use a default value for industry if missing or None
            industry_value = details.get("category") or "Unknown"
            sector_value = _sector_name(details.get("sector_id"))
            # Upsert company
            company = session.exec(select(StockCompany).where(StockCompany.symbol == code)).first()
            if not company:
                company = StockCompany(
                    symbol=code,
                    company_name=details.get("name"),
                    sector=sector_value,
                    industry=industry_value,
                    is_active=True,
                )
                session.add(company)
                session.commit()
                session.refresh(company)
            else:
                # Update company info if changed
                company.company_name = details.get("name")
                company.sector = sector_value
                company.industry = industry_value
                session.add(company)
                session.commit()

            # Upsert daily OHLC
            if code in daily_data:
                ohlc_info = daily_data[code]
                # Convert date string to datetime.date
                date_obj = datetime.strptime(ohlc_info["date"], "%Y-%m-%d").date()
                # Check if already exists
                ohlc = session.exec(
                    select(DailyOHLC).where(
                        DailyOHLC.company_id == company.id,
                        DailyOHLC.date == date_obj
                    )
                ).first()
                if not ohlc:
                    ohlc = DailyOHLC(
                        company_id=company.id,
                        date=date_obj,
                        open_price=ohlc_info["open"],
                        high=ohlc_info["high"],
                        low=ohlc_info["low"],
                        close_price=ohlc_info["close"],
                        volume=ohlc_info["volume"],
                        turnover=ohlc_info["value"],
                        trades_count=ohlc_info.get("trade") or ohlc_info.get("trades") or 0,
                        change=ohlc_info["close"] - ohlc_info["open"],
                        change_percent=((ohlc_info["close"] - ohlc_info["open"]) / ohlc_info["open"] * 100) if ohlc_info["open"] else 0,
                    )
                    session.add(ohlc)
        session.commit()
