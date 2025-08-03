"""ensure_all_tables

Revision ID: 2024_01_20_1000
Revises: fc41cbbd796f
Create Date: 2024-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2024_01_20_1000'
down_revision = 'fc41cbbd796f'
branch_labels = None
depends_on = None


def upgrade():
    # Create portfolio table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS portfolio (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            is_default BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES "user"(id)
        );
    """)
    
    # Create portfolio_position table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS portfolioposition (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            portfolio_id UUID NOT NULL,
            stock_id UUID NOT NULL,
            quantity INTEGER DEFAULT 0,
            average_price DECIMAL(10,2) NOT NULL,
            total_investment DECIMAL(15,2) NOT NULL,
            current_value DECIMAL(15,2) DEFAULT 0,
            unrealized_pnl DECIMAL(15,2) DEFAULT 0,
            unrealized_pnl_percent DECIMAL(5,2) DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (portfolio_id) REFERENCES portfolio(id),
            FOREIGN KEY (stock_id) REFERENCES stockcompany(id)
        );
    """)
    
    # Create watchlist table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            is_default BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES "user"(id)
        );
    """)
    
    # Create watchlist_item table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS watchlistitem (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            watchlist_id UUID NOT NULL,
            stock_id UUID NOT NULL,
            added_at TIMESTAMP DEFAULT NOW(),
            notes VARCHAR(500),
            FOREIGN KEY (watchlist_id) REFERENCES watchlist(id),
            FOREIGN KEY (stock_id) REFERENCES stockcompany(id)
        );
    """)
    
    # Create trade table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS trade (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            portfolio_id UUID,
            stock_id UUID NOT NULL,
            trade_type VARCHAR(10) NOT NULL,
            quantity INTEGER DEFAULT 0,
            price DECIMAL(10,2) NOT NULL,
            total_amount DECIMAL(15,2) NOT NULL,
            commission DECIMAL(10,2) DEFAULT 0,
            net_amount DECIMAL(15,2) NOT NULL,
            trade_date TIMESTAMP DEFAULT NOW(),
            notes VARCHAR(500),
            is_simulated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (portfolio_id) REFERENCES portfolio(id),
            FOREIGN KEY (stock_id) REFERENCES stockcompany(id)
        );
    """)
    
    # Ensure order table exists (some may be created already)
    op.execute("""
        CREATE TABLE IF NOT EXISTS "order" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            portfolio_id UUID,
            stock_id UUID NOT NULL,
            order_type VARCHAR(20) NOT NULL,
            side VARCHAR(10) NOT NULL,
            quantity INTEGER NOT NULL,
            price DECIMAL(10,2),
            stop_price DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'PENDING',
            validity VARCHAR(10) DEFAULT 'DAY',
            filled_quantity INTEGER DEFAULT 0,
            remaining_quantity INTEGER,
            avg_fill_price DECIMAL(10,2),
            commission DECIMAL(10,2) DEFAULT 0,
            total_commission DECIMAL(10,2) DEFAULT 0,
            placed_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            executed_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            notes VARCHAR(500),
            is_simulated BOOLEAN DEFAULT FALSE,
            FOREIGN KEY (user_id) REFERENCES "user"(id),
            FOREIGN KEY (portfolio_id) REFERENCES portfolio(id),
            FOREIGN KEY (stock_id) REFERENCES stockcompany(id)
        );
    """)
    
    # Create order_execution table if it doesn't exist
    op.execute("""
        CREATE TABLE IF NOT EXISTS orderexecution (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL,
            execution_price DECIMAL(10,2) NOT NULL,
            execution_quantity INTEGER NOT NULL,
            execution_time TIMESTAMP DEFAULT NOW(),
            commission DECIMAL(10,2) DEFAULT 0,
            exchange_order_id VARCHAR(100),
            notes VARCHAR(500),
            FOREIGN KEY (order_id) REFERENCES "order"(id)
        );
    """)
    
    # Create indexes for better performance
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);
        CREATE INDEX IF NOT EXISTS idx_portfolioposition_portfolio_id ON portfolioposition(portfolio_id);
        CREATE INDEX IF NOT EXISTS idx_portfolioposition_stock_id ON portfolioposition(stock_id);
        CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
        CREATE INDEX IF NOT EXISTS idx_watchlistitem_watchlist_id ON watchlistitem(watchlist_id);
        CREATE INDEX IF NOT EXISTS idx_watchlistitem_stock_id ON watchlistitem(stock_id);
        CREATE INDEX IF NOT EXISTS idx_trade_portfolio_id ON trade(portfolio_id);
        CREATE INDEX IF NOT EXISTS idx_trade_stock_id ON trade(stock_id);
        CREATE INDEX IF NOT EXISTS idx_trade_trade_date ON trade(trade_date);
        CREATE INDEX IF NOT EXISTS idx_order_user_id ON "order"(user_id);
        CREATE INDEX IF NOT EXISTS idx_order_portfolio_id ON "order"(portfolio_id);
        CREATE INDEX IF NOT EXISTS idx_order_stock_id ON "order"(stock_id);
        CREATE INDEX IF NOT EXISTS idx_order_status ON "order"(status);
        CREATE INDEX IF NOT EXISTS idx_orderexecution_order_id ON orderexecution(order_id);
    """)
    
    # Add triggers for updated_at columns
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_portfolio_updated_at ON portfolio;
        CREATE TRIGGER update_portfolio_updated_at
            BEFORE UPDATE ON portfolio
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;
        CREATE TRIGGER update_watchlist_updated_at
            BEFORE UPDATE ON watchlist
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)
    
    op.execute("""
        DROP TRIGGER IF EXISTS update_order_updated_at ON "order";
        CREATE TRIGGER update_order_updated_at
            BEFORE UPDATE ON "order"
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade():
    # Drop tables in reverse order to handle foreign key constraints
    op.execute("DROP TABLE IF EXISTS orderexecution CASCADE;")
    op.execute("DROP TABLE IF EXISTS \"order\" CASCADE;")
    op.execute("DROP TABLE IF EXISTS trade CASCADE;")
    op.execute("DROP TABLE IF EXISTS watchlistitem CASCADE;")
    op.execute("DROP TABLE IF EXISTS watchlist CASCADE;")
    op.execute("DROP TABLE IF EXISTS portfolioposition CASCADE;")
    op.execute("DROP TABLE IF EXISTS portfolio CASCADE;")
    
    # Drop triggers and function
    op.execute("DROP TRIGGER IF EXISTS update_portfolio_updated_at ON portfolio;")
    op.execute("DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;")
    op.execute("DROP TRIGGER IF EXISTS update_order_updated_at ON \"order\";")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")