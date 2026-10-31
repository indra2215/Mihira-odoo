#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks.
Allows running migrations, running local dev server, testing, and custom commands.
"""
import os
import sys

def main():
    """Run administrative tasks."""
    # Set default settings module for the Django project
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        # Import Django execution utility
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Raise clear error if Django is not installed in the active environment
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # Execute commands passed via terminal arguments (e.g. runserver, migrate)
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
