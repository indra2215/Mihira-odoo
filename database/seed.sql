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
-- 3. Insert Sample Technicians (Field Staff)
-- ------------------------------------------------------------------------------
INSERT INTO technicians (id, name, phone, email, specialization, status) VALUES
(
    1,
    'Ramesh Rao',
    '+919876500001',
    'ramesh.rao@mihirasolar.com',
    'site_surveyor',
    'available'
),
(
    2,
    'Vikram Singh',
    '+919876500002',
    'vikram.singh@mihirasolar.com',
    'solar_electrician',
    'on_site'
),
(
    3,
    'Anita Desai',
    '+919876500003',
    'anita.desai@mihirasolar.com',
    'commissioning_engineer',
    'available'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. Insert Sample Technician Task Assignments & Kit Readiness
-- ------------------------------------------------------------------------------
INSERT INTO technician_assignments (id, technician_id, lead_id, task_type, scheduled_date, kit_status, kit_items, status, notes) VALUES
(
    1,
    1, -- Assigned to Ramesh Rao (Site Surveyor)
    1, -- For Lead #1 (Rahul Sharma)
    'site_survey',
    CURRENT_DATE + INTERVAL '1 day',
    'kit_ready',
    'Digital Inclinometer, Laser Distance Meter, Drone for Shading Analysis, Safety Helmet, Measuring Tape (30m)',
    'assigned',
    'Customer confirmed morning visit at 10 AM. Check South-facing shadow on RCC parapet.'
),
(
    2,
    2, -- Assigned to Vikram Singh (Solar Electrician)
    2, -- For Lead #2 (Priya Patel)
    'inverter_installation',
    CURRENT_DATE,
    'dispatched',
    '3.3kW On-Grid Inverter, 4mm² Solar DC Cable (50m), MC4 Crimping Kit, AC/DC Distribution Box, Earthing Rods (2x)',
    'in_progress',
    'Customer requested inverter to be mounted in covered utility corridor near main DB.'
)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. Reset PostgreSQL Auto-Increment Sequences
-- Ensures subsequent INSERT statements without explicit IDs generate IDs starting from MAX+1
-- ------------------------------------------------------------------------------
SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));
SELECT setval('leads_id_seq', (SELECT MAX(id) FROM leads));
SELECT setval('technicians_id_seq', (SELECT MAX(id) FROM technicians));
SELECT setval('technician_assignments_id_seq', (SELECT MAX(id) FROM technician_assignments));
