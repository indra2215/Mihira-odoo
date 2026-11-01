"""
Django Management Command: reseed
Convenience shortcut that clears ALL data then re-seeds fresh demo records.
Equivalent to running: clear_leads --confirm && seed_leads

Usage:
    python manage.py reseed
"""

# Import BaseCommand from Django's management framework
from django.core.management.base import BaseCommand

# Import call_command to chain other management commands programmatically
from django.core.management import call_command


class Command(BaseCommand):
    # Help text shown when running: python manage.py help reseed
    help = (
        "Clears all existing data then re-seeds fresh demo leads, customers, technicians, and "
        "kit assignments. Equivalent to: clear_leads --confirm && seed_leads"
    )

    def handle(self, *args, **options):
        """
        Chains two management commands in sequence:
          1. clear_leads --confirm   (wipes all existing records)
          2. seed_leads              (inserts fresh demo records)
        """
        # ── Step 1: Clear all existing records ───────────────────────────────────
        self.stdout.write(self.style.WARNING("Clearing existing database records..."))

        # Call the clear_leads command programmatically with --confirm bypassed
        # (the reseed command itself acts as the confirmation)
        call_command("clear_leads", confirm=True, stdout=self.stdout, stderr=self.stderr)

        # ── Step 2: Seed fresh demo data ─────────────────────────────────────────
        self.stdout.write(self.style.WARNING("\nSeeding fresh demo data..."))

        # Call seed_leads to insert all sample customers, leads, technicians, and assignments
        call_command("seed_leads", stdout=self.stdout, stderr=self.stderr)

        # ── Done ──────────────────────────────────────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                "\n[OK] Reseed complete! "
                "Run 'python manage.py show_stats' to verify the database state."
            )
        )

