"""
URL Routing for the Leads Application.
Maps API paths to corresponding views for lead creation, webhooks, and dashboard stats.
"""

# Import path helper from Django URLs
from django.urls import path

# Import API class-based views
from .views import LeadListCreateView, GoogleFormWebhookView, DashboardStatsView

# Application URL patterns
urlpatterns = [
    # Route for listing all leads or creating a new manual lead
    # URL: /api/v1/leads/
    path("leads/", LeadListCreateView.as_view(), name="lead-list-create"),

    # Route called by Google Forms via Google Apps Script webhook
    # URL: /api/v1/webhooks/google-form/
    path("webhooks/google-form/", GoogleFormWebhookView.as_view(), name="google-form-webhook"),

    # Route for retrieving dashboard counter statistics
    # URL: /api/v1/stats/
    path("stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
]
