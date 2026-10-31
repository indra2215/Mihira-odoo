"use client"; // Client component: manages search, filter state, and API fetching

import { useState, useEffect } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────
// API base URL — read from env or default to local Django dev server
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// TypeScript interfaces matching Django serializer output
// ─────────────────────────────────────────────────

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface Lead {
  id: number;
  customer: Customer;
  source: "google_form" | "manual_intake";
  status: string;
  monthly_units?: number;
  monthly_bill?: number;
  sanctioned_load_kw?: number;
  roof_area_sqm?: number;
  notes?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────
// Pipeline status display configuration
// Maps database status keys to human-readable labels and color classes
// ─────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  new:               { label: "New",               className: "bg-sky-50 text-sky-700 border-sky-200" },
  contacted:         { label: "Contacted",         className: "bg-blue-50 text-blue-700 border-blue-200" },
  survey_scheduled:  { label: "Survey Scheduled",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  closed:            { label: "Closed / Won",       className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  lost:              { label: "Lost",               className: "bg-rose-50 text-rose-700 border-rose-200" },
};

// ─────────────────────────────────────────────────
// All Leads Page
// Fetches full leads list from API and renders a filterable, searchable table
// ─────────────────────────────────────────────────
export default function LeadsPage() {
  // State: full list of leads from the backend
  const [leads, setLeads] = useState<Lead[]>([]);

  // State: text entered in the search box
  const [search, setSearch] = useState("");

  // State: currently selected source filter ('all', 'google_form', 'manual_intake')
  const [source, setSource] = useState("all");

  // State: currently selected pipeline status filter ('all' or a specific status)
  const [statusFilter, setStatusFilter] = useState("all");

  // State: loading indicator while API request is in-flight
  const [loading, setLoading] = useState(true);

  // State: error message if backend is unreachable
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Leads on Mount ─────────────────────────
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);   // Show loading spinner
        setError(null);     // Clear any previous error

        // Fetch all leads from Django REST API
        const res = await fetch(`${API}/leads/`);

        if (!res.ok) throw new Error("Backend returned an error"); // Throw if non-200 response

        const data = await res.json();
        setLeads(data.data || []); // Populate leads state from API response
      } catch {
        setError("Could not load leads. Is the Django backend running?");
      } finally {
        setLoading(false); // Always clear loading state
      }
    };

    fetchLeads(); // Execute fetch when component mounts
  }, []); // No dependencies: runs once on page load

  // ── Client-side Filtering ──────────────────────
  // Apply search query and dropdown filters to the full leads list
  const filtered = leads.filter((lead) => {
    const q = search.toLowerCase(); // Normalize search to lowercase

    // Match search query against customer name, phone, or notes
    const matchSearch =
      lead.customer.name.toLowerCase().includes(q) ||
      lead.customer.phone.toLowerCase().includes(q) ||
      (lead.notes && lead.notes.toLowerCase().includes(q));

    // Match source filter (google_form / manual_intake / all)
    const matchSource = source === "all" || lead.source === source;

    // Match pipeline status filter
    const matchStatus = statusFilter === "all" || lead.status === statusFilter;

    // Return true only if all three conditions pass
    return matchSearch && matchSource && matchStatus;
  });

  // ── Render ────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">All Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            {/* Show total and filtered count */}
            {loading ? "Loading…" : `${filtered.length} of ${leads.length} leads`}
          </p>
        </div>
        {/* CTA: Log a new lead */}
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl shadow hover:bg-amber-600 transition"
        >
          ✍️ Log New Lead
        </Link>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4 flex flex-col lg:flex-row gap-3">

        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name, phone or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)} // Update search state on every keystroke
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Source filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* All sources */}
          <button
            onClick={() => setSource("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              source === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Sources
          </button>
          {/* Google Form only */}
          <button
            onClick={() => setSource("google_form")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              source === "google_form"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            📄 Google Form
          </button>
          {/* Manual intake only */}
          <button
            onClick={() => setSource("manual_intake")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              source === "manual_intake"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-blue-700 hover:bg-blue-50"
            }`}
          >
            📞 Manual Intake
          </button>
        </div>

        {/* Pipeline status filter dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} // Update status filter on selection
          className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="survey_scheduled">Survey Scheduled</option>
          <option value="closed">Closed / Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {/* ── Leads Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          // Loading placeholder rows
          <div className="py-16 text-center text-slate-400 text-sm">Loading leads from backend…</div>
        ) : filtered.length === 0 ? (
          // Empty state when no leads match current filters
          <div className="py-16 text-center text-slate-400 text-sm">
            No leads match your filters.{" "}
            <Link href="/leads/new" className="text-amber-600 hover:underline">
              Log the first one →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* Column header row */}
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Bill / Units</th>
                  <th className="py-3 px-4">Load / Roof</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => {
                  // Look up status style config; fall back to a neutral style if unknown
                  const statusStyle = STATUS_STYLES[lead.status] ?? {
                    label: lead.status,
                    className: "bg-slate-100 text-slate-600 border-slate-200",
                  };

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Lead ID */}
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-400">
                        #{lead.id}
                      </td>

                      {/* Customer name, phone, and address */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{lead.customer.name}</div>
                        <div className="text-xs text-slate-500">{lead.customer.phone}</div>
                        {lead.customer.address && (
                          // Show address truncated to prevent wrapping
                          <div className="text-xs text-slate-400 truncate max-w-[180px]">
                            {lead.customer.address}
                          </div>
                        )}
                      </td>

                      {/* Source badge */}
                      <td className="py-3.5 px-4">
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

                      {/* Monthly electricity bill and consumption units */}
                      <td className="py-3.5 px-4">
                        {lead.monthly_bill ? (
                          <div className="font-semibold text-slate-900">
                            ₹{Number(lead.monthly_bill).toLocaleString("en-IN")}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-xs">No bill</div>
                        )}
                        {lead.monthly_units && (
                          <div className="text-xs text-slate-500">{lead.monthly_units} kWh/mo</div>
                        )}
                      </td>

                      {/* Sanctioned load and available roof area */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700">
                          {lead.sanctioned_load_kw ? `${lead.sanctioned_load_kw} kW` : "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lead.roof_area_sqm ? `${lead.roof_area_sqm} m²` : "—"}
                        </div>
                      </td>

                      {/* Pipeline status badge with dynamic color */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusStyle.className}`}>
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Staff notes truncated to one line; full text shown on hover */}
                      <td
                        className="py-3.5 px-4 text-xs text-slate-500 max-w-[200px] truncate"
                        title={lead.notes}  // Full note text shown in browser tooltip
                      >
                        {lead.notes || "—"}
                      </td>

                      {/* Creation date in Indian locale format */}
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

