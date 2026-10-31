# Frontend (`frontend/`)

> **Framework:** Next.js 14 (App Router) + React 18 + Tailwind CSS  
> **Purpose:** User Interface for taking customer solar details over calls/walk-ins, viewing all database records, and simulating/testing Google Forms webhook ingestion.

---

## 1. Features

1. **Manual Staff Call Intake Form (`Tab: Manual Call Intake Form`):**
   * Fields: Customer Name, Phone, Email, Site Address, Monthly Electricity Bill (₹), Monthly Units (kWh), Sanctioned Load (kW), Roof Area (m²), Call Notes.
   * Directly posts to Django backend: `POST /api/v1/leads/`.
2. **Lead Records Table (`Tab: All Leads`):**
   * Real-time search across customer names, phone numbers, and staff notes.
   * Filter leads by source (`Google Form` vs `Manual Intake`).
   * Visual status indicators and metrics.
3. **Google Forms Integration & Test Simulator (`Tab: Google Forms Webhook Integration`):**
   * Live Webhook URL: `POST http://localhost:8000/api/v1/webhooks/google-form/`.
   * One-click "Simulate Google Form Submission" button to verify webhook ingestion without third-party setup.
   * Ready-to-use Google Apps Script snippet for production Google Forms.

---

## 2. Running Locally

```bash
# 1. Install packages (if not already installed)
npm install

# 2. Start the development server
npm run dev
```

The frontend will run on [http://localhost:3000](http://localhost:3000).
Ensure the Django backend is running on `http://localhost:8000`.
