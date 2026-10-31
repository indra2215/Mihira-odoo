# PostgreSQL Database (`database/`)

> **Engine:** PostgreSQL 16 (Target Production Database)  
> **Purpose:** Persistent storage for Customer profiles, Solar Leads (from Google Forms and manual staff phone intake), and raw webhook audit logs.

---

## 1. Tables Overview

| Table | Purpose | Primary / Unique Key | Indexes |
|---|---|---|---|
| `customers` | Core contact registry for solar prospective buyers | `id` (PK), `phone` (UNIQUE) | `idx_customers_phone` |
| `leads` | Solar project enquiry specifications | `id` (PK), `customer_id` (FK) | `idx_leads_source`, `idx_leads_status`, `idx_leads_created_at`, `idx_leads_customer_created` |
| `inbound_submissions` | Raw audit trail of incoming Google Forms payloads | `id` (PK) | `idx_inbound_submissions_raw_payload` (GIN), `idx_inbound_submissions_received_at` |

---

## 2. SQL Files in this Directory

| File | Purpose | Description |
|---|---|---|
| **[`schema.sql`](file:///e:/odoo/database/schema.sql)** | DDL Table Schema & Triggers | Table structures, CHECK constraints, foreign keys, performance indexes, and automatic `updated_at` trigger functions. |
| **[`seed.sql`](file:///e:/odoo/database/seed.sql)** | Demo & Development Data | Realistic sample customer profiles and leads from both Google Forms and manual call intake; resets auto-increment sequences. |
| **[`views.sql`](file:///e:/odoo/database/views.sql)** | Reporting & Analytical Views | Pre-joined reporting views: `v_leads_detailed`, `v_daily_intake_summary`, `v_pipeline_funnel`, and `v_customer_lead_frequency`. |
| **[`maintenance.sql`](file:///e:/odoo/database/maintenance.sql)** | DBA Diagnostics & Health | Queries to inspect table sizes on disk, index utilization, sequence alignment, and data integrity checks. |

---

## 3. How to Run Against PostgreSQL

### Using `psql` Command Line
```bash
# 1. Initialize schema and triggers
psql -h localhost -U mihira -d mihira -f database/schema.sql

# 2. Seed initial sample leads and customers
psql -h localhost -U mihira -d mihira -f database/seed.sql

# 3. Create analytical and reporting views
psql -h localhost -U mihira -d mihira -f database/views.sql

# 4. Run maintenance diagnostics
psql -h localhost -U mihira -d mihira -f database/maintenance.sql
```

### Using Docker Compose
In Docker Compose, the `./database` directory is mounted to `/docker-entrypoint-initdb.d:ro`. When the PostgreSQL container first starts, it automatically executes the SQL files in alphabetical order:
1. `schema.sql` (Creates tables, triggers, and indexes)
2. `seed.sql` (Populates demo records)
3. `views.sql` (Creates analytical views)

---

## 4. Key Relational Constraints & Features

* **Phone-based Deduplication:** `customers.phone` is declared `UNIQUE`. If a customer submits another Google Form or calls again, their enquiry is attached to their existing profile.
* **Cascading Deletes:** `leads.customer_id REFERENCES customers(id) ON DELETE CASCADE`.
* **Automated `updated_at`:** Managed via a PostgreSQL `BEFORE UPDATE` trigger (`update_updated_at_column`) on both `customers` and `leads`.
* **JSONB Audit Log:** `inbound_submissions.raw_payload` is stored as binary JSON with a **GIN index**, allowing direct SQL indexing into arbitrary Google Form questions.
