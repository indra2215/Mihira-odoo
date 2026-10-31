"use client"; // Client component: uses useState, useEffect, and fetch for live API data

// React hooks for state management and side effects
import { useState, useEffect } from "react";

// Next.js Link for client-side navigation without full page reload
import Link from "next/link";

// Reusable StatCard component for the metric summary cards
import StatCard from "../components/StatCard";

// ─────────────────────────────────────────────────
// Base URL for the Django REST API backend
// Reads from environment variable, falls back to local dev server
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// TypeScript interfaces matching the Django serializer response shapes
// ─────────────────────────────────────────────────

// Customer profile returned nested inside a Lead
interface Customer {
  id: number;        // Unique database ID
  name: string;      // Full name
  phone: string;     // Contact phone (unique identifier)
  email?: string;    // Optional email
  address?: string;  // Optional site address
}

// Solar lead enquiry record
interface Lead {
  id: number;                              // Unique lead ID
  customer: Customer;                      // Nested customer object
  source: "google_form" | "manual_intake"; // How the lead was captured
  status: string;                          // Pipeline stage
  monthly_bill?: number;                   // Electricity bill in INR
  notes?: string;                          // Staff notes
  created_at: string;                      // ISO timestamp
}

// Dashboard summary statistics returned by /api/v1/stats/
interface Stats {
  total_leads: number;          // All leads in database
  google_form_leads: number;    // Leads from Google Forms webhook
  manual_intake_leads: number;  // Leads from staff manual intake
  total_customers: number;      // Unique customer profiles
  total_technicians: number;    // Total field technicians registered
  active_assignments: number;   // Tasks currently assigned or in-progress
  kits_ready: number;           // Kits confirmed ready to dispatch
}

// ─────────────────────────────────────────────────
// Dashboard Page Component
// Shows: 4 stat cards, recent 5 leads, quick action buttons
// ─────────────────────────────────────────────────
export default function DashboardPage() {
  // State: dashboard summary stats fetched from /api/v1/stats/
  const [stats, setStats] = useState<Stats>({
    total_leads: 0,
    google_form_leads: 0,
    manual_intake_leads: 0,
    total_customers: 0,
    total_technicians: 0,
    active_assignments: 0,
    kits_ready: 0,
  });

  // State: recent leads list fetched from /api/v1/leads/ (limited to 5 most recent)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  // State: loading flag shown while API requests are in-flight
  const [loading, setLoading] = useState(true);

  // State: error message if API is unreachable
  const [error, setError] = useState<string | null>(null);

  // ── Data Fetching ──────────────────────────────
  // Fetches both stats and recent leads concurrently on mount
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true); // Show loading placeholder
        setError(null);   // Clear any previous error

        // Fire both requests simultaneously to reduce total wait time
        const [statsRes, leadsRes] = await Promise.all([
          fetch(`${API}/stats/`),  // GET dashboard summary counts
          fetch(`${API}/leads/`),  // GET all leads (we slice to 5 below)
        ]);

        // Parse stats response if successful
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats); // Update stats state with returned counts
        }

        // Parse leads response and keep only the 5 most recent entries
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setRecentLeads((data.data || []).slice(0, 5)); // Slice to latest 5
        }
      } catch {
        // Show error banner if network request fails
        setError("Cannot connect to Django backend at " + API);
      } finally {
        setLoading(false); // Hide loading indicator regardless of outcome
      }
    };

    fetchDashboard(); // Call fetch function on component mount
  }, []); // Empty dependency array means this runs once when page first loads

  // ── Render ────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-8">
        {/* Page title */}
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        {/* Subtitle */}
        <p className="text-sm text-slate-500 mt-1">
          Live overview of solar leads and customer intake pipeline
        </p>
      </div>

      {/* ── Error Banner (shown only when API is unreachable) ── */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* ── Stat Cards Grid ── */}
      {/* Row 1: Lead intake stats — 2 columns on mobile, 4 on large screens */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Card 1: Total Leads */}
        <StatCard
          title="Total Leads"
          value={stats.total_leads}
          subtitle="All captured solar enquiries"
          icon="📋"
          color="text-slate-900"
          borderColor="border-slate-300"
        />
        {/* Card 2: Google Form Leads (green accent) */}
        <StatCard
          title="Google Form"
          value={stats.google_form_leads}
          subtitle="Automated webhook submissions"
          icon="📄"
          color="text-emerald-600"
          borderColor="border-emerald-400"
        />
        {/* Card 3: Manual Intake Leads (blue accent) */}
        <StatCard
          title="Manual Intake"
          value={stats.manual_intake_leads}
          subtitle="Logged by staff callers"
          icon="📞"
          color="text-blue-600"
          borderColor="border-blue-400"
        />
        {/* Card 4: Total Customers (purple accent) */}
        <StatCard
          title="Customers"
          value={stats.total_customers}
          subtitle="Deduplicated profiles"
          icon="👥"
          color="text-purple-700"
          borderColor="border-purple-400"
        />
      </div>

      {/* Row 2: Field operations stats — 3 cards on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Card 5: Field Technicians (amber accent) */}
        <StatCard
          title="Field Technicians"
          value={stats.total_technicians}
          subtitle="Registered crew members"
          icon="👷"
          color="text-amber-600"
          borderColor="border-amber-400"
        />
        {/* Card 6: Active Assignments (rose accent) */}
        <StatCard
          title="Active Assignments"
          value={stats.active_assignments}
          subtitle="Assigned or in-progress tasks"
          icon="⚙️"
          color="text-rose-600"
          borderColor="border-rose-400"
        />
        {/* Card 7: Kits Ready (teal accent) */}
        <StatCard
          title="Kits Ready"
          value={stats.kits_ready}
          subtitle="Equipment kits confirmed ready"
          icon="🧰"
          color="text-teal-600"
          borderColor="border-teal-400"
        />
      </div>

      {/* ── Quick Action Buttons ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Primary CTA: Log a new lead via manual intake */}
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl shadow hover:bg-amber-600 transition"
        >
          ✍️ Log New Lead
        </Link>
        {/* Secondary CTA: Browse all leads */}
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        >
          📋 View All Leads
        </Link>
        {/* Tertiary CTA: Browse customer profiles */}
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        >
          👥 Customer Profiles
        </Link>
        {/* Quaternary CTA: Field technician & kit management */}
        <Link
          href="/technicians"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition"
        >
          👷 Technicians & Kits
        </Link>
      </div>

      {/* ── Recent Leads Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header row */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Recent Leads</h2>
          {/* Link to full leads page */}
          <Link href="/leads" className="text-xs text-amber-600 hover:underline font-semibold">
            View all →
          </Link>
        </div>

        {/* Loading placeholder */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading from backend...</div>
        ) : recentLeads.length === 0 ? (
          // Empty state: no leads in database yet
          <div className="py-12 text-center text-slate-400 text-sm">
            No leads yet.{" "}
            <Link href="/leads/new" className="text-amber-600 underline">
              Log the first lead →
            </Link>
          </div>
        ) : (
          // Leads table
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* Column headers */}
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Bill (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    {/* Lead ID in monospace */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 font-bold">
                      #{lead.id}
                    </td>
                    {/* Customer name and phone */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lead.customer.name}</div>
                      <div className="text-xs text-slate-400">{lead.customer.phone}</div>
                    </td>
                    {/* Source badge: Google Form (green) or Manual (blue) */}
                    <td className="py-3 px-4">
                      {lead.source === "google_form" ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          📄 Google Form
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          📞 Manual
                        </span>
                      )}
                    </td>
                    {/* Monthly electricity bill formatted with locale separator */}
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {lead.monthly_bill
                        ? `₹${Number(lead.monthly_bill).toLocaleString("en-IN")}`
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    {/* Pipeline status badge */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {lead.status.replace(/_/g, " ")} {/* Replace underscores with spaces */}
                      </span>
                    </td>
                    {/* Creation date formatted as DD/MM/YYYY */}
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {new Date(lead.created_at).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Google Forms Webhook Info Card ── */}
      {/* This is purely informational — tells the Django endpoint URL for Apps Script setup */}
      <div className="mt-6 p-5 rounded-2xl bg-slate-800 text-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold">Google Forms Webhook Endpoint</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Point your Google Apps Script trigger to this URL to auto-capture form leads:
          </p>
          {/* Monospace URL display — reads from env var so it works in production too */}
          <code className="mt-1 inline-block text-amber-400 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg">
            POST {API}/webhooks/google-form/
          </code>
        </div>
        {/* Status pill */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Endpoint Active
        </span>
      </div>
    </div>
  );
}
