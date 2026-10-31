"""
WSGI (Web Server Gateway Interface) configuration for Mihira Solar ERP Backend.

WSGI is the Python standard interface between web servers (like Gunicorn or uWSGI)
and Python web applications (like Django). This file exposes the Django app as a
module-level callable variable named `application`, which the web server calls
to handle each incoming HTTP request.

In local development, Django's `runserver` command uses this module automatically.
In production (Docker), a WSGI server like Gunicorn would use it:
  gunicorn config.wsgi:application --bind 0.0.0.0:8000
"""

# Standard library: access environment variables (to set settings module path)
import os

# Import Django's helper function that builds and returns the WSGI application callable
from django.core.wsgi import get_wsgi_application

# Tell Django which settings file to use if not already set in the environment
# config.settings refers to backend/config/settings.py
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Build and expose the Django WSGI application callable
# The web server (Gunicorn / runserver) calls `application(environ, start_response)` per request
application = get_wsgi_application()

