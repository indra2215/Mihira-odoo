# Backend (`backend/`)

> **Framework:** Python 3.12 / Django 5 + Django REST Framework  
> **Purpose:** Handles manual staff intake, processes Google Forms webhooks, and persists data into PostgreSQL.

---

## 1. Endpoints Overview

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/leads/` | List all leads with optional `?search=` and `?source=` query filters |
| `POST` | `/api/v1/leads/` | Manually submit a customer & lead from staff phone/desk intake |
| `POST` | `/api/v1/webhooks/google-form/` | Webhook called by Google Forms (Apps Script) upon submission |
| `GET` | `/api/v1/stats/` | Returns dashboard statistics (total leads, google form vs. manual counts) |

---

## 2. Directory Structure

```
backend/
├── apps/
│   └── leads/                     # Unified Leads & Intake application
│       ├── models.py              # Customer, Lead, and InboundSubmission models
│       ├── serializers.py         # Form & Webhook validators
│       ├── views.py               # API endpoints
│       └── urls.py                # App URL routing
├── config/                        # Django project configuration (settings.py, urls.py)
├── tests/                         # API tests (test_leads_api.py)
├── Dockerfile                     # Docker container specification
├── requirements.txt               # Dependencies (Django, DRF, psycopg2-binary, django-cors-headers)
└── manage.py                      # Django CLI tool
```

---

## 3. Running Locally

```bash
# 1. Activate virtual environment
.venv\Scripts\activate   # on Windows

# 2. Run migrations
python manage.py migrate

# 3. (Optional) Seed demo leads
python manage.py seed_leads

# 4. Start backend server (runs on port 8000)
python manage.py runserver 0.0.0.0:8000
```
