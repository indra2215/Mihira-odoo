"""
API Views for Leads, Customers, and Webhook Ingestion.
Provides endpoints for manual call intake, Google Forms webhook calls, and dashboard counters.
"""

# Import HTTP status codes from Django REST Framework
from rest_framework import status

# Import base class for class-based API views
from rest_framework.views import APIView

# Import response wrapper that renders Python dictionaries to JSON
from rest_framework.response import Response

# Import Q object for building complex OR queries across multiple database columns
from django.db.models import Q

# Import database models
from .models import Lead, Customer, InboundSubmission

# Import request validators and serializers
from .serializers import LeadSerializer, GoogleFormWebhookSerializer


class LeadListCreateView(APIView):
    """
    Endpoint for:
      - GET  /api/v1/leads/ -> List all solar leads (supports ?search= and ?source= filters)
      - POST /api/v1/leads/ -> Create a lead manually via staff call intake
    """

    def get(self, request):
        """
        Retrieves all leads from PostgreSQL, joining customer data to avoid N+1 query overhead.
        Supports search filtering across customer name, phone number, and staff notes.
        """
        # Query all leads with customer relation pre-fetched in a single SQL JOIN
        leads = Lead.objects.select_related("customer").all()

        # Check if caller supplied a search parameter (e.g. ?search=Sharma)
        search_query = request.query_params.get("search", "").strip()
        if search_query:
            # Filter across customer name, phone, or notes case-insensitively
            leads = leads.filter(
                Q(customer__name__icontains=search_query) |
                Q(customer__phone__icontains=search_query) |
                Q(notes__icontains=search_query)
            )

        # Check if caller filtered by source (e.g. ?source=google_form)
        source = request.query_params.get("source", "").strip()
        if source:
            leads = leads.filter(source=source)

        # Serialize queryset into Python list of dictionaries
        serializer = LeadSerializer(leads, many=True)

        # Return standardized JSON response with count and data array
        return Response({
            "status": "success",
            "count": len(serializer.data),
            "data": serializer.data
        })

    def post(self, request):
        """
        Receives manual intake form data submitted by office staff or call agents.
        Creates customer if new, updates existing customer, and saves lead.
        """
        # Pass incoming JSON payload into serializer for validation
        serializer = LeadSerializer(data=request.data)

        # Validate required fields (name, phone) and format
        if serializer.is_valid():
            # Save new lead marking source as 'manual_intake'
            lead = serializer.save(source="manual_intake")

            # Return HTTP 201 Created with saved lead data
            return Response(
                {
                    "status": "success",
                    "message": "Lead successfully recorded in database.",
                    "data": LeadSerializer(lead).data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Return HTTP 400 Bad Request with field-level error messages if validation fails
        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )


class GoogleFormWebhookView(APIView):
    """
    Webhook endpoint for receiving automated submissions from Google Forms.
    Google Apps Script makes an HTTP POST request to:
      POST /api/v1/webhooks/google-form/
    """

    def post(self, request):
        """
        Processes incoming Google Form payload, saves raw audit log,
        and creates/links the lead.
        """
        # Capture raw request data sent from Google Apps Script
        raw_payload = request.data

        # Pass payload into Google Form validator
        serializer = GoogleFormWebhookSerializer(data=raw_payload)

        # If data satisfies schema requirements
        if serializer.is_valid():
            # Save lead and log raw submission in audit table
            lead = serializer.save_lead(raw_payload=raw_payload)

            # Return success response to Google Apps Script
            return Response(
                {
                    "status": "success",
                    "message": "Google Form submission processed and saved to database.",
                    "lead_id": lead.id,
                    "customer_name": lead.customer.name,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            # Log failed submission into database for administrative audit
            InboundSubmission.objects.create(
                source="google_form",
                raw_payload=raw_payload,
                processed=False,
                error_message=str(serializer.errors),
            )

            # Return validation errors with HTTP 400 Bad Request
            return Response(
                {
                    "status": "error",
                    "message": "Invalid Google Form data",
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class DashboardStatsView(APIView):
    """
    GET /api/v1/stats/
    Returns summary counters for dashboard metric cards:
      - Total leads count
      - Google Forms submissions count
      - Manual phone intake count
      - Total customers count
    """

    def get(self, request):
        """Calculates aggregated counts directly using PostgreSQL COUNT queries."""
        # Count total leads in database
        total_leads = Lead.objects.count()

        # Count leads originating from Google Forms webhooks
        google_form_leads = Lead.objects.filter(source="google_form").count()

        # Count leads entered manually by staff
        manual_leads = Lead.objects.filter(source="manual_intake").count()

        # Count total registered customer profiles
        total_customers = Customer.objects.count()

        # Return stats dictionary in JSON format
        return Response(
            {
                "status": "success",
                "stats": {
                    "total_leads": total_leads,
                    "google_form_leads": google_form_leads,
                    "manual_intake_leads": manual_leads,
                    "total_customers": total_customers,
                },
            }
        )
