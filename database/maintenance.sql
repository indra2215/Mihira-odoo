-- ==============================================================================
-- MIHIRA SOLAR ERP - DATABASE MAINTENANCE & DIAGNOSTICS (PostgreSQL 16)
-- ==============================================================================
-- Purpose:
-- Administrative and diagnostics queries for DBAs and developers to inspect
-- table sizes, index performance, sequence alignment, and data integrity.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE STORAGE SIZES & ROW COUNTS
-- Reports total disk space consumed by each table, including its indexes
-- ------------------------------------------------------------------------------
SELECT
    relname AS table_name,
    n_live_tup AS estimated_row_count,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size_on_disk,
    pg_size_pretty(pg_relation_size(relid)) AS table_data_size,
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;


-- ------------------------------------------------------------------------------
-- 2. INDEX UTILIZATION CHECK
-- Detects whether defined indexes are actually being used by query planner
-- ------------------------------------------------------------------------------
SELECT
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS number_of_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;


-- ------------------------------------------------------------------------------
-- 3. SEQUENCE SYNCHRONIZATION DIAGNOSTIC
-- Confirms that auto-increment sequences are properly aligned above MAX(id)
-- ------------------------------------------------------------------------------
SELECT
    'customers' AS table_name,
    (SELECT MAX(id) FROM customers) AS current_max_id,
    last_value AS sequence_last_value,
    (last_value >= (SELECT COALESCE(MAX(id), 0) FROM customers)) AS is_synchronized
FROM customers_id_seq
UNION ALL
SELECT
    'leads' AS table_name,
    (SELECT MAX(id) FROM leads) AS current_max_id,
    last_value AS sequence_last_value,
    (last_value >= (SELECT COALESCE(MAX(id), 0) FROM leads)) AS is_synchronized
FROM leads_id_seq
UNION ALL
SELECT
    'inbound_submissions' AS table_name,
    (SELECT MAX(id) FROM inbound_submissions) AS current_max_id,
    last_value AS sequence_last_value,
    (last_value >= (SELECT COALESCE(MAX(id), 0) FROM inbound_submissions)) AS is_synchronized
FROM inbound_submissions_id_seq;


-- ------------------------------------------------------------------------------
-- 4. DATA INTEGRITY CHECKS
-- Checks for orphan records or anomalies across relationships
-- ------------------------------------------------------------------------------

-- 4.1 Check for orphan leads (leads without valid customer)
SELECT l.id AS orphan_lead_id, l.customer_id
FROM leads l
LEFT JOIN customers c ON l.customer_id = c.id
WHERE c.id IS NULL;

-- 4.2 Check for duplicate phone numbers in customer registry
SELECT phone, COUNT(*) AS duplicate_count
FROM customers
GROUP BY phone
HAVING COUNT(*) > 1;

-- 4.3 Check for unprocessed or failed inbound webhooks
SELECT id, source, received_at, error_message
FROM inbound_submissions
WHERE processed = false
ORDER BY received_at DESC;


-- ------------------------------------------------------------------------------
-- 5. VACUUM AND ANALYZE (OPTIONAL RUN PERIODICALLY)
-- Reclaims storage and refreshes query planner statistics
-- ------------------------------------------------------------------------------
-- VACUUM (ANALYZE, VERBOSE) customers;
-- VACUUM (ANALYZE, VERBOSE) leads;
-- VACUUM (ANALYZE, VERBOSE) inbound_submissions;

