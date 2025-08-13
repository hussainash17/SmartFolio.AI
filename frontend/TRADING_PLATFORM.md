# SmartStock Trading Platform Frontend

A modern, comprehensive trading platform frontend built with React, TypeScript, and TanStack Router, based on the SmartStock template structure with advanced trading features.

## 🚀 Features

### Core Trading Features
- **Real-time Dashboard**: Comprehensive view with market data, portfolio analytics, and trading insights
- **Advanced Trading Interface**: Execute trades with market, limit, and stop orders
- **Portfolio Management**: Multi-portfolio support with real-time P&L tracking
- **Market Data Center**: Live market data, watchlists, and advanced charting
- **Order Management**: View and manage active orders and trade history
- **Account Management**: Complete account overview with balances and settings

### User Interface
- **Modern Design**: Clean, professional interface with dark/light mode support
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **Advanced Sidebar Navigation**: Intuitive navigation with visual indicators
- **Real-time Updates**: Live data streaming and instant notifications
- **Interactive Charts**: TradingView integration for advanced charting

### Technical Features
- **TypeScript**: Full type safety throughout the application
- **TanStack Router**: File-based routing with type-safe navigation
- **Shadcn/UI Components**: Modern, accessible UI components
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Efficient data fetching and caching
- **Mock Trading Engine**: Complete trading simulation with realistic data

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Trading/              # Core trading components
│   │   │   ├── TradingDashboard.tsx    # Main dashboard
│   │   │   ├── TradingInterface.tsx    # Trading execution
│   │   │   ├── TradingSidebar.tsx      # Navigation sidebar
│   │   │   ├── GlobalTopBar.tsx       # Top navigation bar
│   │   │   ├── MarketData.tsx         # Market data center
│   │   │   ├── PortfolioDashboard.tsx # Portfolio overview
│   │   │   ├── PortfolioDetail.tsx    # Portfolio details
│   │   │   ├── OrdersManager.tsx      # Order management
│   │   │   ├── AccountManager.tsx     # Account management
│   │   │   ├── QuickTradeDialog.tsx   # Quick trade modal
│   │   │   └── PortfolioForm.tsx      # Portfolio creation
│   │   └── ui/                   # Reusable UI components
│   ├── hooks/
│   │   ├── useTrading.ts         # Trading state management
│   │   ├── usePortfolios.ts      # Portfolio management
│   │   └── useAuth.ts           # Authentication
│   ├── types/
│   │   ├── trading.ts           # Trading type definitions
│   │   └── portfolio.ts         # Portfolio type definitions
│   ├── routes/
│   │   ├── _layout/
│   │   │   ├── index.tsx        # Dashboard route
│   │   │   ├── trading.tsx      # Trading interface route
│   │   │   ├── portfolio.tsx    # Portfolio management route
│   │   │   ├── market.tsx       # Market data route
│   │   │   ├── orders.tsx       # Orders management route
│   │   │   ├── account.tsx      # Account management route
│   │   │   └── research.tsx     # Research tools route
│   │   └── _layout.tsx          # Main layout with sidebar
│   └── lib/
│       └── utils.ts             # Utility functions
```

## 🛠️ Technology Stack

### Frontend Framework
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and enhanced developer experience
- **Vite**: Fast build tool and development server

### Routing & Navigation
- **TanStack Router**: Type-safe, file-based routing
- **React Router**: Programmatic navigation support

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: High-quality, accessible React components
- **Radix UI**: Unstyled, accessible UI primitives
- **Lucide React**: Beautiful, customizable icons

### State Management
- **React Query (TanStack Query)**: Server state management
- **React Hooks**: Local state management
- **Custom Hooks**: Reusable business logic

### Data & API
- **Axios**: HTTP client for API requests
- **Mock Data**: Comprehensive trading simulation
- **Real-time Updates**: WebSocket support ready

### Forms & Validation
- **React Hook Form**: Performant form library
- **Zod**: TypeScript-first schema validation

### Charts & Visualizations
- **Recharts**: Responsive chart library
- **TradingView Widgets**: Professional trading charts

## 🎯 Available Routes

### Main Navigation
- `/` - **Dashboard**: Overview of account, portfolio, and market
- `/trading` - **Trading Interface**: Execute trades and manage positions
- `/portfolio` - **Portfolio Management**: View and manage portfolios
- `/market` - **Market Data**: Real-time market information and watchlists
- `/orders` - **Order Management**: Active orders and trade history
- `/account` - **Account Settings**: Account details and preferences

### Research & Analysis
- `/research` - **Research Tools**: Market analysis and screening tools
- `/fundamentals` - **Fundamental Analysis**: Company financials and metrics
- `/news` - **News & Insights**: Market news and analysis

### Risk Management
- `/risk` - **Risk Analysis**: Portfolio risk assessment
- `/correlation` - **Correlation Analysis**: Asset correlation metrics
- `/rebalancing` - **Portfolio Rebalancing**: Rebalancing recommendations

### Account Management
- `/profile` - **User Profile**: Personal information and KYC
- `/settings` - **Platform Settings**: Customization and preferences

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Access the application**
   Open http://localhost:5173 in your browser

### Environment Setup

Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_TRADINGVIEW_WIDGET_URL=https://s3.tradingview.com/tv.js
```

## 📱 Key Components

### TradingDashboard
The main dashboard providing a comprehensive overview of:
- Account balance and buying power
- Portfolio performance metrics
- Market movers and sector performance
- Recent orders and transactions
- Real-time market data
- Risk analytics and alerts

### TradingInterface
Advanced trading interface featuring:
- Real-time order entry
- Market depth and order book
- Position management
- Risk calculations
- Order validation and confirmation

### PortfolioDashboard
Portfolio management center including:
- Multiple portfolio support
- Asset allocation visualization
- Performance tracking
- Holdings management
- Rebalancing recommendations

### MarketData
Comprehensive market data center with:
- Real-time stock quotes
- Watchlist management
- Market news and insights
- Sector performance
- Market indices tracking

### TradingSidebar
Intelligent navigation sidebar featuring:
- Visual navigation indicators
- Organized sections (Trading, Research, Risk Management)
- User profile integration
- Quick access to key features

## 🎨 Design Philosophy

### Modern & Professional
- Clean, minimalist interface
- Consistent design language
- Professional color scheme
- Smooth animations and transitions

### User Experience
- Intuitive navigation
- Clear information hierarchy
- Responsive design
- Accessibility compliance

### Performance
- Fast initial load
- Smooth interactions
- Efficient data updates
- Optimized bundle size

## 📊 Data Models

### Trading Data
- Real-time stock quotes
- Order book depth
- Time and sales data
- Market indices
- News and sentiment

### Portfolio Data
- Holdings and positions
- Performance metrics
- Risk analytics
- Transaction history
- Asset allocation

### User Data
- Account information
- Trading preferences
- Watchlists
- Alerts and notifications

## 🔧 Customization

### Themes
The platform supports light and dark themes with easy customization:
- CSS custom properties
- Tailwind CSS configuration
- Component-level theming

### Components
All components are built with:
- TypeScript interfaces
- Prop validation
- Default styling
- Easy customization

### Layout
The layout system is flexible and supports:
- Responsive breakpoints
- Component composition
- Custom layouts
- Mobile optimization

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Docker Deployment
```bash
# Build Docker image
docker build -t smartstock-frontend .

# Run container
docker run -p 3000:80 smartstock-frontend
```

## 🤝 Integration

### Backend Integration
The frontend is designed to integrate with the SmartStock backend:
- RESTful API endpoints
- WebSocket connections
- Authentication flow
- Real-time data streaming

### Third-party Services
- TradingView for advanced charts
- Market data providers
- News and sentiment APIs
- Payment processing

## 📈 Performance

### Optimization Features
- Code splitting and lazy loading
- Efficient re-rendering
- Optimized bundle size
- Caching strategies

### Monitoring
- Performance metrics
- Error tracking
- User analytics
- Real-time monitoring

## 🔐 Security

### Client-side Security
- Input validation
- XSS protection
- CSRF protection
- Secure authentication

### Data Protection
- Encrypted communications
- Secure storage
- Privacy compliance
- Audit logging

## 📚 Development Guide

### Code Standards
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Git hooks for quality

### Testing
- Unit tests with Jest
- Component testing
- E2E testing with Playwright
- Performance testing

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🎯 Future Enhancements

### Planned Features
- Advanced charting tools
- AI-powered insights
- Social trading features
- Mobile app development
- Real-time collaboration

### Technical Improvements
- Progressive Web App (PWA)
- Offline functionality
- Performance optimizations
- Enhanced accessibility

---

This trading platform represents a modern, comprehensive solution for online trading with a focus on user experience, performance, and scalability. Built with the latest web technologies and best practices, it provides a solid foundation for a professional trading application.