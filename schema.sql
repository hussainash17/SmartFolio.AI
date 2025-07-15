-- =============================
-- AI-Driven Trading Platform Schema
-- For Bangladesh Stock Market
-- =============================
-- Author: [Your Name]
-- Date: [Today]
--
-- This schema merges and refines the provided structures for a robust, AI-ready trading platform.
--
-- Key Features:
--  - Historical OHLCV data
--  - Company fundamentals
--  - Corporate actions (dividends, splits, rights)
--  - News and sentiment
--  - Technical indicators (optional, can be computed on-the-fly)
--  - Backtesting and trade logs
--  - Extensible for AI/ML workflows

-- =============================
-- 1. Company Master Table
-- =============================
CREATE TABLE company (
    company_id           SERIAL PRIMARY KEY,
    name                 VARCHAR(255) NOT NULL,
    trading_code         VARCHAR(50) NOT NULL UNIQUE,
    scrip_code           INTEGER,
    type_of_instrument   VARCHAR(50),
    market_category      CHAR(1),
    electronic_share     CHAR(1),
    authorized_capital   NUMERIC(18, 2),
    paid_up_capital      NUMERIC(18, 2),
    face_value           NUMERIC(18, 2),
    market_lot           INTEGER,
    total_outstanding_securities BIGINT,
    sector               VARCHAR(255),
    debut_trading_date   DATE,
    listing_year         INTEGER,
    address              VARCHAR(2500),
    factory_address      VARCHAR(255),
    phone                VARCHAR(255),
    fax                  VARCHAR(255),
    email                VARCHAR(255),
    website              VARCHAR(255),
    company_secretary_name VARCHAR(255),
    company_secretary_email VARCHAR(255),
    company_secretary_cell_no VARCHAR(255),
    reserve_and_surplus  NUMERIC(18, 2),
    year_end             VARCHAR(25),
    last_agm_date        DATE,
    fifty_two_weeks_moving_range VARCHAR(100)
);

-- =============================
-- 2. Historical Price Data (OHLCV)
-- =============================
CREATE TABLE candlestick (
    symbol      VARCHAR(15) NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    open        DOUBLE PRECISION,
    high        DOUBLE PRECISION,
    low         DOUBLE PRECISION,
    close       DOUBLE PRECISION,
    volume      BIGINT,
    trades      BIGINT,
    value       DOUBLE PRECISION DEFAULT 0,
    PRIMARY KEY (symbol, timestamp)
);
CREATE INDEX idx_candlestick_symbol_timestamp ON candlestick(symbol, timestamp DESC);

-- =============================
-- 3. Corporate Actions
-- =============================
CREATE TABLE dividend_information (
    dividend_id    SERIAL PRIMARY KEY,
    company_id     INTEGER REFERENCES company(company_id),
    year           INTEGER,
    cash_dividend  NUMERIC(18, 2),
    stock_dividend VARCHAR(50),
    right_issue    VARCHAR(250),
    nav            NUMERIC(18, 2)
);

-- =============================
-- 4. Financial Performance
-- =============================
CREATE TABLE financial_performance (
    performance_id SERIAL PRIMARY KEY,
    company_id     INTEGER REFERENCES company(company_id),
    year           INTEGER,
    eps_basic      NUMERIC(18, 2),
    eps_diluted    NUMERIC(18, 2),
    nav_per_share  NUMERIC(18, 2),
    profit         NUMERIC(18, 2),
    total_comprehensive_income NUMERIC(18, 2),
    earnings_per_share_continuing_operations NUMERIC(18, 2),
    pe_ratio       NUMERIC(18, 2)
);

-- =============================
-- 5. Quarterly Performance
-- =============================
CREATE TABLE quarterly_performance (
    quarterly_id            SERIAL PRIMARY KEY,
    company_id              INTEGER REFERENCES company(company_id),
    quarter                 VARCHAR(20),
    eps_basic               NUMERIC(18, 2),
    eps_diluted             NUMERIC(18, 2),
    market_price_end_period NUMERIC(18, 2),
    date                    DATE
);

-- =============================
-- 6. Shareholding Structure
-- =============================
CREATE TABLE share_holding (
    holding_id       SERIAL PRIMARY KEY,
    company_id       INTEGER REFERENCES company(company_id),
    date             DATE,
    sponsor_director NUMERIC(5, 2),
    government       NUMERIC(5, 2),
    institute        NUMERIC(5, 2),
    foreign_holder   NUMERIC(5, 2),
    public_holder    NUMERIC(5, 2)
);

-- =============================
-- 7. Loan Status
-- =============================
CREATE TABLE loan_status (
    loan_id         SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES company(company_id),
    date            DATE,
    short_term_loan NUMERIC(18, 2),
    long_term_loan  NUMERIC(18, 2)
);

-- =============================
-- 8. Market Information (Daily Summary)
-- =============================
CREATE TABLE market_information (
    market_info_id          SERIAL PRIMARY KEY,
    company_id              INTEGER REFERENCES company(company_id),
    date                    DATE,
    last_trading_price      NUMERIC(18, 2),
    closing_price           NUMERIC(18, 2),
    opening_price           NUMERIC(18, 2),
    adjusted_opening_price  NUMERIC(18, 2),
    days_range              VARCHAR(50),
    change                  NUMERIC(18, 2),
    days_value              NUMERIC(18, 2),
    days_volume             INTEGER,
    days_trade              INTEGER,
    market_capitalization   NUMERIC(18, 2),
    yesterday_closing_price NUMERIC(18, 2)
);

-- =============================
-- 9. Trade Data (Tick/Transaction Level)
-- =============================
CREATE TABLE trade (
    trade_id        SERIAL PRIMARY KEY,
    symbol          VARCHAR(15) NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL,
    match_number    TEXT NOT NULL,
    executed_qty    BIGINT,
    printable       VARCHAR(1),
    execution_price DOUBLE PRECISION
);
CREATE INDEX idx_trade_symbol_timestamp ON trade(symbol, timestamp DESC);
CREATE UNIQUE INDEX unique_trade_match_number ON trade(match_number, timestamp);

-- =============================
-- 10. Time and Sales (Order Book Events)
-- =============================
CREATE TABLE time_and_sales (
    id           SERIAL PRIMARY KEY,
    symbol       VARCHAR(15),
    side         VARCHAR(10),
    time         TIMESTAMP NOT NULL,
    quantity     BIGINT,
    price        DOUBLE PRECISION,
    order_number VARCHAR(50),
    match_number TEXT
);

-- =============================
-- 11. Order Events (For Backtesting/Simulation)
-- =============================
CREATE TABLE order_events (
    event_id               SERIAL PRIMARY KEY,
    time_for_aggregation   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    symbol                 VARCHAR(15),
    price                  DOUBLE PRECISION,
    quantity               BIGINT,
    order_number           BIGINT NOT NULL,
    order_side             VARCHAR(10),
    new_order_number       BIGINT,
    deleted                BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_order_events_time ON order_events(time_for_aggregation DESC);
CREATE INDEX idx_order_events_order_number ON order_events(order_number);

-- =============================
-- 12. News and Fundamentals
-- =============================
CREATE TABLE news (
    news_id       BIGSERIAL PRIMARY KEY,
    company_id    INTEGER REFERENCES company(company_id),
    title         VARCHAR(255),
    reference     VARCHAR(250),
    news_text     VARCHAR(550),
    timestamp     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closing_price DOUBLE PRECISION,
    change_pct    DOUBLE PRECISION,
    sentiment     VARCHAR(20) -- e.g., positive/negative/neutral (optional, for AI)
);

-- =============================
-- 13. Watchlist
-- =============================
CREATE TABLE watchlist (
    id          SERIAL PRIMARY KEY,
    client_id   VARCHAR(10),
    title       VARCHAR(30),
    description VARCHAR(256),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_on  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE watchlist_stocks (
    id           SERIAL PRIMARY KEY,
    watchlist_id INTEGER REFERENCES watchlist ON DELETE CASCADE,
    symbol       VARCHAR(15)
);

-- =============================
-- 14. Outbox Events (For Event-Driven Architecture)
-- =============================
CREATE TABLE outbox_events (
    id         SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    symbol     VARCHAR(15) NOT NULL,
    published  BOOLEAN DEFAULT FALSE NOT NULL,
    event_time TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================
-- 15. Market Status
-- =============================
CREATE TABLE market_status (
    last_updated       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    current_event_code VARCHAR(255),
    group_name         VARCHAR(20) PRIMARY KEY
);

-- =============================
-- 16. Technical Indicators (Optional, can be computed on-the-fly)
-- =============================
-- Example: Store precomputed indicators for fast access
CREATE TABLE technical_indicators (
    id         SERIAL PRIMARY KEY,
    symbol     VARCHAR(15) NOT NULL,
    timestamp  TIMESTAMPTZ NOT NULL,
    sma_20     DOUBLE PRECISION,
    sma_50     DOUBLE PRECISION,
    rsi_14     DOUBLE PRECISION,
    macd       DOUBLE PRECISION,
    bollinger_upper DOUBLE PRECISION,
    bollinger_lower DOUBLE PRECISION,
    UNIQUE(symbol, timestamp)
);

-- =============================
-- 17. Backtest Results (Optional)
-- =============================
CREATE TABLE backtest_results (
    id              SERIAL PRIMARY KEY,
    strategy_name   VARCHAR(100),
    symbol          VARCHAR(15),
    start_date      DATE,
    end_date        DATE,
    sharpe_ratio    DOUBLE PRECISION,
    max_drawdown    DOUBLE PRECISION,
    cagr            DOUBLE PRECISION,
    total_return    DOUBLE PRECISION,
    details         JSONB
);

-- =============================
-- 18. User Table (Optional, for multi-user platform)
-- =============================
CREATE TABLE app_user (
    user_id    SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- 19. Miscellaneous/Reference Tables
-- =============================
-- Add as needed for sectors, instrument types, etc.

-- =============================
-- End of Schema
-- ============================= 