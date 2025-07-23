import logging
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def clean_numeric_value(value: str) -> Optional[float]:
    """Remove commas and other formatting from numeric values and convert to float"""
    if not value or value.strip() == '':
        return None

    # Remove commas, parentheses, and other formatting
    cleaned = value.replace(",", "").replace("(", "").replace(")", "").strip()

    # Handle negative values (in parentheses)
    if value.startswith("(") and value.endswith(")"):
        cleaned = "-" + cleaned

    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        logger.warning(f"Could not convert '{value}' to float")
        return None


def fetch_stock_data() -> List[Dict]:
    """
    Fetches real-time stock data from DSE latest share price page
    Returns list of dicts with stock information
    """
    url = "https://dsebd.org/latest_share_price_scroll_by_ltp.php"

    try:
        response = requests.get(url)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        stocks_data = []

        # Find all rows in tbody
        for row in soup.find_all("tr"):
            cols = row.find_all("td")
            if len(cols) >= 11:  # Ensure we have all 11 columns
                stock_info = {
                    'serial': cols[0].get_text(strip=True),
                    'trading_code': cols[1].get_text(strip=True),
                    'ltp': clean_numeric_value(cols[2].get_text(strip=True)),
                    'high': clean_numeric_value(cols[3].get_text(strip=True)),
                    'low': clean_numeric_value(cols[4].get_text(strip=True)),
                    'closep': clean_numeric_value(cols[5].get_text(strip=True)),
                    'ycp': clean_numeric_value(cols[6].get_text(strip=True)),
                    'change_amount': clean_numeric_value(cols[7].get_text(strip=True)),
                    'trade_count': clean_numeric_value(cols[8].get_text(strip=True)),
                    'value_mn': clean_numeric_value(cols[9].get_text(strip=True)),
                    'volume': clean_numeric_value(cols[10].get_text(strip=True))
                }

                # Only add if we have a valid trading code
                if stock_info['trading_code']:
                    stocks_data.append(stock_info)

        logger.info(f"Successfully fetched {len(stocks_data)} stock records")
        return stocks_data

    except requests.RequestException as e:
        logger.error(f"Network error while fetching stock data: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while parsing stock data: {e}")
        raise


def fetch_stock_data_simple() -> List[Dict]:
    """
    Simplified version for testing - returns sample stock data
    """
    return [
        {
            "trading_code": "RECKITTBEN",
            "ltp": 45.50,
            "high": 46.20,
            "low": 45.00,
            "closep": 45.50,
            "ycp": 45.00,
            "change_amount": 0.50,
            "trade_count": 1250,
            "value_mn": 5.68,
            "volume": 125000
        },
        {
            "trading_code": "GP",
            "ltp": 125.80,
            "high": 126.50,
            "low": 125.20,
            "closep": 125.80,
            "ycp": 125.00,
            "change_amount": 0.80,
            "trade_count": 3200,
            "value_mn": 40.25,
            "volume": 320000
        },
        {
            "trading_code": "ROBI",
            "ltp": 28.90,
            "high": 29.10,
            "low": 28.70,
            "closep": 28.90,
            "ycp": 28.50,
            "change_amount": 0.40,
            "trade_count": 1800,
            "value_mn": 5.20,
            "volume": 180000
        }
    ]


def display_stock_data(stocks_data: List[Dict]) -> None:
    """Display stock data in a readable format"""
    if not stocks_data:
        logger.info("No stock data to display")
        return

    print(
        f"{'Code':<15} {'LTP':<10} {'High':<10} {'Low':<10} {'Close':<10} {'YCP':<10} {'Change':<10} {'Trade':<8} {'Value':<10} {'Volume':<12}")
    print("-" * 120)

    for stock in stocks_data[:10]:  # Show first 10 for preview
        print(
            f"{stock['trading_code']:<15} {stock['ltp']:<10.2f} {stock['high']:<10.2f} {stock['low']:<10.2f} "
            f"{stock['closep']:<10.2f} {stock['ycp']:<10.2f} {stock['change_amount']:<10.2f} "
            f"{stock['trade_count']:<8.0f} {stock['value_mn']:<10.2f} {stock['volume']:<12.0f}"
        )

    if len(stocks_data) > 10:
        print(f"... and {len(stocks_data) - 10} more stocks")
