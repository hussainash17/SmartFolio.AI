# SmartStock - Real-Time Stock Market Tracking & Analytics System

A comprehensive cross-platform system for real-time monitoring, analysis, and portfolio tracking of DSE & CSE stocks. SmartStock offers live data, interactive charts, alerts, news, and AI insights, empowering Bangladeshi investors.

## 🚀 Features

### Core Features
- **Real-time Stock Data**: Live data scraping from DSE website
- **Interactive Charting**: TradingView integration with multiple timeframes
- **Portfolio Management**: Multiple portfolios with P&L tracking
- **Watchlists**: Custom watchlists with real-time updates
- **Alerts & Notifications**: Price alerts, volume spikes, technical indicators
- **News Integration**: Market news with sentiment analysis
- **Stock Screener**: Advanced filtering and screening tools

### Subscription Tiers
- **Free Tier**: Basic market data, simple charts, limited alerts
- **Premium Tier**: Advanced charting, unlimited alerts, portfolio analytics, news digests

### Payment Integration
- **bKash**: Primary payment method for Bangladeshi users
- **Secure Transactions**: Encrypted payment processing
- **Subscription Management**: Auto-renewal and manual renewal options

## 🏗️ Architecture

### Technology Stack
- **Backend**: FastAPI + SQLModel + PostgreSQL
- **Frontend**: React + TypeScript + TanStack Router
- **Real-time**: WebSockets + Redis
- **Charts**: TradingView Widgets
- **Scraping**: aiohttp + BeautifulSoup + Selenium
- **Scheduler**: APScheduler
- **Deployment**: Docker + Traefik

### Data Models
- **Stock Data**: Real-time prices, volumes, OHLC data
- **Portfolio**: Multiple portfolios per user with positions
- **Trades**: Complete trade history with P&L calculations
- **Alerts**: Price targets, technical indicators, volume alerts
- **News**: Market news with stock relevance scoring
- **Subscriptions**: Free/Premium tiers with feature access

## 📊 Data Sources

### DSE (Dhaka Stock Exchange)
- **Real-time Scraping**: Automated scraping every 30 seconds during market hours
- **Market Summary**: Index data, advancers/decliners, total volume
- **Individual Stocks**: Price, volume, change, technical data
- **Historical Data**: Daily OHLC aggregation from intraday ticks

### Data Storage Strategy
- **Intraday Ticks**: Stored for 7 days for real-time charting
- **Daily OHLC**: Permanent storage for historical analysis
- **Real-time Data**: Cached in Redis for fast access
- **Cleanup**: Automated cleanup of old data

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SmartStock
```

2. **Backend Setup**
```bash
cd backend
# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn app.main:app --reload
```

3. **Frontend Setup**
```bash
cd frontend
# Install dependencies
npm install

# Start development server
npm run dev
```

4. **Docker Setup (Production)**
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/smartstock
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email
SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# DSE Scraping
DSE_BASE_URL=https://www.dsebd.org
SCRAPING_INTERVAL=30
MARKET_HOURS_START=10:00
MARKET_HOURS_END=14:30

# Payment (bKash)
BKASH_APP_KEY=your-bkash-app-key
BKASH_APP_SECRET=your-bkash-app-secret
BKASH_USERNAME=your-bkash-username
BKASH_PASSWORD=your-bkash-password
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_TRADINGVIEW_WIDGET_URL=https://s3.tradingview.com/tv.js
```

## 📈 API Endpoints

### Stock Data
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/{symbol}` - Get specific stock data
- `GET /api/stocks/{symbol}/chart` - Get chart data
- `GET /api/market/summary` - Get market summary

### Portfolio
- `GET /api/portfolios` - Get user portfolios
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios/{id}` - Get portfolio details
- `POST /api/portfolios/{id}/trades` - Add trade
- `GET /api/portfolios/{id}/analytics` - Portfolio analytics

### Alerts
- `GET /api/alerts` - Get user alerts
- `POST /api/alerts` - Create alert
- `PUT /api/alerts/{id}` - Update alert
- `DELETE /api/alerts/{id}` - Delete alert

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `POST /api/subscriptions` - Subscribe to plan
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/payments/bkash` - Process bKash payment

## 🔄 Scraping Schedule

### Market Hours (Mon-Fri, 10:00 AM - 2:30 PM)
- **Real-time Data**: Every 30 seconds
- **Market Summary**: Every 30 seconds
- **Top Gainers/Losers**: Every 5 minutes

### Off Hours
- **Data Updates**: Every 5 minutes
- **Weekend**: Every 15 minutes

### Daily Tasks
- **OHLC Aggregation**: 3:00 PM (end of trading day)
- **Data Cleanup**: Sunday 2:00 AM

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### E2E Tests
```bash
cd frontend
npm run test:e2e
```

## 📦 Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with Traefik
docker-compose -f docker-compose.traefik.yml up -d
```

### Environment-Specific Configs
- `docker-compose.yml` - Development
- `docker-compose.prod.yml` - Production
- `docker-compose.traefik.yml` - Production with Traefik

## 🔒 Security

### Authentication
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints

### Data Protection
- Encrypted database connections
- Secure payment processing
- Input validation and sanitization

### Scraping Ethics
- Respectful scraping with delays
- User-agent identification
- Rate limiting to avoid server overload

## 📊 Monitoring

### Health Checks
- Database connectivity
- Redis connectivity
- Scraper status
- API response times

### Logging
- Structured logging with JSON format
- Error tracking with Sentry
- Performance monitoring

### Metrics
- Scraping success rate
- API response times
- User activity metrics
- Subscription analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.smartstock.com](https://docs.smartstock.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/smartstock/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/smartstock/discussions)

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Real-time DSE data scraping
- ✅ Basic portfolio management
- ✅ TradingView integration
- ✅ Alert system
- ✅ bKash payment integration

### Phase 2 (Next)
- 🔄 CSE (Chittagong Stock Exchange) integration
- 🔄 Advanced technical indicators
- 🔄 AI-powered stock recommendations
- 🔄 Mobile app development
- 🔄 Social trading features

### Phase 3 (Future)
- 📋 Options and derivatives
- 📋 International markets
- 📋 Advanced analytics
- 📋 Institutional features
- 📋 API marketplace

---

**SmartStock** - Empowering Bangladeshi investors with real-time market intelligence.
