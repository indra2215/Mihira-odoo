"""
Django Management Command to Seed Initial Demo Leads.
Allows developers and testers to immediately populate the database with realistic data.
Usage:
    python manage.py seed_leads
"""

# Import BaseCommand class for custom Django CLI commands
from django.core.management.base import BaseCommand

# Import models to seed
from apps.leads.models import Customer, Lead, InboundSubmission


class Command(BaseCommand):
    # Description displayed when running 'python manage.py help seed_leads'
    help = "Seeds sample solar leads and customers into the database"

    def handle(self, *args, **options):
        """Execution logic for the management command."""

        # ----------------------------------------------------------------------
        # Sample Record 1: Lead captured automatically from an online Google Form
        # ----------------------------------------------------------------------
        # Create or fetch customer profile
        c1, _ = Customer.objects.get_or_create(
            phone="+919876543210", # Unique phone
            defaults={
                "name": "Rahul Sharma",
                "email": "rahul.sharma@example.com",
                "address": "Plot 42, Jubilee Hills, Hyderabad",
            }
        )
        # Create corresponding lead linked to customer 1
        Lead.objects.get_or_create(
            customer=c1,
            source="google_form", # Source: Google Form
            defaults={
                "status": "new",
                "monthly_units": 450.00,
                "monthly_bill": 4200.00,
                "sanctioned_load_kw": 5.00,
                "roof_area_sqm": 45.00,
                "notes": "Submitted via Google Form: Interested in On-Grid 3kW system to reduce summer electricity bills."
            }
        )

        # ----------------------------------------------------------------------
        # Sample Record 2: Lead captured manually by a staff member on a phone call
        # ----------------------------------------------------------------------
        # Create or fetch customer profile
        c2, _ = Customer.objects.get_or_create(
            phone="+919812345678", # Unique phone
            defaults={
                "name": "Priya Patel",
                "email": "priya.patel@example.com",
                "address": "Flat 304, Green Acres, Ahmedabad",
            }
        )
        # Create corresponding lead linked to customer 2
        Lead.objects.get_or_create(
            customer=c2,
            source="manual_intake", # Source: Manual Staff Phone Intake
            defaults={
                "status": "contacted",
                "monthly_units": 650.00,
                "monthly_bill": 5800.00,
                "sanctioned_load_kw": 7.00,
                "roof_area_sqm": 70.00,
                "notes": "Phone intake by Sales Rep: Customer has RCC roof, shadow-free, requested site survey on Saturday."
            }
        )

        # ----------------------------------------------------------------------
        # Sample Record 3: Commercial lead from Google Forms
        # ----------------------------------------------------------------------
        # Create or fetch customer profile
        c3, _ = Customer.objects.get_or_create(
            phone="+919988776655", # Unique phone
            defaults={
                "name": "Amit Verma",
                "email": "amit.verma@example.com",
                "address": "B-12, Sector 15, Noida",
            }
        )
        # Create corresponding lead linked to customer 3
        Lead.objects.get_or_create(
            customer=c3,
            source="google_form", # Source: Google Form
            defaults={
                "status": "survey_scheduled",
                "monthly_units": 900.00,
                "monthly_bill": 8500.00,
                "sanctioned_load_kw": 10.00,
                "roof_area_sqm": 120.00,
                "notes": "Submitted via Google Form: Commercial workshop, interested in 10kW On-Grid with Net Metering."
            }
        )

        # Write confirmation message to the terminal in green text
        self.stdout.write(self.style.SUCCESS("Successfully seeded 3 demo leads and customers!"))
