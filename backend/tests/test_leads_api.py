"""
Automated Unit Test Suite for Leads API and Google Form Webhook.
Tests manual staff intake, webhook processing, raw payload audits, and dashboard stats.
"""

# Import standard library OS module
import os

# Set environment variable to run tests against an in-memory SQLite database
os.environ["USE_SQLITE"] = "1"

# Import Django TestCase base class
from django.test import TestCase

# Import Django REST Framework APIClient for simulating HTTP requests
from rest_framework.test import APIClient

# Import database models to verify state
from apps.leads.models import Customer, Lead, InboundSubmission, Technician, TechnicianAssignment


class LeadsAPITestCase(TestCase):
    """Test suite covering manual lead creation and automated webhook processing."""

    def setUp(self):
        """Set up test fixtures before each test method executes."""
        # Initialize the test API client
        self.client = APIClient()

    def test_create_manual_lead(self):
        """Verify staff can manually submit a customer and lead via POST /api/v1/leads/."""
        # Sample payload matching fields sent from React manual intake form
        payload = {
            "customer_name": "Suresh Kumar",
            "customer_phone": "+919123456780",
            "customer_email": "suresh@example.com",
            "customer_address": "Indiranagar, Bangalore",
            "monthly_bill": 5000.0,
            "monthly_units": 500.0,
            "sanctioned_load_kw": 6.0,
            "roof_area_sqm": 60.0,
            "notes": "Interested in 5kW rooftop system.",
        }

        # Make HTTP POST request to API endpoint
        response = self.client.post("/api/v1/leads/", payload, format="json")

        # Assert response status code is 201 Created
        self.assertEqual(response.status_code, 201)

        # Assert status field in JSON body is 'success'
        self.assertEqual(response.data["status"], "success")

        # Verify customer profile was inserted into database
        customer = Customer.objects.get(phone="+919123456780")
        self.assertEqual(customer.name, "Suresh Kumar")

        # Verify lead record was created, linked to customer, and tagged as manual intake
        lead = Lead.objects.get(customer=customer)
        self.assertEqual(lead.source, "manual_intake")
        self.assertEqual(float(lead.monthly_bill), 5000.0)

    def test_google_form_webhook(self):
        """Verify Google Form webhook ingestion creates a lead and logs raw audit payload."""
        # Sample payload matching structure sent from Google Apps Script
        payload = {
            "name": "Ananya Roy",
            "phone": "+919830012345",
            "email": "ananya@example.com",
            "address": "Salt Lake, Kolkata",
            "monthly_bill": 3500.0,
            "monthly_units": 380.0,
            "notes": "Submitted from solar assessment google form.",
        }

        # Make HTTP POST request to webhook endpoint
        response = self.client.post("/api/v1/webhooks/google-form/", payload, format="json")

        # Assert response status code is 201 Created
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "success")

        # Verify untouched raw submission was saved in InboundSubmission table
        submission = InboundSubmission.objects.filter(source="google_form").first()
        self.assertIsNotNone(submission)
        self.assertEqual(submission.raw_payload["name"], "Ananya Roy")

        # Verify lead was created with source tagged as 'google_form'
        lead = Lead.objects.get(customer__phone="+919830012345")
        self.assertEqual(lead.source, "google_form")
        self.assertEqual(lead.customer.name, "Ananya Roy")

    def test_stats_endpoint(self):
        """Verify stats endpoint returns accurate summary counters."""
        # Make HTTP GET request to stats endpoint
        response = self.client.get("/api/v1/stats/")

        # Assert response status code is 200 OK
        self.assertEqual(response.status_code, 200)

        # Assert response contains the 'stats' dictionary key
        self.assertIn("stats", response.data)


    def test_technician_creation_and_listing(self):
        """Verify field technicians can be registered and retrieved via the API."""
        # Create a technician via API
        payload = {
            "name": "Karthik Raja",
            "phone": "+919876543322",
            "email": "karthik.raja@example.com",
            "specialization": "site_surveyor",
            "status": "available",
        }
        res = self.client.post("/api/v1/technicians/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "success")

        # Verify technician is listed
        list_res = self.client.get("/api/v1/technicians/")
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(len(list_res.data["data"]), 1)

    def test_technician_assignment_with_kit_readiness(self):
        """Verify task assignment can be created with kit readiness status and updated."""
        # 1. Create customer and lead
        customer = Customer.objects.create(name="Rohit Verma", phone="+919876511223")
        lead = Lead.objects.create(customer=customer, source="manual_intake")

        # 2. Create technician
        tech = Technician.objects.create(
            name="Sanjay Gupta",
            phone="+919876599887",
            specialization="solar_electrician",
            status="available"
        )

        # 3. Create task assignment with kit inventory
        assign_payload = {
            "technician_id": tech.id,
            "lead_id": lead.id,
            "task_type": "inverter_installation",
            "scheduled_date": "2026-11-05",
            "kit_status": "kit_ready",
            "kit_items": "5kW Hybrid Inverter, 6mm² DC Cable (40m), Battery Rack, Earth Mat",
            "status": "assigned",
            "notes": "Verify battery space in garage.",
        }
        res = self.client.post("/api/v1/technician-assignments/", assign_payload, format="json")
        self.assertEqual(res.status_code, 201)
        assignment_id = res.data["data"]["id"]
        self.assertEqual(res.data["data"]["kit_status"], "kit_ready")

        # 4. Update kit status via PATCH
        patch_res = self.client.patch(
            f"/api/v1/technician-assignments/{assignment_id}/",
            {"kit_status": "dispatched", "status": "in_progress"},
            format="json"
        )
        self.assertEqual(patch_res.status_code, 200)
        self.assertEqual(patch_res.data["data"]["kit_status"], "dispatched")
        self.assertEqual(patch_res.data["data"]["status"], "in_progress")


    def test_flexible_google_form_question_labels(self):
        """Verify Google Form submissions with custom question titles are normalized correctly."""
        # Simulated payload matching exact Google Forms event.namedValues format
        google_form_payload = {
            "Full Name": ["Venkatesh Iyer"],
            "WhatsApp Number": ["+91 99887-12345"],
            "Installation Address": ["Villa 8, Whitefield, Bangalore"],
            "Average Monthly Bill (₹)": ["7500.50"],
            "Average Monthly Units (kWh)": ["800"],
            "What type of roof do you have?": ["Flat Concrete Terrace, 1200 sqft"],
        }

        res = self.client.post("/api/v1/webhooks/google-form/", google_form_payload, format="json")
        self.assertEqual(res.status_code, 201)

        # Verify customer created with cleaned phone number
        customer = Customer.objects.get(phone="+919988712345")
        self.assertEqual(customer.name, "Venkatesh Iyer")

        # Verify lead created with bill and unmatched custom questions in notes
        lead = Lead.objects.get(customer=customer)
        self.assertEqual(float(lead.monthly_bill), 7500.50)
        self.assertIn("What type of roof do you have?", lead.notes)
