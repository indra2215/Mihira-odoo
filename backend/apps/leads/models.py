"""
Database Models for the Leads Application.
Stores Customer profiles, Lead enquiries (from Google Forms and manual intake),
and raw Inbound Webhook submissions.
"""

# Import Django database models module
from django.db import models

# Import RegexValidator to validate international phone format (E.164)
from django.core.validators import RegexValidator

# Reusable phone number validator enforcing E.164 international format:
# Starts with '+', country code digit (1-9), followed by 7 to 14 digits
# Examples: +919876543210 (India), +14155552671 (US), +447911123456 (UK)
PHONE_REGEX_VALIDATOR = RegexValidator(
    regex=r"^\+[1-9][0-9]{7,14}$",
    message="Phone number must be in E.164 international format (e.g. +919876543210).",
)


class Customer(models.Model):
    """
    Customer profile identified by their unique phone number.
    Shared across multiple leads/enquiries if the same customer contacts again.
    """
    # Customer's full name
    name = models.CharField(max_length=255, help_text="Customer full name")

    # Phone number used as the primary unique key to prevent duplicate customer profiles
    # Enforces E.164 international format via validator
    phone = models.CharField(
        max_length=32,
        unique=True,
        validators=[PHONE_REGEX_VALIDATOR],
        help_text="Unique phone number in E.164 format (e.g. +919876543210)",
    )

    # Optional email address for quotation dispatch
    email = models.EmailField(blank=True, default="", help_text="Customer email address (optional)")

    # Installation site physical address
    address = models.TextField(blank=True, default="", help_text="Physical installation site address")

    # Auto-recorded timestamp when customer was first registered
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when customer was first registered")

    # Auto-recorded timestamp whenever customer details are modified
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"         # Explicit PostgreSQL table name
        ordering = ["-created_at"]     # Newest customers first by default
        constraints = [
            # PostgreSQL database-level CHECK constraint enforcing E.164 phone regex
            models.CheckConstraint(
                condition=models.Q(phone__regex=r"^\+[1-9][0-9]{7,14}$"),
                name="valid_customer_phone",
            ),
        ]

    def __str__(self):
        # String representation showing customer name and phone number
        return f"{self.name} ({self.phone})"


class Lead(models.Model):
    """
    Solar installation project enquiry.
    Can be created either:
      1. Automatically via Google Forms webhook ('google_form')
      2. Manually by staff/callers taking details ('manual_intake')
    """

    # Enumerated choices for origin source
    SOURCE_CHOICES = [
        ("google_form", "Google Form"),          # Ingested automatically from online form
        ("manual_intake", "Manual Staff Intake"), # Entered by office staff answering phone call
    ]

    # Enumerated choices for pipeline lifecycle stage
    STATUS_CHOICES = [
        ("new", "New"),                          # Newly arrived, uncontacted enquiry
        ("contacted", "Contacted"),              # Staff made contact with customer
        ("survey_scheduled", "Survey Scheduled"), # Site inspection booked
        ("closed", "Closed / Won"),              # Converted to solar purchase order
        ("lost", "Lost"),                        # Enquiry dropped or unsuitable roof
    ]

    # Foreign key relationship linking lead to customer profile
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,                # Delete leads if customer profile is deleted
        related_name="leads",                    # Reverse relation: customer.leads.all()
        help_text="The customer who raised this enquiry"
    )

    # Lead source tag
    source = models.CharField(
        max_length=32,
        choices=SOURCE_CHOICES,
        default="manual_intake",
        help_text="Origin of the lead: Google Form or Manual Phone Intake"
    )

    # Current pipeline status
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default="new",
        help_text="Current pipeline stage"
    )

    # Technical & Electricity bill inputs (used for solar sizing)
    # Monthly electricity consumption in units (kWh)
    monthly_units = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average monthly electricity consumption in kWh / units"
    )

    # Monthly electricity bill amount in INR (₹)
    monthly_bill = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average monthly electricity bill in INR"
    )

    # Sanctioned load from DISCOM power meter (kW)
    sanctioned_load_kw = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Sanctioned load from electricity board meter in kW"
    )

    # Shadow-free usable roof area (m²)
    roof_area_sqm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Usable shadow-free rooftop area in square meters"
    )

    # Staff call notes, customer preferences, or open feedback
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Staff remarks, customer preferences, or Google Form open feedback"
    )

    # Timestamp when enquiry was created
    created_at = models.DateTimeField(auto_now_add=True)

    # Timestamp when enquiry was last modified
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "leads"             # Explicit PostgreSQL table name
        ordering = ["-created_at"]     # Newest leads first

    def __str__(self):
        # String representation showing lead ID, customer name, and source
        return f"Lead #{self.id} - {self.customer.name} ({self.source})"


class InboundSubmission(models.Model):
    """
    Audit log storing the raw, unedited JSON payload received from Google Forms
    or external integrations. Ensures no data is ever lost.
    """
    # Name of the external source system
    source = models.CharField(max_length=64, default="google_form")

    # Complete, untouched JSON payload received from the webhook
    raw_payload = models.JSONField(help_text="Exact raw JSON received from webhook")

    # Boolean indicating whether parsing into customer/lead succeeded
    processed = models.BooleanField(default=True)

    # Error message if parsing failed
    error_message = models.TextField(blank=True, default="")

    # Timestamp when webhook arrived
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "inbound_submissions"  # Explicit PostgreSQL table name
        ordering = ["-received_at"]        # Newest submissions first

    def __str__(self):
        # String representation displaying submission ID and timestamp
        return f"Submission #{self.id} from {self.source} at {self.received_at.strftime('%Y-%m-%d %H:%M')}"


class Technician(models.Model):
    """
    Field crew member or solar engineer working on installations, surveys, or commissioning.
    """
    SPECIALIZATION_CHOICES = [
        ("solar_electrician", "Solar Electrician"),
        ("site_surveyor", "Site Surveyor"),
        ("mounting_specialist", "Mounting Specialist"),
        ("commissioning_engineer", "Commissioning Engineer"),
    ]

    STATUS_CHOICES = [
        ("available", "Available"),
        ("on_site", "On Site"),
        ("off_duty", "Off Duty"),
    ]

    # Full name of technician
    name = models.CharField(max_length=255, help_text="Technician full name")

    # Unique mobile contact number in E.164 international format
    phone = models.CharField(
        max_length=32,
        unique=True,
        validators=[PHONE_REGEX_VALIDATOR],
        help_text="Unique phone number in E.164 format (e.g. +919876543210)",
    )

    # Optional email address
    email = models.EmailField(blank=True, default="", help_text="Technician email (optional)")

    # Specialized field skill
    specialization = models.CharField(
        max_length=64,
        choices=SPECIALIZATION_CHOICES,
        default="solar_electrician",
        help_text="Primary technical specialization"
    )

    # Current availability status
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default="available",
        help_text="Current availability status"
    )

    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    # Last update timestamp
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "technicians"
        ordering = ["name"]
        constraints = [
            # PostgreSQL database-level CHECK constraint enforcing E.164 phone regex
            models.CheckConstraint(
                condition=models.Q(phone__regex=r"^\+[1-9][0-9]{7,14}$"),
                name="valid_technician_phone",
            ),
        ]

    def __str__(self):
        # String representation showing name, role, and current availability
        return f"{self.name} - {self.get_specialization_display()} ({self.status})"


class TechnicianAssignment(models.Model):
    """
    Task assignment connecting a field technician to a solar project/lead,
    tracking target date, execution status, and equipment kit readiness.
    """
    TASK_CHOICES = [
        ("site_survey", "Site Survey & Shading Analysis"),
        ("structure_mounting", "Structure & Panel Mounting"),
        ("panel_wiring", "DC Panel Wiring"),
        ("inverter_installation", "Inverter & DB Installation"),
        ("grid_commissioning", "Grid Synchronizing & Net Meter Commissioning"),
    ]

    KIT_STATUS_CHOICES = [
        ("kit_ready", "Kit Ready"),
        ("pending", "Kit Pending"),
        ("dispatched", "Kit Dispatched"),
    ]

    STATUS_CHOICES = [
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    # Assigned technician
    technician = models.ForeignKey(
        Technician,
        on_delete=models.CASCADE,
        related_name="assignments",
        help_text="The technician assigned to execute this task"
    )

    # Associated customer project enquiry
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="assignments",
        help_text="The solar project lead this task belongs to"
    )

    # Job type
    task_type = models.CharField(
        max_length=64,
        choices=TASK_CHOICES,
        default="site_survey",
        help_text="Type of technical job to perform"
    )

    # Target scheduled date
    scheduled_date = models.DateField(help_text="Scheduled date for task execution")

    # Kit readiness status
    kit_status = models.CharField(
        max_length=32,
        choices=KIT_STATUS_CHOICES,
        default="pending",
        help_text="Readiness state of the required tools and materials kit"
    )

    # Equipment, tools, and materials checklist for this task
    kit_items = models.TextField(
        blank=True,
        default="",
        help_text="Kit inventory: tools, meters, safety gear, and materials required"
    )

    # Task execution progress
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default="assigned",
        help_text="Task lifecycle progress status"
    )

    # Field notes or roof access instructions
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Access instructions, customer constraints, or technical remarks"
    )

    # Creation timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    # Last update timestamp
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "technician_assignments"
        ordering = ["scheduled_date", "-created_at"]

    def __str__(self):
        # String representation showing task ID, technician name, job type, and kit status
        return f"Task #{self.id}: {self.technician.name} - {self.get_task_type_display()} ({self.kit_status})"
