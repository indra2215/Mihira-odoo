"""
Data Serialization and Validation for Leads and Customers.
Validates input data for staff call intake and incoming Google Forms webhooks.
"""

# Import Django REST Framework serializers
from rest_framework import serializers

# Import database models
from .models import Customer, Lead, InboundSubmission, Technician, TechnicianAssignment


class CustomerSerializer(serializers.ModelSerializer):
    """
    Serializer for the Customer model.
    Converts Customer model instances into JSON representations and vice-versa.
    """
    class Meta:
        model = Customer
        # Expose ID, Name, Phone, Email, Address, and Creation date
        fields = ["id", "name", "phone", "email", "address", "created_at"]


class LeadSerializer(serializers.ModelSerializer):
    """
    Serializer for Leads.
    Supports nested customer information so the React UI can submit both
    the customer details and solar project details in a single POST request.
    """
    # Nested read-only customer object returned when querying leads
    customer = CustomerSerializer(read_only=True)

    # Write-only fields used when staff submits the manual intake form
    customer_name = serializers.CharField(write_only=True, required=True)
    customer_phone = serializers.CharField(write_only=True, required=True)
    customer_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    customer_address = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Lead
        # Fields included in serialization
        fields = [
            "id",
            "customer",
            "source",
            "status",
            "monthly_units",
            "monthly_bill",
            "sanctioned_load_kw",
            "roof_area_sqm",
            "notes",
            "created_at",
            "customer_name",
            "customer_phone",
            "customer_email",
            "customer_address",
        ]

    def create(self, validated_data):
        """
        Custom create method that extracts customer fields, looks up or creates
        the customer profile by phone, and links it to the newly created lead.
        """
        # Extract customer contact details from validated data dictionary
        c_name = validated_data.pop("customer_name")
        c_phone = validated_data.pop("customer_phone").strip() # Strip whitespace from phone
        c_email = validated_data.pop("customer_email", "")
        c_address = validated_data.pop("customer_address", "")

        # Look up existing customer by unique phone number or create a new profile
        customer, created = Customer.objects.get_or_create(
            phone=c_phone,
            defaults={
                "name": c_name,
                "email": c_email,
                "address": c_address,
            }
        )

        # If existing customer didn't have an address, update it with new info
        if c_address and not customer.address:
            customer.address = c_address
            customer.save(update_fields=["address"])

        # If existing customer didn't have an email, update it with new info
        if c_email and not customer.email:
            customer.email = c_email
            customer.save(update_fields=["email"])

        # Create the new solar project lead linked to this customer
        lead = Lead.objects.create(customer=customer, **validated_data)
        return lead


class GoogleFormWebhookSerializer(serializers.Serializer):
    """
    Parses and validates incoming payloads from Google Forms (via Google Apps Script).
    Supports flexible field names commonly used in Google Forms questionnaires.
    """
    # Customer name from Google Form (required)
    name = serializers.CharField(required=True)

    # Customer phone number from Google Form (required)
    phone = serializers.CharField(required=True)

    # Optional email address
    email = serializers.EmailField(required=False, allow_blank=True, default="")

    # Optional installation address
    address = serializers.CharField(required=False, allow_blank=True, default="")

    # Optional monthly electricity units (kWh)
    monthly_units = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True, default=None
    )

    # Optional monthly electricity bill amount in INR (₹)
    monthly_bill = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True, default=None
    )

    # Optional sanctioned load (kW)
    sanctioned_load_kw = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True, default=None
    )

    # Optional roof area (m²)
    roof_area_sqm = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True, default=None
    )

    # Optional feedback or comments
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def save_lead(self, raw_payload=None):
        """
        Saves the webhook submission:
          1. Stores untouched JSON payload in InboundSubmission audit table.
          2. Finds or creates the Customer profile by phone.
          3. Creates a Lead record with source='google_form'.
        """
        data = self.validated_data
        phone = data["phone"].strip()

        # Step 1: Save raw payload for compliance and audit
        if raw_payload:
            InboundSubmission.objects.create(
                source="google_form",
                raw_payload=raw_payload,
                processed=True
            )

        # Step 2: Get or create customer by phone number
        customer, created = Customer.objects.get_or_create(
            phone=phone,
            defaults={
                "name": data["name"],
                "email": data.get("email", ""),
                "address": data.get("address", ""),
            }
        )

        # Step 3: Create lead with source tagged as 'google_form'
        lead = Lead.objects.create(
            customer=customer,
            source="google_form",
            status="new",
            monthly_units=data.get("monthly_units"),
            monthly_bill=data.get("monthly_bill"),
            sanctioned_load_kw=data.get("sanctioned_load_kw"),
            roof_area_sqm=data.get("roof_area_sqm"),
            notes=data.get("notes", "Submitted via Google Form"),
        )
        return lead


class TechnicianSerializer(serializers.ModelSerializer):
    """
    Serializer for the Technician model.
    Converts technician records into JSON format for the front-end directory.
    Includes active assignment count.
    """
    # Computed read-only display string for specialization choice
    specialization_display = serializers.CharField(source="get_specialization_display", read_only=True)

    # Computed count of tasks currently assigned to this technician
    active_tasks_count = serializers.SerializerMethodField()

    class Meta:
        model = Technician
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "specialization",
            "specialization_display",
            "status",
            "active_tasks_count",
            "created_at",
        ]

    def get_active_tasks_count(self, obj):
        """Calculates total pending and in-progress assignments for this technician."""
        return obj.assignments.exclude(status__in=["completed", "cancelled"]).count()


class TechnicianAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Technician Assignments & Kit Readiness.
    Supports both reading detailed nested objects and writing using foreign key IDs.
    """
    # Nested read-only technician details for display in the UI
    technician = TechnicianSerializer(read_only=True)

    # Write-only ID for associating a technician on creation / update
    technician_id = serializers.PrimaryKeyRelatedField(
        queryset=Technician.objects.all(),
        source="technician",
        write_only=True,
        required=True
    )

    # Nested read-only lead details for display in the UI
    lead = LeadSerializer(read_only=True)

    # Write-only ID for associating the task to a lead
    lead_id = serializers.PrimaryKeyRelatedField(
        queryset=Lead.objects.all(),
        source="lead",
        write_only=True,
        required=True
    )

    # Human-readable label for task type choice
    task_type_display = serializers.CharField(source="get_task_type_display", read_only=True)

    # Human-readable label for kit status choice
    kit_status_display = serializers.CharField(source="get_kit_status_display", read_only=True)

    class Meta:
        model = TechnicianAssignment
        fields = [
            "id",
            "technician",
            "technician_id",
            "lead",
            "lead_id",
            "task_type",
            "task_type_display",
            "scheduled_date",
            "kit_status",
            "kit_status_display",
            "kit_items",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
