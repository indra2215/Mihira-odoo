# Mihira Solar ERP: Simplified Lead Intake System

A streamlined full-stack solar lead management system designed to:
1. Receive automated submissions from **Google Forms** via a live webhook.
2. Allow staff to **manually input customer call details** (monthly bill, units, sanctioned load, roof area).
3. Persist and deduplicate all records in **PostgreSQL**.
4. Display a live, interactive **React UI** with instant status counters and search.

---

## 1. Project Structure

```
odoo/
├── database/            # PostgreSQL 16 schema, tables & seed data
│   ├── schema.sql       # DDL definitions for customers, leads & inbound_submissions
│   ├── seed.sql         # Sample demo records
│   └── README.md        # Database documentation
│
├── backend/             # Django Python 3.12 + DRF REST API
│   ├── apps/leads/      # Unified Leads & Intake application
│   │   ├── models.py    # Customer, Lead & InboundSubmission models
│   │   ├── serializers.py # Validation for manual intake & Google Forms
│   │   ├── views.py     # Endpoints (/leads/, /webhooks/google-form/, /stats/)
│   │   └── urls.py      # App routes
│   ├── config/          # Django settings & URL configuration
│   ├── tests/           # Unit tests
│   ├── requirements.txt # Minimal Python dependencies
│   └── manage.py        # Django CLI
│
├── frontend/            # React + Next.js 14 + Tailwind CSS
│   ├── app/
│   │   ├── page.tsx     # Intake Form, Leads Table, and Google Forms Simulator
│   │   ├── layout.tsx   # Shell layout & metadata
│   │   └── globals.css  # Tailwind styles
│   └── package.json     # Frontend dependencies
│
├── docs/                # Architecture specifications & reference documents
├── docker-compose.yml   # Multi-container orchestration (db, backend, frontend)
├── .env.example         # Environment template
└── README.md            # This file
```

---

## 2. Quickstart

### Option A: Running with Docker (One Command)
```bash
docker compose up -d
```
* **React Frontend:** [http://localhost:3000](http://localhost:3000)
* **Django Backend API:** [http://localhost:8000/api/v1/leads/](http://localhost:8000/api/v1/leads/)
* **PostgreSQL:** `localhost:5432`

---

### Option B: Running Locally (Without Docker)

#### 1. Start the Backend:
```bash
cd backend
.venv\Scripts\activate   # on Windows
python manage.py migrate
python manage.py seed_leads
python manage.py runserver 0.0.0.0:8000
```

#### 2. Start the Frontend:
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. How It Works

### Flow 1: Manual Call Intake by Staff
1. Staff answers a phone call or meets a customer.
2. In the React UI, open the **"Manual Call Intake Form"** tab.
3. Fill in the customer name, phone number, electricity bill, and notes.
4. Click **"Save Lead to Database"**. The backend creates or updates the customer, logs the lead with `source="manual_intake"`, and immediately displays it in the table.

### Flow 2: Automated Google Forms Intake
1. Customer submits a public Google Form.
2. Google Apps Script makes an HTTP POST request to:
   ```
   POST http://localhost:8000/api/v1/webhooks/google-form/
   ```
3. The backend logs the raw submission in `inbound_submissions`, creates/matches the customer, and creates a lead with `source="google_form"`.
4. The React UI updates live and displays the lead with a green **Google Form** badge.
5. You can test this instantly using the **"Google Forms Webhook Integration"** tab in the UI!
