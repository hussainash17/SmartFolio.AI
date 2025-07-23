import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict

logger = logging.getLogger(__name__)


def fetch_company_names() -> List[Dict[str, str]]:
    """
    Fetches company names from DSE company listing page
    Returns list of dicts with trading_code and full_name
    """
    url = "https://dsebd.org/company_listing.php"
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Find the body content div
        body_content = soup.find("div", class_="BodyContent")
        if not body_content:
            logger.error("Could not find BodyContent div")
            return []
        
        companies = []
        
        # Find all company links with class "ab1"
        company_links = body_content.find_all("a", class_="ab1")
        
        for link in company_links:
            try:
                # Get trading code from link text
                trading_code = link.get_text(strip=True)
                
                if not trading_code:
                    continue
                
                # Find the next sibling span that contains the full company name
                full_name = ""
                next_element = link.next_sibling
                
                # Look for the span with the full company name
                while next_element:
                    if hasattr(next_element, 'name') and next_element.name == 'span':
                        full_name = next_element.get_text(strip=True)
                        # Remove parentheses and clean up
                        if full_name.startswith('(') and full_name.endswith(')'):
                            full_name = full_name[1:-1]  # Remove parentheses
                        break
                    next_element = next_element.next_sibling
                
                # If no span found, use trading code as full name
                if not full_name:
                    full_name = trading_code
                
                company_data = {
                    "trading_code": trading_code,
                    "full_name": full_name
                }
                
                companies.append(company_data)
                print(f"Found company: {trading_code} - {full_name}")
                
            except Exception as e:
                logger.warning(f"Error processing company link: {e}")
                continue
        
        logger.info(f"Successfully extracted {len(companies)} company names")
        return companies
        
    except requests.RequestException as e:
        logger.error(f"Network error while fetching company names: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error while parsing company names: {e}")
        raise


def fetch_company_names_simple() -> List[Dict[str, str]]:
    """
    Simplified version for testing - returns sample company names
    """
    return [
        {"trading_code": "RECKITTBEN", "full_name": "Reckitt Benckiser (Bangladesh) PLC"},
        {"trading_code": "MARICO", "full_name": "Marico Bangladesh Limited"},
        {"trading_code": "SQUARETEXT", "full_name": "Square Textiles Limited"},
        {"trading_code": "GP", "full_name": "Grameenphone Limited"},
        {"trading_code": "ROBI", "full_name": "Robi Axiata Limited"},
    ]
