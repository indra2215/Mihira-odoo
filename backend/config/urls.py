"""
Root URL Configuration for Mihira Solar ERP Backend.
Routes requests to Django Admin and mounts the Leads API under /api/v1/.
"""

# Import Django admin site module
from django.contrib import admin

# Import URL path matching and inclusion helpers
from django.urls import path, include

# Master URL patterns list
urlpatterns = [
    # Built-in Django Admin Interface (accessible at http://localhost:8000/admin/)
    path("admin/", admin.site.urls),
    
    # Mount all leads and Google Form webhook routes under the /api/v1/ prefix
    path("api/v1/", include("apps.leads.urls")),
]
