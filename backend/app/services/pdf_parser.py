"""PDF Portfolio Statement Parser Service"""
import io
import re
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Optional, List, Dict, Tuple

import pdfplumber
import PyPDF2
from fastapi import UploadFile, HTTPException, status
from sqlmodel import Session, select

from app.model.portfolio_statement import (
    ClientInfo,
    HoldingItem,
    PortfolioStatementResponse,
    ParsedStatementData,
)
from app.model.company import Company


class PortfolioStatementParser:
    """Parser for portfolio statement PDFs"""

    def __init__(self, session: Optional[Session] = None):
        self.max_file_size = 10 * 1024 * 1024  # 10MB
        self.supported_formats = ["application/pdf", "application/x-pdf"]
        self.broker_patterns = {
            'lankabangla': ['LankaBangla Securities', 'lankabd.com', 'lankabangla'],
            'doha': ['Doha Securities', 'dohasecurities.com', 'Doha'],
        }
        self.session = session

    async def parse_pdf_statement(
        self, file: UploadFile, broker_house: Optional[str] = None
    ) -> PortfolioStatementResponse:
        """
        Parse a portfolio statement PDF and extract holdings data
        
        Args:
            file: Uploaded PDF file
            broker_house: (Optional) Specific broker to use for parsing.
                         Options: 'lankabangla', 'doha', 'generic'
                         If None, will attempt to auto-detect from PDF content.
            
        Returns:
            PortfolioStatementResponse with parsed data
            
        Raises:
            HTTPException: If file validation or parsing fails
        """
        # Validate file
        await self._validate_file(file)
        
        # Read file content
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        # Parse PDF with broker hint
        parsed_data = await self._extract_pdf_data(content, broker_house=broker_house)
        
        # Validate and structure the parsed data
        statement = self._validate_and_structure(parsed_data)
        
        return statement

    async def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file"""
        # Check file type
        if file.content_type not in self.supported_formats:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format. Expected PDF, got {file.content_type}",
            )
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed size of {self.max_file_size / 1024 / 1024}MB",
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty",
            )

    async def _extract_pdf_data(self, content: bytes, broker_house: Optional[str] = None) -> ParsedStatementData:
        """Extract text and data from PDF"""
        try:
            pdf_file = io.BytesIO(content)
            full_text = ""
            tables = []
            
            # Try pdfplumber first (preferred)
            try:
                with pdfplumber.open(pdf_file) as pdf:
                    # Extract text from all pages
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            full_text += page_text + "\n"
                        
                        # Extract tables
                        page_tables = page.extract_tables()
                        if page_tables:
                            tables.extend(page_tables)
            except Exception as e:
                print(f"pdfplumber extraction failed, trying PyPDF2: {e}")
                # Fallback to PyPDF2
                pdf_file.seek(0)
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += page_text + "\n"
            
            if not full_text.strip():
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Could not extract text from PDF. File may be corrupted or image-based.",
                )
            
            # Parse the extracted data with broker-specific logic
            return self._parse_statement_text(full_text, tables, content, broker_house=broker_house)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to parse PDF: {str(e)}",
            )

    def _parse_statement_text(
        self, text: str, tables: List[List[List[str]]], content: bytes = None, broker_house: Optional[str] = None
    ) -> ParsedStatementData:
        """Parse extracted text and tables to extract statement data"""
        warnings = []
        
        # Determine broker to use
        if broker_house:
            # Use specified broker
            broker = broker_house.lower()
            print(f"Using specified broker: {broker}")
        else:
            # Auto-detect broker
            broker = self._detect_broker(text)
            print(f"Auto-detected broker: {broker}")
        
        # Extract client info
        client_info = self._extract_client_info(text)
        if not client_info:
            warnings.append("Could not extract complete client information")
        
        # Extract holdings using broker-specific parsers
        holdings = []
        
        if broker == 'lankabangla':
            # Try table extraction first
            if content:
                holdings = self._parse_lankabangla_table(content)
            if not holdings:
                holdings = self._parse_lankabangla_text(text)
        elif broker == 'doha':
            holdings = self._parse_doha_text(text)
        elif broker == 'generic':
            # Generic parsing
            holdings = self._extract_holdings_from_tables(tables)
            if not holdings:
                holdings = self._extract_holdings_from_text(text)
        else:
            # Unknown broker - try generic
            warnings.append(f"Unknown broker '{broker}', using generic parser")
            holdings = self._extract_holdings_from_tables(tables)
            if not holdings:
                holdings = self._extract_holdings_from_text(text)
        
        if not holdings:
            warnings.append("No holdings found in the statement")
        
        # Calculate confidence based on what we found
        confidence = self._calculate_parsing_confidence(client_info, holdings)
        
        return ParsedStatementData(
            raw_text=text,
            client_info=client_info,
            holdings=holdings,
            parsing_confidence=confidence,
            parsing_warnings=warnings,
        )
    
    def _detect_broker(self, text: str) -> str:
        """Detect broker from PDF text"""
        text_lower = text.lower()
        
        for broker, patterns in self.broker_patterns.items():
            if any(pattern.lower() in text_lower for pattern in patterns):
                return broker
        
        return 'generic'

    def _extract_client_info(self, text: str) -> Optional[ClientInfo]:
        """Extract client information from statement text"""
        try:
            # Debug: Print first 1000 characters
            print("=" * 80)
            print("PDF TEXT SAMPLE (first 1000 chars):")
            print(text[:1000])
            print("=" * 80)
            
            # Client Code / Investor Code / Portfolio
            # More specific pattern to avoid matching "STATEMENT"
            client_code_match = re.search(
                r"(?:Client\s+Code|Investor\s+Code|Account\s+No)[:\s]+([A-Z]?\d+[A-Z0-9]*)",
                text,
                re.IGNORECASE,
            )
            
            # Alternative: Look for "Portfolio_00480" pattern in text or filename
            if not client_code_match:
                client_code_match = re.search(r"Portfolio[_\s]*(\d+)", text, re.IGNORECASE)
            
            # Another alternative: Find 5+ digit numbers that could be account numbers
            if not client_code_match:
                client_code_match = re.search(r"\b([A-Z]?\d{5,})\b", text)
            
            # BO ID
            bo_id_match = re.search(
                r"(?:BO\s+ID|BO\s+No|BO\s*:)\s*(\d{10,})",
                text,
                re.IGNORECASE,
            )
            
            # Name - more flexible pattern
            name_match = re.search(
                r"(?:Name|Client\s+Name)[:\s]+([A-Z][A-Z\s\.]+?)(?:\n|Date|Mobile|A/C Type|Investor)",
                text,
                re.IGNORECASE,
            )
            
            # Statement Date - support multiple formats including "13-Aug-2025"
            date_match = re.search(
                r"(?:As\s+On|Statement\s+Date|Date|OnDate)[:\s_]*([\d]{1,2}[-/]\w{3,9}[-/][\d]{4}|[\d]{1,2}[-/][\d]{1,2}[-/][\d]{2,4})",
                text,
                re.IGNORECASE,
            )
            
            # Account Type - handle "Non Margin", "Margin", "CASH" etc
            acc_type_match = re.search(
                r"(?:A/C\s+Type|Account\s+Type)[:\s]+(Non\s+Margin|Margin|CASH|TRADING)",
                text,
                re.IGNORECASE,
            )
            
            # Debug output
            print(f"Client Code: {client_code_match.group(1) if client_code_match else 'NOT FOUND'}")
            print(f"BO ID: {bo_id_match.group(1) if bo_id_match else 'NOT FOUND'}")
            print(f"Name: {name_match.group(1) if name_match else 'NOT FOUND'}")
            print(f"Date: {date_match.group(1) if date_match else 'NOT FOUND'}")
            print(f"Account Type: {acc_type_match.group(1) if acc_type_match else 'NOT FOUND'}")
            
            # If we don't have at least client code or BO ID, return a minimal ClientInfo
            # This allows holdings extraction to still work
            client_code = (
                client_code_match.group(1).strip() if client_code_match
                else bo_id_match.group(1).strip() if bo_id_match
                else "00000"  # Default value instead of failing
            )
            
            statement_date = date.today()
            if date_match:
                date_str = date_match.group(1)
                statement_date = self._parse_date(date_str)
                print(f"Parsed date: {statement_date}")
            
            client_info = ClientInfo(
                client_code=client_code,
                bo_id=bo_id_match.group(1).strip() if bo_id_match else "",
                name=name_match.group(1).strip() if name_match else "Account Holder",
                statement_date=statement_date,
                account_type=acc_type_match.group(1).strip() if acc_type_match else "CASH",
            )
            
            print(f"✓ Extracted client info: {client_info.client_code}")
            return client_info
            
        except Exception as e:
            print(f"Error extracting client info: {e}")
            import traceback
            traceback.print_exc()
            # Return minimal client info instead of None to allow holdings extraction
            return ClientInfo(
                client_code="00000",
                bo_id="",
                name="Account Holder",
                statement_date=date.today(),
                account_type="CASH",
            )

    def _extract_holdings_from_tables(
        self, tables: List[List[List[str]]]
    ) -> List[dict]:
        """Extract holdings from PDF tables"""
        holdings = []
        
        for table in tables:
            if not table or len(table) < 2:
                continue
            
            # Find the header row
            header_idx = self._find_holdings_header(table)
            if header_idx == -1:
                continue
            
            # Extract column mappings
            headers = [str(h).lower().strip() if h else "" for h in table[header_idx]]
            col_map = self._map_table_columns(headers)
            
            if not col_map.get("symbol") and not col_map.get("company"):
                continue  # Not a holdings table
            
            # Extract data rows
            for row_idx in range(header_idx + 1, len(table)):
                row = table[row_idx]
                if not row or len(row) < 3:
                    continue
                
                holding = self._extract_holding_from_row(row, col_map)
                if holding:
                    holdings.append(holding)
        
        return holdings

    def _find_holdings_header(self, table: List[List[str]]) -> int:
        """Find the row containing holdings table headers"""
        for idx, row in enumerate(table):
            row_text = " ".join([str(cell).lower() for cell in row if cell])
            # Check for common header patterns
            if any(
                keyword in row_text
                for keyword in [
                    "symbol",
                    "stock",
                    "company",
                    "quantity",
                    "shares",
                    "market value",
                ]
            ):
                return idx
        return -1

    def _map_table_columns(self, headers: List[str]) -> Dict[str, int]:
        """Map column names to indices"""
        col_map = {}
        
        for idx, header in enumerate(headers):
            header = header.lower().strip()
            
            # Symbol/Trading Code
            if any(k in header for k in ["symbol", "code", "script", "stock"]):
                col_map["symbol"] = idx
            
            # Company Name
            elif any(k in header for k in ["company", "name", "security"]):
                if "symbol" not in col_map:  # Avoid overwriting symbol
                    col_map["company"] = idx
            
            # Quantity
            elif any(k in header for k in ["quantity", "qty", "shares", "units"]):
                col_map["quantity"] = idx
            
            # Cost Price / Average Price
            elif any(k in header for k in ["cost", "average", "avg", "purchase"]):
                col_map["cost_price"] = idx
            
            # Market Price / Current Price / LTP
            elif any(k in header for k in ["market price", "current price", "ltp", "last traded"]):
                col_map["market_price"] = idx
            
            # Market Value / Current Value
            elif any(k in header for k in ["market value", "current value", "value"]):
                col_map["market_value"] = idx
            
            # Gain/Loss
            elif any(k in header for k in ["gain", "loss", "p/l", "p&l", "profit"]):
                if "%" in header or "percent" in header:
                    col_map["gain_loss_percent"] = idx
                else:
                    col_map["gain_loss"] = idx
        
        return col_map

    def _extract_holding_from_row(
        self, row: List[str], col_map: Dict[str, int]
    ) -> Optional[dict]:
        """Extract a single holding from a table row"""
        try:
            # Get symbol
            symbol_idx = col_map.get("symbol", col_map.get("company"))
            if symbol_idx is None or symbol_idx >= len(row):
                return None
            
            symbol = str(row[symbol_idx]).strip()
            if not symbol or symbol.lower() in ["total", "subtotal", ""]:
                return None
            
            # Get company name
            company_idx = col_map.get("company", col_map.get("symbol"))
            company_name = str(row[company_idx]).strip() if company_idx is not None and company_idx < len(row) else symbol
            
            # Extract numeric values
            quantity = self._safe_extract_number(row, col_map.get("quantity"), default=0, is_int=True)
            cost_price = self._safe_extract_number(row, col_map.get("cost_price"), default=0.0)
            market_price = self._safe_extract_number(row, col_map.get("market_price"), default=0.0)
            market_value = self._safe_extract_number(row, col_map.get("market_value"), default=0.0)
            gain_loss = self._safe_extract_number(row, col_map.get("gain_loss"), default=0.0)
            gain_loss_percent = self._safe_extract_number(row, col_map.get("gain_loss_percent"), default=0.0)
            
            # Calculate missing values if possible
            if quantity > 0:
                if market_value == 0.0 and market_price > 0:
                    market_value = quantity * market_price
                
                if gain_loss == 0.0 and cost_price > 0:
                    cost_value = quantity * cost_price
                    gain_loss = market_value - cost_value
                
                if gain_loss_percent == 0.0 and cost_price > 0:
                    cost_value = quantity * cost_price
                    if cost_value > 0:
                        gain_loss_percent = (gain_loss / cost_value) * 100
            
            return {
                "symbol": symbol.upper(),
                "company_name": company_name,
                "quantity": quantity,
                "cost_price": float(cost_price),
                "market_price": float(market_price),
                "market_value": float(market_value),
                "unrealized_gain_loss": float(gain_loss),
                "unrealized_gain_loss_percent": float(gain_loss_percent),
            }
            
        except Exception as e:
            print(f"Error extracting holding from row: {e}")
            return None

    def _safe_extract_number(
        self, row: List[str], col_idx: Optional[int], default: float = 0.0, is_int: bool = False
    ) -> float:
        """Safely extract and parse a number from a table cell"""
        if col_idx is None or col_idx >= len(row):
            return default
        
        try:
            value_str = str(row[col_idx]).strip()
            # Remove common formatting characters
            value_str = value_str.replace(",", "").replace("(", "-").replace(")", "")
            value_str = re.sub(r"[^\d.-]", "", value_str)
            
            if not value_str or value_str == "-":
                return default
            
            value = float(value_str)
            return int(value) if is_int else value
            
        except (ValueError, InvalidOperation):
            return default

    def _parse_lankabangla_table(self, content: bytes) -> List[dict]:
        """Parse LankaBangla using table extraction"""
        holdings = []
        
        try:
            pdf_file = io.BytesIO(content)
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    tables = page.extract_tables()
                    
                    for table in tables:
                        if not table or len(table) < 2:
                            continue
                        
                        header_row = ' '.join([str(cell) for cell in table[0] if cell])
                        if 'Company Name' not in header_row and 'Saleable' not in header_row:
                            continue
                        
                        # Process data rows
                        for row in table[1:]:
                            if not row or len(row) < 8:
                                continue
                            
                            row_str = ' '.join([str(cell) for cell in row if cell])
                            if 'Total:' in row_str or not any(cell for cell in row):
                                continue
                            
                            try:
                                # Find company name
                                company_name = None
                                for cell in row:
                                    if cell and any(kw in str(cell) for kw in ['Ltd.', 'PLC', 'Limited', 'ALUMUNIUM', 'Bank', 'Insurance']):
                                        company_name = str(cell).strip().lstrip('*')
                                        break
                                
                                if not company_name:
                                    continue
                                
                                # Extract numeric values
                                row_values = []
                                for cell in row:
                                    if cell and cell != company_name:
                                        try:
                                            val = self._safe_parse_number(str(cell))
                                            if val != 0 or str(cell).strip() == '0':
                                                row_values.append(val)
                                        except:
                                            pass
                                
                                if len(row_values) >= 7:
                                    saleable_qty = int(row_values[0]) if row_values[0] < 1000000 else 0
                                    cost_amount = row_values[1]
                                    market_price = row_values[2]
                                    unrealized_gain = row_values[3]
                                    percent_gain = row_values[4]
                                    market_value = row_values[5]
                                    
                                    # Find total quantity
                                    total_qty = saleable_qty
                                    for val in row_values[-4:]:
                                        if val == int(val) and 0 < val < 100000:
                                            total_qty = int(val)
                                            break
                                    
                                    cost_price = cost_amount / total_qty if total_qty > 0 else 0
                                    
                                    holdings.append({
                                        "symbol": company_name[:50],  # Limit length
                                        "company_name": company_name,
                                        "quantity": total_qty,
                                        "cost_price": round(cost_price, 2),
                                        "market_price": round(market_price, 2),
                                        "market_value": round(market_value, 2),
                                        "unrealized_gain_loss": round(unrealized_gain, 2),
                                        "unrealized_gain_loss_percent": round(percent_gain, 2),
                                    })
                                    print(f"✓ Parsed (LankaBangla table): {company_name} - Qty: {total_qty}")
                            
                            except Exception as e:
                                print(f"Error parsing LankaBangla row: {e}")
                                continue
        
        except Exception as e:
            print(f"LankaBangla table extraction failed: {e}")
            return []
        
        return holdings
    
    def _parse_lankabangla_text(self, text: str) -> List[dict]:
        """Parse LankaBangla Securities text format"""
        holdings = []
        lines = text.split('\n')
        
        for line in lines:
            # Skip header and summary lines
            if any(skip in line.upper() for skip in ['COMPANY NAME', 'TOTAL:', 'SECTOR', 'DEPOSIT', 'WITHDRAW', 'ACCOUNT STATUS', 'AVAILABLE BALANCE']):
                continue
            
            # Look for company names with * prefix or containing keywords
            # Pattern matches: *Company Name or Company Name followed by numbers
            company_pattern = r'^\*?([A-Z][A-Za-z\s&\.\-]+(?:Ltd\.|PLC|Limited|ALUMUNIUM|Bank|Insurance|Hotel))'
            match = re.search(company_pattern, line.strip())
            
            if match:
                try:
                    symbol = match.group(1).strip().lstrip('*')
                    
                    # Extract all numbers after the company name
                    after_company = line[match.end():]
                    numbers = re.findall(r'-?\d+(?:,\d+)*(?:\.\d+)?', after_company)
                    
                    # Debug output
                    print(f"Found company: {symbol}")
                    print(f"Numbers found: {numbers}")
                    
                    # Need at least 8 numbers for a valid holding
                    # Format: Saleable Lock Lien Total Cost-Amt Cost-Price Market-Val Market-Price %Port UnrealGain %Gain
                    if len(numbers) >= 8:
                        nums = [self._safe_parse_number(n) for n in numbers]
                        
                        # Parse based on position
                        saleable_qty = int(nums[0]) if nums[0] < 1000000 else 0
                        lock_qty = int(nums[1]) if len(nums) > 1 else 0
                        lien_qty = int(nums[2]) if len(nums) > 2 else 0
                        total_qty = int(nums[3]) if len(nums) > 3 else saleable_qty
                        
                        # Financial data
                        cost_amount = nums[4] if len(nums) > 4 else 0
                        cost_price = nums[5] if len(nums) > 5 else 0
                        market_value = nums[6] if len(nums) > 6 else 0
                        market_price = nums[7] if len(nums) > 7 else 0
                        percent_portfolio = nums[8] if len(nums) > 8 else 0
                        unrealized_gain = nums[9] if len(nums) > 9 else 0
                        percent_gain = nums[10] if len(nums) > 10 else 0
                        
                        # If cost_price is very small and cost_amount exists, recalculate
                        if total_qty > 0 and cost_price < 1 and cost_amount > 100:
                            cost_price = cost_amount / total_qty
                        
                        # Validate we have meaningful data
                        if total_qty > 0 and (market_value > 0 or market_price > 0):
                            holdings.append({
                                "symbol": symbol[:50],
                                "company_name": symbol,
                                "quantity": total_qty,
                                "cost_price": round(cost_price, 2),
                                "market_price": round(market_price, 2),
                                "market_value": round(market_value, 2),
                                "unrealized_gain_loss": round(unrealized_gain, 2),
                                "unrealized_gain_loss_percent": round(percent_gain, 2),
                            })
                            print(f"✓ Parsed (LankaBangla text): {symbol} - Qty: {total_qty}, Cost: {cost_price}, Market: {market_price}")
                        else:
                            print(f"✗ Skipped {symbol}: insufficient data (qty={total_qty}, mv={market_value})")
                
                except Exception as e:
                    print(f"✗ Error parsing LankaBangla line '{line[:80]}...': {e}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        return holdings
    
    def _parse_doha_text(self, text: str) -> List[dict]:
        """Parse Doha Securities text format"""
        holdings = []
        lines = text.split('\n')
        
        print(f"Parsing Doha format - total lines: {len(lines)}")
        
        for line in lines:
            # Skip header and empty lines
            if any(skip in line.upper() for skip in ['INSTRUMENT', 'TOTAL:', 'GRAND TOTAL', 'PORTFOLIO', 'SECURITIES', 'ACCOUNT STATUS']):
                continue
            
            # Doha format: SN INSTRUMENT Gr. Total Saleable Pledge AvgCost TotalCost MarketRate MarketValue UnrealizedGain %Gain %MktValue
            # Look for line starting with number (SN), followed by uppercase instrument code
            # Pattern: 1 ANWARGALV A 40 40 0 78.06 3,122.50 83.90 3,356.00 233.50 7.48 29.01
            instrument_match = re.match(r'^\s*\d+\s+([A-Z]{3,15})\s+', line.strip())
            
            if instrument_match:
                try:
                    symbol = instrument_match.group(1).strip()
                    
                    # Extract all numbers from the line
                    numbers = re.findall(r'-?\d+(?:,\d+)*(?:\.\d+)?', line)
                    
                    print(f"Found Doha instrument: {symbol}")
                    print(f"Numbers in line: {numbers}")
                    
                    # Doha format after SN and Symbol:
                    # numbers[0] = SN (skip)
                    # numbers[1] = Total Qty
                    # numbers[2] = Saleable Qty  
                    # numbers[3] = Lock/Pledge
                    # numbers[4] = Avg Cost
                    # numbers[5] = Total Cost
                    # numbers[6] = Market Rate
                    # numbers[7] = Market Value
                    # numbers[8] = Unrealized Gain
                    # numbers[9] = %Gain
                    # numbers[10] = %Market Value (optional)
                    
                    if len(numbers) >= 9:  # Need at least 9 numbers (including SN)
                        # Skip first number (SN)
                        total_qty = int(self._safe_parse_number(numbers[1]))
                        saleable_qty = int(self._safe_parse_number(numbers[2]))
                        lock_pledge = int(self._safe_parse_number(numbers[3]))
                        avg_cost = self._safe_parse_number(numbers[4])
                        total_cost = self._safe_parse_number(numbers[5])
                        market_rate = self._safe_parse_number(numbers[6])
                        market_value = self._safe_parse_number(numbers[7])
                        unrealized_gain = self._safe_parse_number(numbers[8])
                        percent_gain = self._safe_parse_number(numbers[9]) if len(numbers) > 9 else 0
                        
                        holdings.append({
                            "symbol": symbol,
                            "company_name": symbol,
                            "quantity": total_qty,
                            "cost_price": round(avg_cost, 2),
                            "market_price": round(market_rate, 2),
                            "market_value": round(market_value, 2),
                            "unrealized_gain_loss": round(unrealized_gain, 2),
                            "unrealized_gain_loss_percent": round(percent_gain, 2),
                        })
                        print(f"✓ Parsed (Doha): {symbol} - Qty: {total_qty}, Cost: {avg_cost}, Market: {market_rate}")
                    else:
                        print(f"✗ Skipped {symbol}: not enough numbers (found {len(numbers)}, need 9)")
                
                except Exception as e:
                    print(f"✗ Error parsing Doha line '{line[:80]}...': {e}")
                    import traceback
                    traceback.print_exc()
                    continue
        
        print(f"Total Doha holdings parsed: {len(holdings)}")
        return holdings
    
    def _safe_parse_number(self, text: str) -> float:
        """Parse number from text, handling commas and negatives"""
        try:
            cleaned = re.sub(r'[,\s]', '', str(text))
            return float(cleaned)
        except:
            return 0.0
    
    def _extract_holdings_from_text(self, text: str) -> List[dict]:
        """Extract holdings from plain text (fallback method)"""
        holdings = []
        
        # Generic pattern for stock symbols followed by numbers
        lines = text.split('\n')
        for line in lines:
            if re.search(r'\b[A-Z]{3,15}\b.*\d+', line):
                try:
                    symbol_match = re.search(r'\b([A-Z]{3,15})\b', line)
                    if not symbol_match:
                        continue
                    
                    symbol = symbol_match.group(1)
                    numbers = re.findall(r'-?\d+(?:,\d+)*(?:\.\d+)?', line)
                    
                    if len(numbers) >= 3:
                        nums = [self._safe_parse_number(n) for n in numbers]
                        
                        quantity = int(nums[0]) if nums[0] < 1000000 else 0
                        cost_price = nums[1] if len(nums) > 1 else 0
                        market_price = nums[2] if len(nums) > 2 else 0
                        market_value = nums[3] if len(nums) > 3 else quantity * market_price
                        unrealized_gain = nums[4] if len(nums) > 4 else market_value - (quantity * cost_price)
                        percent_gain = nums[5] if len(nums) > 5 else 0
                        
                        holdings.append({
                            "symbol": symbol,
                            "company_name": symbol,
                            "quantity": quantity,
                            "cost_price": round(cost_price, 2),
                            "market_price": round(market_price, 2),
                            "market_value": round(market_value, 2),
                            "unrealized_gain_loss": round(unrealized_gain, 2),
                            "unrealized_gain_loss_percent": round(percent_gain, 2),
                        })
                
                except Exception as e:
                    continue
        
        return holdings

    def _parse_date(self, date_str: str) -> date:
        """Parse date string in various formats"""
        # Try common date formats
        formats = [
            "%Y-%m-%d",
            "%d-%m-%Y",
            "%m-%d-%Y",
            "%Y/%m/%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d-%b-%Y",
            "%d %b %Y",
            "%d %B %Y",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        # If all fails, return today
        return date.today()

    def _calculate_parsing_confidence(
        self, client_info: Optional[ClientInfo], holdings: List[dict]
    ) -> float:
        """Calculate confidence score for parsing results"""
        score = 0.0
        
        # Client info found: +30%
        if client_info:
            score += 0.3
            if client_info.bo_id:
                score += 0.1
        
        # Holdings found: +50%
        if holdings:
            score += 0.5
            # All holdings have complete data: +10%
            if all(
                h.get("symbol")
                and h.get("quantity", 0) > 0
                and h.get("market_value", 0) > 0
                for h in holdings
            ):
                score += 0.1
        
        return min(score, 1.0)

    def _validate_and_structure(
        self, parsed_data: ParsedStatementData
    ) -> PortfolioStatementResponse:
        """Validate and structure parsed data into response format"""
        # Client info will always exist (with defaults if needed)
        if not parsed_data.client_info:
            # This should not happen now, but as a fallback
            parsed_data.client_info = ClientInfo(
                client_code="00000",
                bo_id="",
                name="Account Holder",
                statement_date=date.today(),
                account_type="CASH",
            )
        
        if not parsed_data.holdings:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No holdings found in the statement. Please ensure the PDF contains a holdings table.",
            )
        
        # Map company names to trading codes from database
        if self.session:
            parsed_data.holdings = self._map_to_trading_codes(parsed_data.holdings)
        
        # Convert holdings to HoldingItem objects
        holding_items = []
        for holding_dict in parsed_data.holdings:
            try:
                holding_items.append(HoldingItem(**holding_dict))
            except Exception as e:
                print(f"Error creating HoldingItem: {e}")
                continue
        
        if not holding_items:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not validate holdings data",
            )
        
        # Calculate totals
        total_portfolio_value = sum(h.market_value for h in holding_items)
        total_unrealized_gain_loss = sum(h.unrealized_gain_loss for h in holding_items)
        
        return PortfolioStatementResponse(
            client_info=parsed_data.client_info,
            holdings=holding_items,
            total_portfolio_value=total_portfolio_value,
            total_unrealized_gain_loss=total_unrealized_gain_loss,
        )
    
    def _map_to_trading_codes(self, holdings: List[dict]) -> List[dict]:
        """Map company names from PDF to actual trading codes in database"""
        if not self.session:
            return holdings
        
        mapped_holdings = []
        
        for holding in holdings:
            company_name = holding.get("symbol", "")  # Currently has company name
            
            # Try to find the company in database
            stock = self._find_stock_by_name(company_name)
            
            if stock:
                # Update with actual trading code
                holding["symbol"] = stock.trading_code
                holding["company_name"] = stock.company_name or company_name
                mapped_holdings.append(holding)
                print(f"✓ Mapped '{company_name}' -> {stock.trading_code}")
            else:
                # Keep original but log warning
                print(f"⚠ Could not find trading code for '{company_name}', keeping as-is")
                holding["symbol"] = company_name  # Will be handled later with warnings
                mapped_holdings.append(holding)
        
        return mapped_holdings
    
    def _find_stock_by_name(self, company_name: str) -> Optional[Company]:
        """Find stock in database by fuzzy matching company name"""
        if not self.session:
            return None
        
        from sqlalchemy import func, or_
        
        # Clean and normalize the input name
        clean_input = self._normalize_company_name(company_name)
        
        # Extract key words from company name (ignore common words)
        keywords = self._extract_keywords(clean_input)
        
        if not keywords:
            return None
        
        # Strategy 1: Try exact match on trading_code (in case symbol is provided)
        stock = self.session.exec(
            select(Company).where(Company.trading_code == company_name.upper())
        ).first()
        if stock:
            return stock
        
        # Strategy 2: Search using all keywords with AND logic (most specific)
        # Build query that checks if all keywords appear in company_name or name
        conditions = []
        for keyword in keywords:
            conditions.append(
                or_(
                    func.upper(Company.company_name).like(f"%{keyword}%"),
                    func.upper(Company.name).like(f"%{keyword}%")
                )
            )
        
        if conditions:
            from sqlalchemy import and_
            stocks = self.session.exec(
                select(Company).where(and_(*conditions))
            ).all()
            
            # If we found matches, pick the best one
            if len(stocks) == 1:
                return stocks[0]
            elif len(stocks) > 1:
                # Multiple matches - pick the one with most similar length or most keywords
                return self._pick_best_match(stocks, clean_input, keywords)
        
        # Strategy 3: Try with major keywords only (first 2-3 significant words)
        major_keywords = keywords[:min(3, len(keywords))]
        if len(major_keywords) >= 2:
            conditions = []
            for keyword in major_keywords:
                conditions.append(
                    or_(
                        func.upper(Company.company_name).like(f"%{keyword}%"),
                        func.upper(Company.name).like(f"%{keyword}%")
                    )
                )
            
            stocks = self.session.exec(
                select(Company).where(and_(*conditions))
            ).all()
            
            if stocks:
                return self._pick_best_match(stocks, clean_input, major_keywords)
        
        # Strategy 4: Try each keyword individually and find most matches
        keyword_matches = {}
        for keyword in keywords:
            matches = self.session.exec(
                select(Company).where(
                    or_(
                        func.upper(Company.company_name).like(f"%{keyword}%"),
                        func.upper(Company.name).like(f"%{keyword}%")
                    )
                )
            ).all()
            
            for match in matches:
                match_id = str(match.id)
                if match_id not in keyword_matches:
                    keyword_matches[match_id] = {"stock": match, "count": 0}
                keyword_matches[match_id]["count"] += 1
        
        # Pick the stock that matched the most keywords
        if keyword_matches:
            best_match = max(keyword_matches.values(), key=lambda x: x["count"])
            if best_match["count"] >= 2:  # At least 2 keywords should match
                return best_match["stock"]
        
        return None
    
    def _normalize_company_name(self, name: str) -> str:
        """Normalize company name for matching"""
        normalized = name.upper()
        
        # Remove common suffixes and prefixes
        for suffix in [' PLC', ' LTD.', ' LIMITED', ' LTD', ' CORPORATION', ' CORP', ' INC.', ' INC']:
            normalized = normalized.replace(suffix, '')
        
        # Remove special characters but keep spaces
        normalized = ''.join(c if c.isalnum() or c.isspace() else ' ' for c in normalized)
        
        # Remove extra spaces
        normalized = ' '.join(normalized.split())
        
        return normalized.strip()
    
    def _extract_keywords(self, normalized_name: str) -> List[str]:
        """Extract significant keywords from company name"""
        # Split into words
        words = normalized_name.split()
        
        # Filter out common/stop words
        stop_words = {'AND', 'THE', 'OF', 'FOR', '&', 'CO', 'COMPANY'}
        keywords = [word for word in words if word not in stop_words and len(word) >= 2]
        
        return keywords
    
    def _pick_best_match(self, stocks: List[Company], clean_input: str, keywords: List[str]) -> Company:
        """Pick the best matching stock from multiple candidates"""
        if len(stocks) == 1:
            return stocks[0]
        
        # Score each stock based on similarity
        best_stock = None
        best_score = -1
        
        for stock in stocks:
            score = 0
            stock_name = self._normalize_company_name(stock.company_name or stock.name)
            
            # Count matching keywords
            for keyword in keywords:
                if keyword in stock_name:
                    score += 2
            
            # Prefer shorter names (likely more precise)
            length_diff = abs(len(stock_name) - len(clean_input))
            score -= length_diff * 0.1
            
            # Prefer exact substring match
            if clean_input in stock_name or stock_name in clean_input:
                score += 5
            
            if score > best_score:
                best_score = score
                best_stock = stock
        
        return best_stock or stocks[0]


# Singleton instance
pdf_parser = PortfolioStatementParser()

