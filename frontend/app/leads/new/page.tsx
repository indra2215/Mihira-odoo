"use client"; // Client component: manages controlled form inputs and POST submission

import { useState } from "react";
import { useRouter } from "next/navigation"; // For redirecting after successful submission
import Link from "next/link";

// ─────────────────────────────────────────────────
// API base URL
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// FormData shape — mirrors the fields in LeadSerializer
// ─────────────────────────────────────────────────
interface FormData {
  customer_name: string;       // Required: customer full name
  customer_phone: string;      // Required: unique phone identifier
  customer_email: string;      // Optional: email for correspondence
  customer_address: string;    // Optional: rooftop site address
  monthly_bill: string;        // Optional: electricity bill in INR (string → parsed to float on submit)
  monthly_units: string;       // Optional: monthly consumption in kWh
  sanctioned_load_kw: string;  // Optional: meter sanctioned load in kW
  roof_area_sqm: string;       // Optional: shadow-free roof area in m²
  notes: string;               // Optional: staff call summary or remarks
}

// ─────────────────────────────────────────────────
// Empty form initial state
// All fields start empty for a fresh intake
// ─────────────────────────────────────────────────
const EMPTY_FORM: FormData = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
  monthly_bill: "",
  monthly_units: "",
  sanctioned_load_kw: "",
  roof_area_sqm: "",
  notes: "",
};

// ─────────────────────────────────────────────────
// New Lead Page
// Staff use this form while answering a phone call or at a walk-in counter.
// Submits to POST /api/v1/leads/ and redirects to /leads on success.
// ─────────────────────────────────────────────────
export default function NewLeadPage() {
  // Next.js router for programmatic navigation after form submission
  const router = useRouter();

  // State: controlled form field values
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  // State: tracks whether form submission is in progress (disables submit button)
  const [submitting, setSubmitting] = useState(false);

  // State: success notification shown after a lead is successfully saved
  const [success, setSuccess] = useState<string | null>(null);

  // State: error message shown if validation fails or API returns error
  const [error, setError] = useState<string | null>(null);

  // ── Field Update Helper ────────────────────────
  // Generic handler: updates a single form field by key
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Spread existing form state and override only the changed field
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Form Submission ────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();      // Prevent default browser full-page reload
    setSubmitting(true);     // Disable submit button during API call
    setError(null);          // Clear any previous error
    setSuccess(null);        // Clear any previous success message

    try {
      // Build API payload — parse numeric strings to floats, omit empty optional fields
      const payload: Record<string, unknown> = {
        customer_name:  form.customer_name,
        customer_phone: form.customer_phone.trim(), // Strip leading/trailing whitespace from phone
      };

      // Only include optional fields if the user filled them in
      if (form.customer_email)      payload.customer_email    = form.customer_email;
      if (form.customer_address)    payload.customer_address  = form.customer_address;
      if (form.monthly_bill)        payload.monthly_bill      = parseFloat(form.monthly_bill);        // INR
      if (form.monthly_units)       payload.monthly_units     = parseFloat(form.monthly_units);       // kWh
      if (form.sanctioned_load_kw)  payload.sanctioned_load_kw = parseFloat(form.sanctioned_load_kw); // kW
      if (form.roof_area_sqm)       payload.roof_area_sqm     = parseFloat(form.roof_area_sqm);       // m²
      if (form.notes)               payload.notes             = form.notes;

      // POST to Django backend to create customer + lead in one request
      const res = await fetch(`${API}/leads/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Tell Django to parse body as JSON
        body: JSON.stringify(payload),                   // Serialize payload to JSON string
      });

      // Parse JSON response from Django serializer
      const data = await res.json();

      if (res.ok) {
        // Success: show confirmation and redirect to leads table after 1.5 seconds
        setSuccess(
          `✅ Lead #${data.data.id} saved for "${data.data.customer.name}"! Redirecting…`
        );
        setForm(EMPTY_FORM); // Reset form to blank

        // Redirect to /leads after short delay so user sees the success message
        setTimeout(() => router.push("/leads"), 1500);
      } else {
        // Show validation errors returned from Django serializer
        const errMsg = data.errors
          ? Object.entries(data.errors)
              .map(([field, msgs]) => `${field}: ${msgs}`) // Format as "field: message"
              .join("; ")
          : "Submission failed. Check all required fields.";
        setError(errMsg);
      }
    } catch {
      // Network or connection failure
      setError("Network error. Is the Django backend running on port 8000?");
    } finally {
      setSubmitting(false); // Re-enable submit button
    }
  };

  // ── Render ────────────────────────────────────
  return (
    <div className="max-w-2xl">
      {/* ── Breadcrumb navigation ── */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600">Dashboard</Link>
        <span>/</span>
        <Link href="/leads" className="hover:text-slate-600">Leads</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">New Lead</span>
      </div>

      {/* ── Page Title ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Log New Solar Lead</h1>
        <p className="text-sm text-slate-500 mt-1">
          Use this form while speaking to a customer on the phone or at a walk-in counter.
          Data is saved directly to the PostgreSQL database.
        </p>
      </div>

      {/* ── Success Banner ── */}
      {success && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          {success}
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* ── Intake Form ── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ────── Section 1: Customer Contact Details ────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            👤 Customer Contact Details
          </h2>

          {/* Two-column grid for name and phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Customer Full Name (required) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="customer_name"            // Name matches FormData key
                required                         // Browser-level required validation
                placeholder="e.g. Suresh Kumar"
                value={form.customer_name}
                onChange={handleChange}          // Generic change handler
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Phone Number (required, used as unique customer identifier) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
                <span className="ml-1 text-slate-400 font-normal">(unique identifier)</span>
              </label>
              <input
                type="tel"
                name="customer_phone"
                required
                placeholder="e.g. +919876543210"
                value={form.customer_phone}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                name="customer_email"
                placeholder="e.g. suresh@gmail.com"
                value={form.customer_email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Installation Site Address (optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Installation Address <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                name="customer_address"
                placeholder="e.g. Plot 15, Sector 4, Hyderabad"
                value={form.customer_address}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ────── Section 2: Electricity & Roof Specs ────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">
            ⚡ Electricity Bill & Roof Specifications
          </h2>
          <p className="text-xs text-slate-400">
            All fields optional — fill in what the customer shares during the call.
          </p>

          {/* Four-column grid on large screens, one column on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Monthly electricity bill in INR */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Bill (₹)
              </label>
              <input
                type="number"
                name="monthly_bill"
                step="any"             // Allow decimal values
                min="0"
                placeholder="e.g. 4500"
                value={form.monthly_bill}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Monthly electricity units consumed */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monthly Units (kWh)
              </label>
              <input
                type="number"
                name="monthly_units"
                step="any"
                min="0"
                placeholder="e.g. 450"
                value={form.monthly_units}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Sanctioned load from electricity board meter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sanctioned Load (kW)
              </label>
              <input
                type="number"
                name="sanctioned_load_kw"
                step="any"
                min="0"
                placeholder="e.g. 5"
                value={form.sanctioned_load_kw}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Shadow-free rooftop area available for solar panels */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roof Area (m²)
              </label>
              <input
                type="number"
                name="roof_area_sqm"
                step="any"
                min="0"
                placeholder="e.g. 50"
                value={form.roof_area_sqm}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ────── Section 3: Staff Notes ────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            📝 Staff Notes / Call Summary <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="notes"
            rows={4}
            placeholder="e.g. Customer interested in PM Surya Ghar subsidy, has flat RCC roof, prefers site visit on Saturday morning…"
            value={form.notes}
            onChange={handleChange}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
          />
        </div>

        {/* ────── Form Action Buttons ────── */}
        <div className="flex justify-between items-center">
          {/* Cancel: navigate back to leads list */}
          <Link
            href="/leads"
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
          >
            ← Cancel
          </Link>

          <div className="flex gap-3">
            {/* Clear form button resets all fields to empty */}
            <button
              type="button"
              onClick={() => setForm(EMPTY_FORM)} // Reset all fields to empty state
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
            >
              Clear
            </button>

            {/* Submit button — disabled while API request is in-flight */}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-amber-500 rounded-xl shadow hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Saving…" : "💾 Save Lead to Database"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

