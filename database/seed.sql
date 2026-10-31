-- ==============================================================================
-- MIHIRA SOLAR ERP - SEED DATA (PostgreSQL 16)
-- ==============================================================================
-- Purpose:
-- Inserts realistic sample data demonstrating both:
--  1. A Google Form submission
--  2. A manual phone call intake by a staff member
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Insert Sample Customers
-- ------------------------------------------------------------------------------
INSERT INTO customers (id, name, phone, email, address) VALUES
-- Customer 1: Registered via Google Form
(1, 'Rahul Sharma', '+919876543210', 'rahul.sharma@example.com', 'Plot 42, Jubilee Hills, Hyderabad'),

-- Customer 2: Registered via manual phone call intake
(2, 'Priya Patel', '+919812345678', 'priya.patel@example.com', 'Flat 304, Green Acres, Ahmedabad')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Insert Sample Leads
-- ------------------------------------------------------------------------------
-- Lead 1: Captured automatically from Google Forms (source: 'google_form')
INSERT INTO leads (id, customer_id, source, status, monthly_units, monthly_bill, sanctioned_load_kw, roof_area_sqm, notes) VALUES
(
    1,                                                                          -- Lead ID
    1,                                                                          -- Foreign key to customer #1 (Rahul Sharma)
    'google_form',                                                              -- Source: Google Form
    'new',                                                                      -- Initial status
    450.00,                                                                     -- 450 kWh per month
    4200.00,                                                                    -- ₹4,200 monthly bill
    5.00,                                                                       -- 5 kW sanctioned load
    45.00,                                                                      -- 45 m² shadow-free roof
    'Submitted via Google Form: Interested in On-Grid 3kW system to reduce summer electricity bills.' -- Form notes
)
ON CONFLICT (id) DO NOTHING;

-- Lead 2: Captured manually by a staff member during a phone call (source: 'manual_intake')
INSERT INTO leads (id, customer_id, source, status, monthly_units, monthly_bill, sanctioned_load_kw, roof_area_sqm, notes) VALUES
(
    2,                                                                          -- Lead ID
    2,                                                                          -- Foreign key to customer #2 (Priya Patel)
    'manual_intake',                                                            -- Source: Manual Call Intake
    'contacted',                                                                -- Status: Staff has called back
    650.00,                                                                     -- 650 kWh per month
    5800.00,                                                                    -- ₹5,800 monthly bill
    7.00,                                                                       -- 7 kW sanctioned load
    70.00,                                                                      -- 70 m² RCC roof
    'Phone intake by Sales Rep: Customer has RCC roof, shadow-free, requested site survey on Saturday.' -- Staff notes
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. Reset PostgreSQL Auto-Increment Sequences
-- Ensures subsequent INSERT statements without explicit IDs generate IDs starting from 3
-- ------------------------------------------------------------------------------
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('leads_id_seq', (SELECT MAX(id) FROM leads));
