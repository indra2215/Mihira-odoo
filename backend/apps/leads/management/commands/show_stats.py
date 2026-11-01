"""
Django Management Command: show_stats
Prints a live summary of all key database metrics to the terminal.
Useful for quick health checks without opening the browser.

Usage:
    python manage.py show_stats
"""

# Import BaseCommand from Django's management framework
from django.core.management.base import BaseCommand

# Import all models needed for aggregated counts
from apps.leads.models import Customer, Lead, InboundSubmission, Technician, TechnicianAssignment


class Command(BaseCommand):
    # Help text shown when running: python manage.py help show_stats
    help = "Prints live database statistics: leads, customers, technicians, kit readiness, and webhooks."

    def handle(self, *args, **options):
        """
        Queries each model for relevant counts and prints a formatted stats table.
        All queries use Django ORM COUNT operations — no raw SQL needed.
        """

        # ── Lead Counts ──────────────────────────────────────────────────────────
        total_leads         = Lead.objects.count()
        google_form_leads   = Lead.objects.filter(source="google_form").count()
        manual_leads        = Lead.objects.filter(source="manual_intake").count()

        # Lead status breakdown
        new_leads           = Lead.objects.filter(status="new").count()
        contacted_leads     = Lead.objects.filter(status="contacted").count()
        survey_leads        = Lead.objects.filter(status="survey_scheduled").count()
        closed_leads        = Lead.objects.filter(status="closed").count()
        lost_leads          = Lead.objects.filter(status="lost").count()

        # ── Customer Counts ──────────────────────────────────────────────────────
        total_customers     = Customer.objects.count()

        # ── Webhook Audit Log ────────────────────────────────────────────────────
        total_submissions   = InboundSubmission.objects.count()
        processed_subs      = InboundSubmission.objects.filter(processed=True).count()
        failed_subs         = InboundSubmission.objects.filter(processed=False).count()

        # ── Technician Counts ────────────────────────────────────────────────────
        total_technicians   = Technician.objects.count()
        available_techs     = Technician.objects.filter(status="available").count()
        on_site_techs       = Technician.objects.filter(status="on_site").count()
        off_duty_techs      = Technician.objects.filter(status="off_duty").count()

        # ── Assignment & Kit Counts ──────────────────────────────────────────────
        total_assignments   = TechnicianAssignment.objects.count()
        kits_ready          = TechnicianAssignment.objects.filter(kit_status="kit_ready").count()
        kits_pending        = TechnicianAssignment.objects.filter(kit_status="pending").count()
        kits_dispatched     = TechnicianAssignment.objects.filter(kit_status="dispatched").count()
        tasks_assigned      = TechnicianAssignment.objects.filter(status="assigned").count()
        tasks_in_progress   = TechnicianAssignment.objects.filter(status="in_progress").count()
        tasks_completed     = TechnicianAssignment.objects.filter(status="completed").count()
        tasks_cancelled     = TechnicianAssignment.objects.filter(status="cancelled").count()

        # ── Print formatted output to terminal ───────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 52))
        self.stdout.write(self.style.SUCCESS("   MIHIRA SOLAR ERP - LIVE DATABASE STATS"))
        self.stdout.write(self.style.SUCCESS("=" * 52))

        # Leads section
        self.stdout.write(self.style.MIGRATE_HEADING("\n[LEADS]"))
        self.stdout.write(f"   Total Leads         : {total_leads}")
        self.stdout.write(f"   - Google Form       : {google_form_leads}")
        self.stdout.write(f"   - Manual Intake     : {manual_leads}")
        self.stdout.write(f"   Status Breakdown    :")
        self.stdout.write(f"     New               : {new_leads}")
        self.stdout.write(f"     Contacted         : {contacted_leads}")
        self.stdout.write(f"     Survey Scheduled  : {survey_leads}")
        self.stdout.write(f"     Closed / Won      : {closed_leads}")
        self.stdout.write(f"     Lost              : {lost_leads}")

        # Customers section
        self.stdout.write(self.style.MIGRATE_HEADING("\n[CUSTOMERS]"))
        self.stdout.write(f"   Total Profiles      : {total_customers}")

        # Webhook audit section
        self.stdout.write(self.style.MIGRATE_HEADING("\n[GOOGLE FORM WEBHOOKS]"))
        self.stdout.write(f"   Total Received      : {total_submissions}")
        self.stdout.write(f"   - Processed OK      : {processed_subs}")
        self.stdout.write(f"   - Failed / Errors   : {failed_subs}")

        # Technicians section
        self.stdout.write(self.style.MIGRATE_HEADING("\n[FIELD TECHNICIANS]"))
        self.stdout.write(f"   Total Crew          : {total_technicians}")
        self.stdout.write(f"   - Available         : {available_techs}")
        self.stdout.write(f"   - On Site           : {on_site_techs}")
        self.stdout.write(f"   - Off Duty          : {off_duty_techs}")

        # Assignments and kit section
        self.stdout.write(self.style.MIGRATE_HEADING("\n[TASK ASSIGNMENTS & KIT READINESS]"))
        self.stdout.write(f"   Total Assignments   : {total_assignments}")
        self.stdout.write(f"   Kit Status:")
        self.stdout.write(f"     [Ready]      Kit Ready      : {kits_ready}")
        self.stdout.write(f"     [Pending]    Kit Pending    : {kits_pending}")
        self.stdout.write(f"     [Dispatched] Dispatched     : {kits_dispatched}")
        self.stdout.write(f"   Task Progress:")
        self.stdout.write(f"     Assigned          : {tasks_assigned}")
        self.stdout.write(f"     In Progress       : {tasks_in_progress}")
        self.stdout.write(f"     Completed         : {tasks_completed}")
        self.stdout.write(f"     Cancelled         : {tasks_cancelled}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 52))
        self.stdout.write("")

