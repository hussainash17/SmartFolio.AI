# Portfolio Management System

A comprehensive portfolio management and trading platform built with React, TypeScript, and Tailwind CSS. This project was originally designed in Figma and then implemented as a full-featured web application.

## Features

- **Dashboard**: Comprehensive overview of portfolio performance and market data
- **Portfolio Management**: Create, manage, and track multiple investment portfolios
- **Trading Interface**: Execute trades with market, limit, and stop orders
- **Market Data**: Real-time market information and watchlists
- **Risk Management**: Advanced risk analysis and portfolio optimization tools
- **Stock Screener**: Find stocks matching your investment criteria
- **Performance Analytics**: Detailed performance tracking and benchmarking
- **Account Management**: Complete account overview and transaction history

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd portfolio-management-system
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   or if you're using yarn:
   ```bash
   yarn install
   ```

## Running the Application

1. **Start the development server:**
   ```bash
   npm start
   ```
   or
   ```bash
   yarn start
   ```

2. **Open your browser:**
   The application will automatically open in your default browser at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components (shadcn/ui)
│   └── ...             # Feature-specific components
├── hooks/              # Custom React hooks
├── styles/             # Global styles and CSS
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Modern component library
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **Sonner** - Toast notifications

## Development

This is a demo application with mock data. In a production environment, you would:

1. Connect to real market data APIs
2. Implement user authentication
3. Add a backend API
4. Set up a database for portfolio data
5. Add real-time trading capabilities

## Figma Design

The original design was created in Figma and includes:
- Complete UI/UX design system
- Responsive layouts
- Dark/light theme support
- Interactive prototypes
- Component specifications

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (one-way operation)

## Browser Support

The application supports all modern browsers including:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

This is a demo project showcasing a portfolio management system. Feel free to explore the code and use it as a reference for your own projects.

## License

This project is for demonstration purposes. 