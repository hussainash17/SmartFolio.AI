# Demo Data Setup Guide

This guide explains how to set up demo stock data for testing the AI-TRADE application.

## 🚀 Quick Start

Run the initialization script from the backend directory:

```bash
./scripts/init_demo_data.sh
```

This will:
1. Run the Alembic migration to add demo stock companies
2. Add sample stock data with current prices
3. Create sample portfolios for testing

## 📊 Demo Stock Companies

The demo data includes **16 popular stock companies** across different sectors:

### Technology Sector
- **AAPL** - Apple Inc. ($175.50)
- **GOOGL** - Alphabet Inc. ($142.80)
- **MSFT** - Microsoft Corporation ($380.25)
- **META** - Meta Platforms, Inc. ($360.20)

### Consumer Discretionary
- **TSLA** - Tesla, Inc. ($245.80)
- **AMZN** - Amazon.com, Inc. ($155.40)
- **NFLX** - Netflix, Inc. ($485.60)

### Financial Services
- **JPM** - JPMorgan Chase & Co. ($145.60)
- **BAC** - Bank of America Corporation ($35.20)

### Healthcare
- **JNJ** - Johnson & Johnson ($152.40)
- **PFE** - Pfizer Inc. ($28.50)

### Energy
- **XOM** - Exxon Mobil Corporation ($105.20)

### Consumer Staples
- **KO** - The Coca-Cola Company ($58.40)
- **PG** - Procter & Gamble Co. ($133.80)

### Industrials
- **BA** - Boeing Co. ($200.40)

### Real Estate
- **SPG** - Simon Property Group, Inc. ($138.50)

## 📈 Sample Data Included

### Stock Company Information
- Company details (name, sector, industry)
- Financial metrics (market cap, PE ratio, dividend yield)
- Share information (total shares, free float)

### Real-time Stock Data
- Current prices and daily changes
- High/low/open/close prices
- Volume and turnover data
- Market capitalization

### Historical Data
- 30 days of OHLC (Open/High/Low/Close) data for top 5 companies
- Price trends and volatility patterns

### Sample Portfolios
- **Growth Portfolio** - High-growth technology stocks
- **Dividend Portfolio** - Stable dividend-paying stocks  
- **Balanced Portfolio** - Mix of growth and value stocks

## 🔧 Manual Setup

If you prefer to run the steps manually:

### 1. Run Alembic Migration
```bash
uv run alembic upgrade head
```

### 2. Add Sample Data
```bash
uv run python app/initial_data.py
```

## 🧪 Testing the Application

### Portfolio Management
1. Create a new portfolio
2. Add positions using stock symbols (e.g., "AAPL", "GOOGL")
3. View portfolio performance and holdings

### Watchlist Management
1. Create watchlists
2. Add stocks using symbols
3. Track stock prices and changes

### Available Stock Symbols
Use any of these symbols in the frontend:
```
AAPL, GOOGL, MSFT, TSLA, AMZN, JPM, BAC, JNJ, PFE, XOM, KO, PG, META, NFLX, BA, SPG
```

## 📁 Files Created

### Migration File
- `app/alembic/versions/bbbbc25c8827_add_demo_stock_data.py`
  - Adds 16 demo stock companies to the database

### Initialization Script
- `app/initial_data.py`
  - Adds sample stock data and portfolios
  - Creates historical OHLC data

### Setup Script
- `scripts/init_demo_data.sh`
  - Automated setup script
  - Runs migration and data initialization

## 🔄 Updating Demo Data

To update the demo data with new companies:

1. Edit the migration file to add new companies
2. Update the sample data in `initial_data.py`
3. Run the migration again

## 🗑️ Removing Demo Data

To remove all demo data:

```bash
uv run alembic downgrade -1
```

This will remove the demo stock companies and all related data.

## 📝 Notes

- All prices are fictional and for demonstration purposes only
- Market data is simulated and not real-time
- The demo data provides a realistic testing environment
- You can extend the demo data by adding more companies or historical data

## 🐛 Troubleshooting

### Migration Fails
- Ensure the database is running
- Check that all dependencies are installed
- Verify the database connection settings

### No Stock Data
- Run the initialization script again
- Check the database for existing data
- Verify the migration was successful

### Frontend Issues
- Regenerate the OpenAPI client after backend changes
- Check the browser console for errors
- Verify the backend API is running

## 📞 Support

If you encounter issues with the demo data setup, check:
1. Database connection and permissions
2. Alembic migration status
3. Backend API availability
4. Frontend client generation 