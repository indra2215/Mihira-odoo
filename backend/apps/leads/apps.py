"""
Application configuration for the leads Django app.
Registers the LeadsConfig class within Django's application registry.
"""

# Import Django AppConfig base class
from django.apps import AppConfig


class LeadsConfig(AppConfig):
    """Configuration class for the Leads & Intake application."""

    # Default primary key field type for models created in this app
    default_auto_field = "django.db.models.BigAutoField"

    # Full python path to the app
    name = "apps.leads"

    # Human-readable name displayed in Django Admin and system logs
    verbose_name = "Solar Leads & Intake"

