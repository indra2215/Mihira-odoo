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
from .models import Lead, Customer, InboundSubmission, Technician, TechnicianAssignment

# Import request validators and serializers
from .serializers import (
    LeadSerializer,
    GoogleFormWebhookSerializer,
    TechnicianSerializer,
    TechnicianAssignmentSerializer,
)


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

        # Count total active field technicians
        total_technicians = Technician.objects.count()

        # Count currently active tasks (assigned or in progress)
        active_assignments = TechnicianAssignment.objects.filter(
            status__in=["assigned", "in_progress"]
        ).count()

        # Count tasks where kit is ready to go
        kits_ready = TechnicianAssignment.objects.filter(kit_status="kit_ready").count()

        # Return stats dictionary in JSON format
        return Response(
            {
                "status": "success",
                "stats": {
                    "total_leads": total_leads,
                    "google_form_leads": google_form_leads,
                    "manual_intake_leads": manual_leads,
                    "total_customers": total_customers,
                    "total_technicians": total_technicians,
                    "active_assignments": active_assignments,
                    "kits_ready": kits_ready,
                },
            }
        )


class TechnicianListCreateView(APIView):
    """
    Endpoint for:
      - GET  /api/v1/technicians/ -> List all field technicians with their availability
      - POST /api/v1/technicians/ -> Register a new field technician
    """

    def get(self, request):
        """Retrieves all technicians, supporting status and specialization filters."""
        # Query all technicians ordered by name
        technicians = Technician.objects.all()

        # Filter by status if specified (e.g. ?status=available)
        status_param = request.query_params.get("status", "").strip()
        if status_param:
            technicians = technicians.filter(status=status_param)

        # Filter by specialization if specified (e.g. ?specialization=solar_electrician)
        spec_param = request.query_params.get("specialization", "").strip()
        if spec_param:
            technicians = technicians.filter(specialization=spec_param)

        # Serialize queryset to JSON
        serializer = TechnicianSerializer(technicians, many=True)

        return Response({
            "status": "success",
            "count": len(serializer.data),
            "data": serializer.data,
        })

    def post(self, request):
        """Registers a new field technician."""
        serializer = TechnicianSerializer(data=request.data)
        if serializer.is_valid():
            technician = serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": f"Technician {technician.name} registered.",
                    "data": TechnicianSerializer(technician).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class TechnicianAssignmentListCreateView(APIView):
    """
    Endpoint for:
      - GET  /api/v1/technician-assignments/ -> List tasks with technician, lead & kit status
      - POST /api/v1/technician-assignments/ -> Assign a task with kit specifications
    """

    def get(self, request):
        """Retrieves assignments pre-fetching technician, lead and customer relations."""
        # Query assignments joining foreign keys in a single SQL operation
        assignments = (
            TechnicianAssignment.objects.select_related("technician", "lead", "lead__customer")
            .all()
        )

        # Filter by technician ID if specified (?technician_id=1)
        tech_id = request.query_params.get("technician_id", "").strip()
        if tech_id:
            assignments = assignments.filter(technician_id=tech_id)

        # Filter by kit readiness status if specified (?kit_status=kit_ready)
        kit_status_param = request.query_params.get("kit_status", "").strip()
        if kit_status_param:
            assignments = assignments.filter(kit_status=kit_status_param)

        # Filter by task execution status if specified (?status=assigned)
        task_status_param = request.query_params.get("status", "").strip()
        if task_status_param:
            assignments = assignments.filter(status=task_status_param)

        # Serialize queryset
        serializer = TechnicianAssignmentSerializer(assignments, many=True)

        return Response({
            "status": "success",
            "count": len(serializer.data),
            "data": serializer.data,
        })

    def post(self, request):
        """Creates a new technician task assignment with kit inventory details."""
        serializer = TechnicianAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(
                {
                    "status": "success",
                    "message": f"Task #{assignment.id} assigned to {assignment.technician.name}.",
                    "data": TechnicianAssignmentSerializer(assignment).data,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class TechnicianAssignmentDetailView(APIView):
    """
    Endpoint for:
      - PATCH /api/v1/technician-assignments/<id>/ -> Update kit status, execution stage or notes
    """

    def patch(self, request, pk):
        """Updates kit readiness or task status."""
        try:
            assignment = TechnicianAssignment.objects.get(pk=pk)
        except TechnicianAssignment.DoesNotExist:
            return Response(
                {"status": "error", "message": "Assignment not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = TechnicianAssignmentSerializer(assignment, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response({
                "status": "success",
                "message": f"Task #{updated.id} updated successfully.",
                "data": TechnicianAssignmentSerializer(updated).data,
            })
        return Response(
            {"status": "error", "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
