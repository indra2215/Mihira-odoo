"""
Mihira Solar ERP — Management Commands Sub-Package.
Each Python file in this directory that defines a Command(BaseCommand) class
is automatically registered as a runnable Django management command.

Available commands:
    python manage.py seed_leads        — Populate DB with sample leads, customers, technicians
    python manage.py clear_leads       — Wipe all lead/customer/assignment data (dev only)
    python manage.py show_stats        — Print live dashboard stats to terminal
    python manage.py reseed            — Clear then re-seed (convenience shortcut)
"""

