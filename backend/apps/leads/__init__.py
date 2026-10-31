"""
Mihira Solar ERP - Leads & Intake Application Package.
Exposes database models, DRF serializers, API views, and app configuration.
Supports direct module imports (e.g. `from apps.leads import Customer, Lead, LeadSerializer`).
"""

# Default AppConfig path for Django application registry
default_app_config = "apps.leads.apps.LeadsConfig"

# Explicit export list (__all__) documenting all public symbols provided by this package
__all__ = [
    # Database Models
    "Customer",
    "Lead",
    "InboundSubmission",
    "Technician",
    "TechnicianAssignment",
    # DRF Serializers
    "CustomerSerializer",
    "LeadSerializer",
    "GoogleFormWebhookSerializer",
    "TechnicianSerializer",
    "TechnicianAssignmentSerializer",
    # DRF API Views
    "LeadListCreateView",
    "GoogleFormWebhookView",
    "DashboardStatsView",
    "TechnicianListCreateView",
    "TechnicianAssignmentListCreateView",
    "TechnicianAssignmentDetailView",
    # Application Configuration
    "LeadsConfig",
]


def __getattr__(name: str):
    """
    PEP 562 dynamic module attribute resolver.
    Loads models, serializers, and views on-demand to prevent Django AppRegistryNotReady errors
    during early startup while still enabling clean package-level imports.
    """
    # Dynamic loader for database models
    if name in ("Customer", "Lead", "InboundSubmission", "Technician", "TechnicianAssignment"):
        from . import models
        return getattr(models, name)

    # Dynamic loader for DRF serializers
    if name in (
        "CustomerSerializer",
        "LeadSerializer",
        "GoogleFormWebhookSerializer",
        "TechnicianSerializer",
        "TechnicianAssignmentSerializer",
    ):
        from . import serializers
        return getattr(serializers, name)

    # Dynamic loader for API views
    if name in (
        "LeadListCreateView",
        "GoogleFormWebhookView",
        "DashboardStatsView",
        "TechnicianListCreateView",
        "TechnicianAssignmentListCreateView",
        "TechnicianAssignmentDetailView",
    ):
        from . import views
        return getattr(views, name)

    # Dynamic loader for AppConfig
    if name == "LeadsConfig":
        from .apps import LeadsConfig
        return LeadsConfig

    # Raise standard AttributeError if requested attribute is not exported
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__():
    """Returns list of all accessible package attributes for interactive shell and introspection."""
    return sorted(list(globals().keys()) + __all__)
