"""add_demo_stock_data

Revision ID: bbbbc25c8827
Revises: 5eb82f350768
Create Date: 2025-07-23 22:12:00.375541

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from decimal import Decimal
import uuid
from datetime import datetime


# revision identifiers, used by Alembic.
revision = 'bbbbc25c8827'
down_revision = '5eb82f350768'
branch_labels = None
depends_on = None


def upgrade():
    # Get the connection
    connection = op.get_bind()
    
    # Demo stock companies data
    demo_stocks = [
        # Technology Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'AAPL',
            'company_name': 'Apple Inc.',
            'sector': 'Technology',
            'industry': 'Consumer Electronics',
            'market_cap': Decimal('2500000000000'),  # 2.5T
            'authorized_capital': Decimal('50000000000'),
            'paid_up_capital': Decimal('45000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 1.6B shares
            'free_float': Decimal('0.85'),
            'pe_ratio': Decimal('28.5'),
            'pb_ratio': Decimal('15.2'),
            'eps': Decimal('5.85'),
            'nav': Decimal('25.30'),
            'dividend_yield': Decimal('0.5'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'GOOGL',
            'company_name': 'Alphabet Inc.',
            'sector': 'Technology',
            'industry': 'Internet Services',
            'market_cap': Decimal('1800000000000'),  # 1.8T
            'authorized_capital': Decimal('30000000000'),
            'paid_up_capital': Decimal('28000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 1.25B shares
            'free_float': Decimal('0.90'),
            'pe_ratio': Decimal('25.8'),
            'pb_ratio': Decimal('6.8'),
            'eps': Decimal('4.95'),
            'nav': Decimal('45.20'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'MSFT',
            'company_name': 'Microsoft Corporation',
            'sector': 'Technology',
            'industry': 'Software',
            'market_cap': Decimal('2200000000000'),  # 2.2T
            'authorized_capital': Decimal('40000000000'),
            'paid_up_capital': Decimal('38000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 750M shares
            'free_float': Decimal('0.88'),
            'pe_ratio': Decimal('32.1'),
            'pb_ratio': Decimal('12.5'),
            'eps': Decimal('8.25'),
            'nav': Decimal('35.80'),
            'dividend_yield': Decimal('0.8'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'TSLA',
            'company_name': 'Tesla, Inc.',
            'sector': 'Consumer Discretionary',
            'industry': 'Automotive',
            'market_cap': Decimal('800000000000'),  # 800B
            'authorized_capital': Decimal('20000000000'),
            'paid_up_capital': Decimal('18000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 2B shares (reduced from 3.2B)
            'free_float': Decimal('0.92'),
            'pe_ratio': Decimal('45.2'),
            'pb_ratio': Decimal('18.5'),
            'eps': Decimal('3.25'),
            'nav': Decimal('12.40'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'AMZN',
            'company_name': 'Amazon.com, Inc.',
            'sector': 'Consumer Discretionary',
            'industry': 'Internet Retail',
            'market_cap': Decimal('1600000000000'),  # 1.6T
            'authorized_capital': Decimal('35000000000'),
            'paid_up_capital': Decimal('32000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 1B shares
            'free_float': Decimal('0.87'),
            'pe_ratio': Decimal('35.8'),
            'pb_ratio': Decimal('8.2'),
            'eps': Decimal('2.85'),
            'nav': Decimal('28.60'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Financial Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'JPM',
            'company_name': 'JPMorgan Chase & Co.',
            'sector': 'Financial Services',
            'industry': 'Banks',
            'market_cap': Decimal('450000000000'),  # 450B
            'authorized_capital': Decimal('25000000000'),
            'paid_up_capital': Decimal('23000000000'),
            'face_value': Decimal('1.00'),
            'total_shares': 10000,  # 2B shares (reduced from 3B)
            'free_float': Decimal('0.85'),
            'pe_ratio': Decimal('12.5'),
            'pb_ratio': Decimal('1.8'),
            'eps': Decimal('12.45'),
            'nav': Decimal('85.20'),
            'dividend_yield': Decimal('2.8'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'BAC',
            'company_name': 'Bank of America Corporation',
            'sector': 'Financial Services',
            'industry': 'Banks',
            'market_cap': Decimal('280000000000'),  # 280B
            'authorized_capital': Decimal('20000000000'),
            'paid_up_capital': Decimal('18000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 8B shares
            'free_float': Decimal('0.90'),
            'pe_ratio': Decimal('10.2'),
            'pb_ratio': Decimal('1.2'),
            'eps': Decimal('2.85'),
            'nav': Decimal('25.40'),
            'dividend_yield': Decimal('3.2'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Healthcare Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'JNJ',
            'company_name': 'Johnson & Johnson',
            'sector': 'Healthcare',
            'industry': 'Pharmaceuticals',
            'market_cap': Decimal('380000000000'),  # 380B
            'authorized_capital': Decimal('15000000000'),
            'paid_up_capital': Decimal('14000000000'),
            'face_value': Decimal('1.00'),
            'total_shares': 10000,  # 2B shares (reduced from 2.5B)
            'free_float': Decimal('0.88'),
            'pe_ratio': Decimal('15.8'),
            'pb_ratio': Decimal('3.2'),
            'eps': Decimal('8.95'),
            'nav': Decimal('28.60'),
            'dividend_yield': Decimal('3.1'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'PFE',
            'company_name': 'Pfizer Inc.',
            'sector': 'Healthcare',
            'industry': 'Pharmaceuticals',
            'market_cap': Decimal('180000000000'),  # 180B
            'authorized_capital': Decimal('12000000000'),
            'paid_up_capital': Decimal('11000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 4B shares (reduced from 5.6B)
            'free_float': Decimal('0.92'),
            'pe_ratio': Decimal('8.5'),
            'pb_ratio': Decimal('1.8'),
            'eps': Decimal('2.15'),
            'nav': Decimal('12.80'),
            'dividend_yield': Decimal('4.2'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Energy Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'XOM',
            'company_name': 'Exxon Mobil Corporation',
            'sector': 'Energy',
            'industry': 'Oil & Gas',
            'market_cap': Decimal('420000000000'),  # 420B
            'authorized_capital': Decimal('20000000000'),
            'paid_up_capital': Decimal('18000000000'),
            'face_value': Decimal('0.20'),
            'total_shares': 10000,  # 4B shares
            'free_float': Decimal('0.85'),
            'pe_ratio': Decimal('11.2'),
            'pb_ratio': Decimal('2.1'),
            'eps': Decimal('8.45'),
            'nav': Decimal('42.30'),
            'dividend_yield': Decimal('3.8'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Consumer Staples
        {
            'id': str(uuid.uuid4()),
            'symbol': 'KO',
            'company_name': 'The Coca-Cola Company',
            'sector': 'Consumer Staples',
            'industry': 'Beverages',
            'market_cap': Decimal('250000000000'),  # 250B
            'authorized_capital': Decimal('10000000000'),
            'paid_up_capital': Decimal('9000000000'),
            'face_value': Decimal('0.25'),
            'total_shares': 10000,  # 4B shares (reduced from 4.3B)
            'free_float': Decimal('0.88'),
            'pe_ratio': Decimal('22.5'),
            'pb_ratio': Decimal('9.8'),
            'eps': Decimal('2.45'),
            'nav': Decimal('5.80'),
            'dividend_yield': Decimal('3.2'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'PG',
            'company_name': 'Procter & Gamble Co.',
            'sector': 'Consumer Staples',
            'industry': 'Household Products',
            'market_cap': Decimal('320000000000'),  # 320B
            'authorized_capital': Decimal('12000000000'),
            'paid_up_capital': Decimal('11000000000'),
            'face_value': Decimal('1.00'),
            'total_shares': 10000,  # 2B shares (reduced from 2.4B)
            'free_float': Decimal('0.85'),
            'pe_ratio': Decimal('24.8'),
            'pb_ratio': Decimal('7.2'),
            'eps': Decimal('5.85'),
            'nav': Decimal('18.40'),
            'dividend_yield': Decimal('2.5'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Communication Services
        {
            'id': str(uuid.uuid4()),
            'symbol': 'META',
            'company_name': 'Meta Platforms, Inc.',
            'sector': 'Communication Services',
            'industry': 'Internet Services',
            'market_cap': Decimal('900000000000'),  # 900B
            'authorized_capital': Decimal('25000000000'),
            'paid_up_capital': Decimal('23000000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 2B shares (reduced from 2.5B)
            'free_float': Decimal('0.90'),
            'pe_ratio': Decimal('28.5'),
            'pb_ratio': Decimal('5.8'),
            'eps': Decimal('12.45'),
            'nav': Decimal('45.20'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        {
            'id': str(uuid.uuid4()),
            'symbol': 'NFLX',
            'company_name': 'Netflix, Inc.',
            'sector': 'Communication Services',
            'industry': 'Entertainment',
            'market_cap': Decimal('220000000000'),  # 220B
            'authorized_capital': Decimal('8000000000'),
            'paid_up_capital': Decimal('7500000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 450M shares
            'free_float': Decimal('0.92'),
            'pe_ratio': Decimal('35.2'),
            'pb_ratio': Decimal('8.5'),
            'eps': Decimal('12.85'),
            'nav': Decimal('45.60'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Industrial Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'BA',
            'company_name': 'Boeing Co.',
            'sector': 'Industrials',
            'industry': 'Aerospace & Defense',
            'market_cap': Decimal('120000000000'),  # 120B
            'authorized_capital': Decimal('15000000000'),
            'paid_up_capital': Decimal('12000000000'),
            'face_value': Decimal('5.00'),
            'total_shares': 10000,  # 600M shares
            'free_float': Decimal('0.88'),
            'pe_ratio': Decimal('45.8'),
            'pb_ratio': Decimal('8.2'),
            'eps': Decimal('2.15'),
            'nav': Decimal('15.40'),
            'dividend_yield': Decimal('0.0'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        },
        # Real Estate Sector
        {
            'id': str(uuid.uuid4()),
            'symbol': 'SPG',
            'company_name': 'Simon Property Group, Inc.',
            'sector': 'Real Estate',
            'industry': 'REIT - Retail',
            'market_cap': Decimal('45000000000'),  # 45B
            'authorized_capital': Decimal('8000000000'),
            'paid_up_capital': Decimal('7500000000'),
            'face_value': Decimal('0.01'),
            'total_shares': 10000,  # 325M shares
            'free_float': Decimal('0.85'),
            'pe_ratio': Decimal('18.5'),
            'pb_ratio': Decimal('8.2'),
            'eps': Decimal('8.45'),
            'nav': Decimal('45.80'),
            'dividend_yield': Decimal('5.8'),
            'is_active': True,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
    ]
    
    # Insert demo stock data
    for stock in demo_stocks:
        connection.execute(
            sa.text("""
                INSERT INTO stockcompany (
                    id, symbol, company_name, sector, industry, market_cap, 
                    authorized_capital, paid_up_capital, face_value, total_shares, 
                    free_float, pe_ratio, pb_ratio, eps, nav, dividend_yield, 
                    is_active, created_at, updated_at
                ) VALUES (
                    :id, :symbol, :company_name, :sector, :industry, :market_cap,
                    :authorized_capital, :paid_up_capital, :face_value, :total_shares,
                    :free_float, :pe_ratio, :pb_ratio, :eps, :nav, :dividend_yield,
                    :is_active, :created_at, :updated_at
                )
            """),
            stock
        )


def downgrade():
    # Remove demo stock data
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM stockcompany WHERE symbol IN ('AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'JPM', 'BAC', 'JNJ', 'PFE', 'XOM', 'KO', 'PG', 'META', 'NFLX', 'BA', 'SPG')")
    )
