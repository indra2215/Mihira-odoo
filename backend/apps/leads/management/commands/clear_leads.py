"""
Django Management Command: clear_leads
Wipes all demo/test data from the database — customers, leads, assignments, audit logs.
SAFETY: Requires --confirm flag to prevent accidental data loss.

Usage:
    python manage.py clear_leads --confirm
"""

# Import BaseCommand and CommandError from Django's management framework
from django.core.management.base import BaseCommand, CommandError

# Import all models whose records will be deleted
from apps.leads.models import Customer, Lead, InboundSubmission, Technician, TechnicianAssignment


class Command(BaseCommand):
    # Help text shown when running: python manage.py help clear_leads
    help = (
        "Deletes ALL leads, customers, technicians, assignments, and inbound submissions "
        "from the database. DEVELOPMENT USE ONLY. Requires --confirm flag."
    )

    def add_arguments(self, parser):
        """
        Registers CLI arguments for this command.
        The --confirm flag must be passed explicitly to prevent accidental wipes.
        """
        parser.add_argument(
            "--confirm",
            action="store_true",          # Boolean flag — present = True, absent = False
            default=False,
            help="Must pass this flag to confirm deletion. Safety guard against accidental wipes.",
        )

    def handle(self, *args, **options):
        """
        Main execution logic.
        Checks for --confirm flag, then deletes all records in dependency order
        (assignments first to avoid FK constraint violations, then leads, then customers).
        """
        # ── Safety Check ─────────────────────────────────────────────────────────
        # If --confirm was not passed, abort with a helpful error message
        if not options["confirm"]:
            raise CommandError(
                "This command will delete ALL data. "
                "Pass --confirm to proceed: python manage.py clear_leads --confirm"
            )

        # ── Step 1: Delete Technician Assignments (FK depends on Technician + Lead) ──
        assignment_count = TechnicianAssignment.objects.count()
        TechnicianAssignment.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(f"  Deleted {assignment_count} technician assignment(s).")
        )

        # ── Step 2: Delete Technicians ────────────────────────────────────────────
        tech_count = Technician.objects.count()
        Technician.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(f"  Deleted {tech_count} technician(s).")
        )

        # ── Step 3: Delete Inbound Webhook Audit Log Submissions ─────────────────
        sub_count = InboundSubmission.objects.count()
        InboundSubmission.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(f"  Deleted {sub_count} inbound submission audit log(s).")
        )

        # ── Step 4: Delete Leads (FK depends on Customer) ────────────────────────
        lead_count = Lead.objects.count()
        Lead.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(f"  Deleted {lead_count} lead(s).")
        )

        # ── Step 5: Delete Customer Profiles ─────────────────────────────────────
        customer_count = Customer.objects.count()
        Customer.objects.all().delete()
        self.stdout.write(
            self.style.WARNING(f"  Deleted {customer_count} customer profile(s).")
        )

        # ── Done ──────────────────────────────────────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                "\n[OK] Database cleared successfully. "
                "Run 'python manage.py seed_leads' to repopulate with demo data."
            )
        )

