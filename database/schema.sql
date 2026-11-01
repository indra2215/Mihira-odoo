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

    -- Constraint enforcing E.164 international phone format (+ followed by 8 to 15 digits)
    CONSTRAINT valid_customer_phone
        CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),

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


-- ------------------------------------------------------------------------------
-- 5. TECHNICIANS TABLE (FIELD CREW & SOLAR ENGINEERS)
-- Stores people working in the field conducting surveys and installations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technicians (
    -- Auto-incrementing primary key ID
    id SERIAL PRIMARY KEY,

    -- Technician full name
    name VARCHAR(255) NOT NULL,

    -- Unique contact phone number
    phone VARCHAR(32) NOT NULL UNIQUE,

    -- Constraint enforcing E.164 international phone format (+ followed by 8 to 15 digits)
    CONSTRAINT valid_technician_phone
        CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),

    -- Optional email address
    email VARCHAR(255),

    -- Primary technical role / specialization
    specialization VARCHAR(64) NOT NULL DEFAULT 'solar_electrician'
        CHECK (specialization IN ('solar_electrician', 'site_surveyor', 'mounting_specialist', 'commissioning_engineer')),

    -- Availability status: 'available', 'on_site', or 'off_duty'
    status VARCHAR(32) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'on_site', 'off_duty')),

    -- Creation timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Last update timestamp (maintained by trigger)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on phone for fast lookup
CREATE INDEX IF NOT EXISTS idx_technicians_phone ON technicians(phone);

-- Index on status to quickly filter available staff
CREATE INDEX IF NOT EXISTS idx_technicians_status ON technicians(status);

-- Attach automated updated_at trigger to technicians table
DROP TRIGGER IF EXISTS trigger_technicians_updated_at ON technicians;
CREATE TRIGGER trigger_technicians_updated_at
    BEFORE UPDATE ON technicians
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- 6. TECHNICIAN ASSIGNMENTS TABLE (TASKS & KIT READINESS)
-- Tracks scheduled tasks assigned to technicians with associated toolkit readiness
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technician_assignments (
    -- Auto-incrementing primary key ID
    id SERIAL PRIMARY KEY,

    -- Foreign key to assigned technician (cascades on delete)
    technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,

    -- Foreign key to associated lead / solar project (cascades on delete)
    lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

    -- Type of job assigned
    task_type VARCHAR(64) NOT NULL DEFAULT 'site_survey'
        CHECK (task_type IN ('site_survey', 'structure_mounting', 'panel_wiring', 'inverter_installation', 'grid_commissioning')),

    -- Scheduled execution date
    scheduled_date DATE NOT NULL,

    -- Equipment and toolkit readiness stage: 'kit_ready', 'pending', or 'dispatched'
    kit_status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (kit_status IN ('kit_ready', 'pending', 'dispatched')),

    -- Detailed checklist of tools, safety gear, and materials prepared in the kit
    kit_items TEXT NOT NULL DEFAULT '',

    -- Execution lifecycle stage: 'assigned', 'in_progress', 'completed', 'cancelled'
    status VARCHAR(32) NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),

    -- Field notes, instructions, or customer roof access directions
    notes TEXT DEFAULT '',

    -- Creation timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Last update timestamp (maintained by trigger)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Composite index on technician and scheduled date for calendar lookups
CREATE INDEX IF NOT EXISTS idx_tech_assign_technician_date ON technician_assignments(technician_id, scheduled_date);

-- Index on lead_id to look up assignments for a specific project
CREATE INDEX IF NOT EXISTS idx_tech_assign_lead ON technician_assignments(lead_id);

-- Index on kit_status to filter jobs needing kit preparation
CREATE INDEX IF NOT EXISTS idx_tech_assign_kit_status ON technician_assignments(kit_status);

-- Attach automated updated_at trigger to assignments table
DROP TRIGGER IF EXISTS trigger_tech_assign_updated_at ON technician_assignments;
CREATE TRIGGER trigger_tech_assign_updated_at
    BEFORE UPDATE ON technician_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
