-- ==============================================================================
-- MIHIRA SOLAR ERP - DATABASE SCHEMA (PostgreSQL 16)
-- ==============================================================================
-- Purpose:
-- Defines tables to store Customer profiles, Leads captured from Google Forms or
-- manual staff phone intake, and raw incoming webhook submissions.
-- Includes relational constraints, performance indexes, and automated triggers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUTOMATED TIMESTAMP TRIGGER FUNCTION
-- Automatically sets updated_at = CURRENT_TIMESTAMP on any row UPDATE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- Stores unique customer profiles identified by phone number.
-- Shared across multiple leads if the customer enquired multiple times.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    -- Auto-incrementing primary key ID
    id SERIAL PRIMARY KEY,

    -- Customer full name
    name VARCHAR(255) NOT NULL,

    -- Unique phone number (used to prevent duplicate records)
    phone VARCHAR(32) NOT NULL UNIQUE,

    -- Optional email address
    email VARCHAR(255),

    -- Physical address of the rooftop installation site
    address TEXT,

    -- Auto-generated creation timestamp with timezone
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Timestamp tracking the last profile update (maintained by trigger)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on phone number for O(1) customer lookups during intake
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Attach automated updated_at trigger to customers table
DROP TRIGGER IF EXISTS trigger_customers_updated_at ON customers;
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 3. LEADS TABLE
-- Stores solar installation enquiry details from:
--  - 'google_form': Submitted via Google Forms webhook
--  - 'manual_intake': Entered by staff while speaking on a phone call
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    -- Auto-incrementing primary key ID
    id SERIAL PRIMARY KEY,

    -- Foreign key referencing the customer table (cascades if customer is deleted)
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

    -- Source of the enquiry: either 'google_form' or 'manual_intake'
    source VARCHAR(32) NOT NULL DEFAULT 'manual_intake'
        CHECK (source IN ('google_form', 'manual_intake')),

    -- Lifecycle stage: 'new', 'contacted', 'survey_scheduled', 'closed', 'lost'
    status VARCHAR(32) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'survey_scheduled', 'closed', 'lost')),

    -- Electricity consumption per month in units (kWh)
    monthly_units NUMERIC(10, 2)
        CHECK (monthly_units IS NULL OR monthly_units >= 0),

    -- Electricity bill amount in INR (₹)
    monthly_bill NUMERIC(12, 2)
        CHECK (monthly_bill IS NULL OR monthly_bill >= 0),

    -- Sanctioned load from the electricity meter in kW
    sanctioned_load_kw NUMERIC(6, 2)
        CHECK (sanctioned_load_kw IS NULL OR sanctioned_load_kw >= 0),

    -- Available shadow-free rooftop area in square meters (m²)
    roof_area_sqm NUMERIC(8, 2)
        CHECK (roof_area_sqm IS NULL OR roof_area_sqm >= 0),

    -- Staff remarks, customer preferences, or open text comments
    notes TEXT,

    -- Creation timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Last update timestamp (maintained by trigger)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on source column to filter Google Forms vs Manual Intake efficiently
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Create index on status column for fast pipeline stage filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Create index on created_at column for reverse chronological sorting
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Create composite index on customer_id and created_at for fast customer history queries
CREATE INDEX IF NOT EXISTS idx_leads_customer_created ON leads(customer_id, created_at DESC);

-- Attach automated updated_at trigger to leads table
DROP TRIGGER IF EXISTS trigger_leads_updated_at ON leads;
CREATE TRIGGER trigger_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 4. INBOUND SUBMISSIONS TABLE (RAW AUDIT LOG)
-- Stores exact, untouched raw JSON payloads received from Google Forms webhooks.
-- Ensures zero data loss even if field mappings change or fail.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inbound_submissions (
    -- Auto-incrementing primary key ID
    id SERIAL PRIMARY KEY,

    -- Origin source identifier (e.g. 'google_form')
    source VARCHAR(64) NOT NULL,

    -- Exact raw JSON payload received from the webhook
    raw_payload JSONB NOT NULL,

    -- Processing status flag (true = successfully parsed into customer and lead)
    processed BOOLEAN NOT NULL DEFAULT true,

    -- Error details if payload validation or parsing failed
    error_message TEXT,

    -- Timestamp when the webhook hit the server
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create GIN index on raw_payload JSONB to support fast searches inside nested JSON keys
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_raw_payload ON inbound_submissions USING GIN (raw_payload);

-- Create index on received_at for audit trail chronological review
CREATE INDEX IF NOT EXISTS idx_inbound_submissions_received_at ON inbound_submissions(received_at DESC);
