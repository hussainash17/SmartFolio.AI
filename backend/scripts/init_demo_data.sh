#!/bin/bash

# Script to initialize demo data for the AI-TRADE application

echo "🚀 Initializing demo data for AI-TRADE..."

# Check if we're in the backend directory
if [ ! -f "alembic.ini" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Run Alembic migration to add demo stock companies
echo "📊 Running Alembic migration to add demo stock companies..."
uv run alembic upgrade head

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi

# Run the demo data script
echo "📈 Adding sample stock data and portfolios..."
uv run python app/initial_data.py

if [ $? -eq 0 ]; then
    echo "✅ Demo data initialization completed successfully!"
    echo ""
    echo "🎉 Demo data includes:"
    echo "   • 16 popular stock companies (AAPL, GOOGL, MSFT, TSLA, etc.)"
    echo "   • Sample stock data with current prices and market info"
    echo "   • 30 days of historical OHLC data for top 5 companies"
    echo "   • Sample portfolios for testing"
    echo ""
    echo "📋 Available stock symbols:"
    echo "   AAPL, GOOGL, MSFT, TSLA, AMZN, JPM, BAC, JNJ, PFE, XOM, KO, PG, META, NFLX, BA, SPG"
    echo ""
    echo "💡 You can now test the Portfolio and Watchlist features with these stocks!"
else
    echo "❌ Demo data initialization failed!"
    exit 1
fi 