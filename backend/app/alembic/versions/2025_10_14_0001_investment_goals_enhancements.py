"""Add investment goals enhancements

Revision ID: 2025_10_14_0001
Revises: 2025_10_08_0001
Create Date: 2025-10-14 10:00:00.000000

This migration adds comprehensive fields to support advanced Investment Goals Tracker features:
- Risk appetite and current savings
- SIP tracking and calculations
- Asset allocation recommendations
- Portfolio linking
- Auto-rebalancing support
- Progress tracking fields
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_10_14_0001'
down_revision = '2025_10_08_0001'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to userinvestmentgoal table
    op.add_column('userinvestmentgoal', sa.Column('current_savings', sa.Numeric(precision=15, scale=2), nullable=True, comment='Current amount saved towards this goal'))
    op.add_column('userinvestmentgoal', sa.Column('risk_appetite', sa.String(20), nullable=True, comment='CONSERVATIVE, MODERATE, AGGRESSIVE'))
    op.add_column('userinvestmentgoal', sa.Column('monthly_sip_required', sa.Numeric(precision=15, scale=2), nullable=True, comment='Calculated monthly SIP amount required'))
    op.add_column('userinvestmentgoal', sa.Column('current_monthly_sip', sa.Numeric(precision=15, scale=2), nullable=True, comment='Actual current monthly SIP amount'))

    # Asset allocation fields (stored as percentages)
    op.add_column('userinvestmentgoal', sa.Column('equity_allocation', sa.Numeric(5, 2), nullable=True, comment='Recommended equity allocation %'))
    op.add_column('userinvestmentgoal', sa.Column('debt_allocation', sa.Numeric(5, 2), nullable=True, comment='Recommended debt allocation %'))
    op.add_column('userinvestmentgoal', sa.Column('gold_allocation', sa.Numeric(5, 2), nullable=True, comment='Recommended gold allocation %'))
    op.add_column('userinvestmentgoal', sa.Column('cash_allocation', sa.Numeric(5, 2), nullable=True, comment='Recommended cash allocation %'))

    # Return expectations
    op.add_column('userinvestmentgoal', sa.Column('expected_return_min', sa.Numeric(5, 2), nullable=True, comment='Expected minimum return % p.a.'))
    op.add_column('userinvestmentgoal', sa.Column('expected_return_max', sa.Numeric(5, 2), nullable=True, comment='Expected maximum return % p.a.'))
    op.add_column('userinvestmentgoal', sa.Column('expected_return_avg', sa.Numeric(5, 2), nullable=True, comment='Expected average return % p.a.'))

    # Goal achievement probability (Monte Carlo simulation result)
    op.add_column('userinvestmentgoal', sa.Column('probability_achievement', sa.Numeric(5, 2), nullable=True, comment='Probability of achieving goal (0-100%)'))
    op.add_column('userinvestmentgoal', sa.Column('projected_final_value', sa.Numeric(15, 2), nullable=True, comment='Projected final value at target date'))

    # Portfolio linking
    op.add_column('userinvestmentgoal', sa.Column('linked_portfolio_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Portfolio linked to this goal'))
    op.create_foreign_key('fk_goal_portfolio', 'userinvestmentgoal', 'portfolio', ['linked_portfolio_id'], ['id'], ondelete='SET NULL')

    # Auto-rebalancing
    op.add_column('userinvestmentgoal', sa.Column('auto_rebalance_enabled', sa.Boolean(), nullable=False, server_default='false', comment='Enable automatic rebalancing'))
    op.add_column('userinvestmentgoal', sa.Column('rebalance_threshold', sa.Numeric(5, 2), nullable=True, comment='Rebalance when drift exceeds this % (default 5%)'))
    op.add_column('userinvestmentgoal', sa.Column('last_rebalance_date', sa.DateTime(), nullable=True, comment='Last time portfolio was rebalanced'))
    op.add_column('userinvestmentgoal', sa.Column('next_rebalance_date', sa.DateTime(), nullable=True, comment='Next scheduled rebalance date'))

    # Tracking fields
    op.add_column('userinvestmentgoal', sa.Column('current_value', sa.Numeric(15, 2), nullable=True, comment='Current total value (contributions + growth)'))
    op.add_column('userinvestmentgoal', sa.Column('total_contributions', sa.Numeric(15, 2), nullable=True, comment='Sum of all contributions'))
    op.add_column('userinvestmentgoal', sa.Column('total_returns', sa.Numeric(15, 2), nullable=True, comment='Total returns generated'))
    op.add_column('userinvestmentgoal', sa.Column('last_reviewed_date', sa.DateTime(), nullable=True, comment='Last time user reviewed this goal'))

    # Progress metrics
    op.add_column('userinvestmentgoal', sa.Column('progress_percentage', sa.Numeric(5, 2), nullable=True, comment='Progress towards goal (0-100%)'))
    op.add_column('userinvestmentgoal', sa.Column('on_track_status', sa.String(20), nullable=True, comment='ON_TRACK, BEHIND, AHEAD'))
    op.add_column('userinvestmentgoal', sa.Column('shortfall_amount', sa.Numeric(15, 2), nullable=True, comment='Amount short of target (if behind)'))

    # Milestone tracking
    op.add_column('userinvestmentgoal', sa.Column('milestones', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Achievement milestones (25%, 50%, 75%, 100%)'))

    # Create indexes for performance
    op.create_index('ix_goal_risk_appetite', 'userinvestmentgoal', ['risk_appetite'])
    op.create_index('ix_goal_on_track_status', 'userinvestmentgoal', ['on_track_status'])
    op.create_index('ix_goal_linked_portfolio', 'userinvestmentgoal', ['linked_portfolio_id'])
    op.create_index('ix_goal_target_date', 'userinvestmentgoal', ['target_date'])
    op.create_index('ix_goal_auto_rebalance', 'userinvestmentgoal', ['auto_rebalance_enabled'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_goal_auto_rebalance', 'userinvestmentgoal')
    op.drop_index('ix_goal_target_date', 'userinvestmentgoal')
    op.drop_index('ix_goal_linked_portfolio', 'userinvestmentgoal')
    op.drop_index('ix_goal_on_track_status', 'userinvestmentgoal')
    op.drop_index('ix_goal_risk_appetite', 'userinvestmentgoal')

    # Drop foreign key
    op.drop_constraint('fk_goal_portfolio', 'userinvestmentgoal', type_='foreignkey')

    # Drop columns
    op.drop_column('userinvestmentgoal', 'milestones')
    op.drop_column('userinvestmentgoal', 'shortfall_amount')
    op.drop_column('userinvestmentgoal', 'on_track_status')
    op.drop_column('userinvestmentgoal', 'progress_percentage')
    op.drop_column('userinvestmentgoal', 'last_reviewed_date')
    op.drop_column('userinvestmentgoal', 'total_returns')
    op.drop_column('userinvestmentgoal', 'total_contributions')
    op.drop_column('userinvestmentgoal', 'current_value')
    op.drop_column('userinvestmentgoal', 'next_rebalance_date')
    op.drop_column('userinvestmentgoal', 'last_rebalance_date')
    op.drop_column('userinvestmentgoal', 'rebalance_threshold')
    op.drop_column('userinvestmentgoal', 'auto_rebalance_enabled')
    op.drop_column('userinvestmentgoal', 'linked_portfolio_id')
    op.drop_column('userinvestmentgoal', 'projected_final_value')
    op.drop_column('userinvestmentgoal', 'probability_achievement')
    op.drop_column('userinvestmentgoal', 'expected_return_avg')
    op.drop_column('userinvestmentgoal', 'expected_return_max')
    op.drop_column('userinvestmentgoal', 'expected_return_min')
    op.drop_column('userinvestmentgoal', 'cash_allocation')
    op.drop_column('userinvestmentgoal', 'gold_allocation')
    op.drop_column('userinvestmentgoal', 'debt_allocation')
    op.drop_column('userinvestmentgoal', 'equity_allocation')
    op.drop_column('userinvestmentgoal', 'current_monthly_sip')
    op.drop_column('userinvestmentgoal', 'monthly_sip_required')
    op.drop_column('userinvestmentgoal', 'risk_appetite')
    op.drop_column('userinvestmentgoal', 'current_savings')

