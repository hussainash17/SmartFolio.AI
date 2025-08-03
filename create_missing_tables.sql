-- Create missing tables for KYC functionality
-- This script creates the kycinformation, useraccount, and userinvestmentgoal tables

-- First check if the user table exists (it should)
-- If not, this will fail and indicate a bigger issue

-- Create KYCInformation table
CREATE TABLE IF NOT EXISTS kycinformation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth TIMESTAMP NOT NULL,
    ssn_last_four VARCHAR(4) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    street_address VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'USA',
    employer_name VARCHAR(200),
    occupation VARCHAR(100),
    annual_income INTEGER,
    employment_status VARCHAR(50),
    net_worth INTEGER,
    liquid_net_worth INTEGER,
    investment_experience VARCHAR(50),
    kyc_status VARCHAR NOT NULL DEFAULT 'PENDING',
    verification_date TIMESTAMP,
    expiry_date TIMESTAMP,
    rejection_reason VARCHAR(500),
    documents JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

-- Create UserAccount table
CREATE TABLE IF NOT EXISTS useraccount (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_type VARCHAR NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50),
    joint_holder_name VARCHAR(200),
    joint_holder_ssn VARCHAR(11),
    contribution_limit INTEGER,
    current_year_contributions INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

-- Create UserInvestmentGoal table
CREATE TABLE IF NOT EXISTS userinvestmentgoal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    goal_type VARCHAR NOT NULL,
    target_amount INTEGER,
    target_date TIMESTAMP,
    priority INTEGER NOT NULL DEFAULT 1,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kycinformation_user_id ON kycinformation(user_id);
CREATE INDEX IF NOT EXISTS idx_useraccount_user_id ON useraccount(user_id);
CREATE INDEX IF NOT EXISTS idx_userinvestmentgoal_user_id ON userinvestmentgoal(user_id);

-- Show the created tables
SELECT 'Tables created successfully. Here are the new tables:' as result;
\dt kycinformation
\dt useraccount  
\dt userinvestmentgoal