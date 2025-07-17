import requests
from bs4 import BeautifulSoup

def fetch_dse_company_list() -> list[dict[str, str]]:
    """
    Fetches the company list from DSE and returns a list of dicts with columns:
    trading_code, ltp, high, low, closep, ycp, change, trade, value_mn, volume
    """
    url = "https://dsebd.org/latest_share_price_scroll_by_ltp.php"
    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table")
    if not table:
        raise ValueError("No table found on DSE page")
    rows = table.find_all("tr")[1:]  # skip header
    companies = []
    for row in rows:
        cols = [col.get_text(strip=True) for col in row.find_all("td")]
        if len(cols) < 11:
            continue  # skip incomplete rows
        companies.append({
            "trading_code": cols[1],
            "ltp": cols[2],
            "high": cols[3],
            "low": cols[4],
            "closep": cols[5],
            "ycp": cols[6],
            "change": cols[7],
            "trade": cols[8],
            "value_mn": cols[9],
            "volume": cols[10],
        })
    return companies 