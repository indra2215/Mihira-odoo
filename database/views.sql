-- ==============================================================================
-- MIHIRA SOLAR ERP - DATABASE VIEWS & REPORTING QUERIES (PostgreSQL 16)
-- ==============================================================================
-- Purpose:
-- Provides pre-joined and aggregated SQL views for fast reporting, analytics,
-- and administrative dashboards without requiring custom application code.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DETAILED LEADS VIEW (v_leads_detailed)
-- Joins leads with customer profiles so reporting queries get full contact info
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_leads_detailed AS
SELECT
    l.id AS lead_id,                                    -- Primary lead identifier
    c.id AS customer_id,                                -- Foreign key to customer
    c.name AS customer_name,                            -- Customer full name
    c.phone AS customer_phone,                          -- Customer contact phone number
    c.email AS customer_email,                          -- Customer email address (optional)
    c.address AS site_address,                          -- Rooftop site physical address
    l.source AS lead_source,                            -- 'google_form' or 'manual_intake'
    l.status AS lead_status,                            -- Pipeline stage
    l.monthly_units,                                    -- Monthly consumption in kWh
    l.monthly_bill,                                     -- Monthly bill amount in INR (₹)
    l.sanctioned_load_kw,                               -- Sanctioned meter load in kW
    l.roof_area_sqm,                                    -- Shadow-free usable rooftop area in m²
    -- Estimated recommended solar system capacity: 1 kW per ~100 kWh monthly usage
    CASE
        WHEN l.monthly_units > 0 THEN ROUND(l.monthly_units / 100.0, 1)
        ELSE NULL
    END AS estimated_kw_capacity,
    l.notes AS staff_notes,                             -- Remarks or form feedback
    l.created_at AS lead_created_at,                    -- Date & time enquiry was logged
    l.updated_at AS lead_updated_at                     -- Date & time enquiry was last modified
FROM leads l
JOIN customers c ON l.customer_id = c.id;


-- ------------------------------------------------------------------------------
-- 2. DAILY INTAKE SUMMARY VIEW (v_daily_intake_summary)
-- Aggregates leads created per calendar day, split by Google Forms vs Manual Calls
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_daily_intake_summary AS
SELECT
    DATE(l.created_at) AS intake_date,                  -- Calendar date of lead creation
    COUNT(*) AS total_leads_captured,                   -- Total leads captured on this date
    COUNT(*) FILTER (WHERE l.source = 'google_form') AS google_form_leads,    -- Webhook leads count
    COUNT(*) FILTER (WHERE l.source = 'manual_intake') AS manual_intake_leads, -- Staff phone intake count
    ROUND(AVG(l.monthly_bill), 2) AS avg_monthly_bill,  -- Average electricity bill of applicants
    ROUND(AVG(l.monthly_units), 2) AS avg_monthly_units -- Average consumption of applicants
FROM leads l
GROUP BY DATE(l.created_at)
ORDER BY intake_date DESC;


-- ------------------------------------------------------------------------------
-- 3. PIPELINE STAGE FUNNEL VIEW (v_pipeline_funnel)
-- Counts how many leads are currently sitting in each stage of the sales pipeline
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pipeline_funnel AS
SELECT
    l.status AS pipeline_stage,                         -- Stage name ('new', 'contacted', etc.)
    COUNT(*) AS lead_count,                             -- Total leads at this stage
    ROUND(
        COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM leads), 0),
        1
    ) AS percentage_of_total,                           -- Percentage of total lead pipeline
    COALESCE(SUM(l.monthly_bill), 0) AS total_monthly_bill_volume -- Sum of monthly bills at this stage
FROM leads l
GROUP BY l.status
ORDER BY lead_count DESC;


-- ------------------------------------------------------------------------------
-- 4. CUSTOMER ENQUIRY FREQUENCY VIEW (v_customer_lead_frequency)
-- Identifies returning customers who have raised multiple solar project enquiries
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_customer_lead_frequency AS
SELECT
    c.id AS customer_id,                                -- Customer primary key
    c.name AS customer_name,                            -- Customer name
    c.phone AS customer_phone,                          -- Contact phone
    COUNT(l.id) AS total_enquiries,                     -- Total leads raised by this customer
    MIN(l.created_at) AS first_enquiry_date,            -- When customer first contacted
    MAX(l.created_at) AS latest_enquiry_date            -- Most recent contact date
FROM customers c
LEFT JOIN leads l ON c.id = l.customer_id
GROUP BY c.id, c.name, c.phone
ORDER BY total_enquiries DESC;



-- ------------------------------------------------------------------------------
-- 5. TECHNICIAN TASK & KIT READINESS VIEW (v_technician_task_schedule)
-- Shows all scheduled tasks, assigned field staff, project customer, and equipment kit status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_technician_task_schedule AS
SELECT
    ta.id AS assignment_id,                             -- Primary assignment key
    t.id AS technician_id,                              -- Technician key
    t.name AS technician_name,                          -- Technician name
    t.phone AS technician_phone,                        -- Contact phone
    t.specialization AS technician_role,                -- Specialized technical field
    l.id AS lead_id,                                    -- Associated lead enquiry
    c.name AS customer_name,                            -- Customer name
    c.phone AS customer_phone,                          -- Customer contact phone
    c.address AS site_address,                          -- Rooftop address
    ta.task_type,                                       -- Survey, Mounting, Wiring, or Commissioning
    ta.scheduled_date,                                  -- Target execution date
    ta.kit_status,                                      -- 'kit_ready', 'pending', or 'dispatched'
    ta.kit_items,                                       -- Prepared tools and kit materials
    ta.status AS task_status,                           -- 'assigned', 'in_progress', 'completed', 'cancelled'
    ta.notes AS assignment_notes                        -- Access notes / instructions
FROM technician_assignments ta
JOIN technicians t ON ta.technician_id = t.id
JOIN leads l ON ta.lead_id = l.id
JOIN customers c ON l.customer_id = c.id
ORDER BY ta.scheduled_date ASC;
