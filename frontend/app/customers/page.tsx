"use client"; // Client component: fetches customer data and manages search state

import { useState, useEffect } from "react";
import Link from "next/link";

// ─────────────────────────────────────────────────
// API base URL
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// TypeScript interfaces
// ─────────────────────────────────────────────────

interface Customer {
  id: number;       // Database primary key
  name: string;     // Full name
  phone: string;    // Unique phone (deduplification key)
  email?: string;   // Optional email
  address?: string; // Optional rooftop site address
  created_at: string; // ISO timestamp of first registration
}

interface Lead {
  id: number;
  customer: Customer;
  source: string;
  status: string;
  monthly_bill?: number;
  created_at: string;
}

// ─────────────────────────────────────────────────
// Customers Page
// Shows all unique customer profiles built from lead intake.
// Each customer can have multiple leads (repeated enquiries).
// ─────────────────────────────────────────────────
export default function CustomersPage() {
  // State: all leads fetched from backend (we derive customers from these)
  const [leads, setLeads] = useState<Lead[]>([]);

  // State: search text for filtering by name, phone, or address
  const [search, setSearch] = useState("");

  // State: loading flag during API request
  const [loading, setLoading] = useState(true);

  // State: error message if backend unreachable
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Data ──────────────────────────────────
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all leads — customer info is nested inside each lead
        const res = await fetch(`${API}/leads/`);
        if (!res.ok) throw new Error("Backend error");

        const data = await res.json();
        setLeads(data.data || []); // Store all leads in state
      } catch {
        setError("Could not load data. Is the Django backend running?");
      } finally {
        setLoading(false);
      }
    };
    fetchLeads();
  }, []); // Run once on mount

  // ── Derive Unique Customers from Leads ──────────
  // Build a map of customer_id → { customer, leads[] }
  // This groups all leads that belong to the same customer profile
  const customerMap = new Map<
    number,
    { customer: Customer; leads: Lead[] }
  >();

  for (const lead of leads) {
    const cid = lead.customer.id;
    if (!customerMap.has(cid)) {
      // First time we see this customer: create entry with empty leads array
      customerMap.set(cid, { customer: lead.customer, leads: [] });
    }
    // Add this lead to the customer's lead list
    customerMap.get(cid)!.leads.push(lead);
  }

  // Convert map values to an array for rendering
  const customers = Array.from(customerMap.values());

  // ── Client-side Search Filter ──────────────────
  // Filter customers by name, phone, or address
  const filtered = customers.filter(({ customer }) => {
    const q = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(q) ||
      customer.phone.toLowerCase().includes(q) ||
      (customer.address && customer.address.toLowerCase().includes(q))
    );
  });

  // ── Render ──────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? "Loading…"
              : `${filtered.length} customer profiles`}
          </p>
        </div>
        {/* CTA: Add a new customer by logging a lead */}
        <Link
          href="/leads/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl shadow hover:bg-amber-600 transition"
        >
          ✍️ Add Customer via Lead Intake
        </Link>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* ── Info Banner: How customers are created ── */}
      <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
        💡 <strong>Note:</strong> Customer profiles are automatically created and deduplicated by phone number
        when a lead is logged via the intake form or received from Google Forms. The same customer
        is never stored twice.
      </div>

      {/* ── Search Box ── */}
      <div className="relative mb-4 max-w-md">
        <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
        <input
          type="text"
          placeholder="Search by name, phone or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)} // Update filter on each keystroke
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* ── Loading State ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading customer profiles…
        </div>
      ) : filtered.length === 0 ? (
        // ── Empty State ──
        <div className="py-16 text-center text-slate-400 text-sm">
          No customers found.{" "}
          <Link href="/leads/new" className="text-amber-600 hover:underline">
            Log the first lead →
          </Link>
        </div>
      ) : (
        // ── Customer Cards Grid ──
        // Display each customer as a card with their leads summary
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ customer, leads: customerLeads }) => (
            <div
              key={customer.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              {/* Customer avatar initial + name */}
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar: shows first letter of customer name */}
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-base flex items-center justify-center shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {/* Customer full name */}
                  <p className="font-bold text-slate-900 truncate">{customer.name}</p>
                  {/* Phone number */}
                  <p className="text-xs text-slate-500">{customer.phone}</p>
                </div>
              </div>

              {/* Customer details section */}
              <div className="space-y-1.5 mb-4">
                {/* Email if available */}
                {customer.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="text-slate-400">✉️</span>
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {/* Address if available */}
                {customer.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="text-slate-400">📍</span>
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}
                {/* First registered date */}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>📅</span>
                  <span>
                    Since {new Date(customer.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Leads summary footer */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                {/* Lead count badge */}
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                    {customerLeads.length}
                  </span>
                  {customerLeads.length === 1 ? "lead" : "leads"}
                </span>

                {/* Source tags for all leads belonging to this customer */}
                <div className="flex flex-wrap gap-1 justify-end">
                  {/* Show unique sources as small badges */}
                  {Array.from(new Set(customerLeads.map((l) => l.source))).map((src) => (
                    <span
                      key={src}
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        src === "google_form"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {src === "google_form" ? "📄 Form" : "📞 Call"}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

