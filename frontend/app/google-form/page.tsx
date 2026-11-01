"use client"; // Client component: renders the Google Form webhook setup guide

// React hooks for state management
import { useState } from "react";

// Next.js Link for breadcrumb navigation
import Link from "next/link";

// ─────────────────────────────────────────────────
// API base URL — read from env var so it works in production too
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// The full Google Apps Script code to paste into Script Editor.
// It sends form responses to our Django webhook endpoint.
// ─────────────────────────────────────────────────
const APPS_SCRIPT_CODE = `// ─────────────────────────────────────────────────────────
// Mihira Solar ERP — Google Form → Django Webhook Bridge
// Paste this entire script into your Google Form's Apps Script editor.
// Then create an onFormSubmit trigger pointing to sendToMihira().
// ─────────────────────────────────────────────────────────

// ▶ STEP 1: Replace this with your actual localtunnel / production URL
var WEBHOOK_URL = "PASTE_YOUR_LOCALTUNNEL_URL_HERE/api/v1/webhooks/google-form/";
// Example: "https://hot-months-thank.loca.lt/api/v1/webhooks/google-form/"

/**
 * Triggered automatically by Google Forms when a respondent submits.
 * Reads all question responses, builds a JSON payload, and POSTs to Django.
 *
 * @param {Object} e - The onFormSubmit event object provided by Google.
 */
function sendToMihira(e) {
  try {
    // e.namedValues is an object where keys = question titles, values = [answer] arrays
    var responses = e.namedValues;

    // Convert Google's { "Question": ["Answer"] } format to { "question": "answer" }
    var payload = {};
    for (var question in responses) {
      // Take first answer (Google wraps each response in an array)
      var answer = responses[question][0] || "";
      if (answer.trim() !== "") {
        // Store with lowercase key for Django's flexible field normalization
        payload[question.toLowerCase().trim()] = answer.trim();
      }
    }

    // Timestamp of submission for audit trail
    payload["submitted_at"] = new Date().toISOString();

    // Build the HTTP POST request options
    var options = {
      method: "POST",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true  // Prevent Apps Script from throwing on 4xx/5xx responses
    };

    // Send the POST request to Django webhook endpoint
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    // Log result for debugging in Apps Script → Executions dashboard
    if (responseCode === 201) {
      Logger.log("✅ Lead saved successfully: " + responseText);
    } else {
      Logger.log("⚠️ Webhook returned HTTP " + responseCode + ": " + responseText);
    }

  } catch (error) {
    // Log any network or parsing errors
    Logger.log("❌ Error sending to Mihira webhook: " + error.toString());
  }
}`;

// ─────────────────────────────────────────────────
// Steps for setting up the webhook
// ─────────────────────────────────────────────────
const SETUP_STEPS = [
  {
    step: 1,
    title: "Open your Google Form",
    detail: "Go to Google Forms, open the form you want to connect, and click the ⋮ menu → Script Editor.",
    icon: "📋",
  },
  {
    step: 2,
    title: "Paste the Apps Script code",
    detail: "Delete all existing code in the Script Editor and paste the full script below. Replace PASTE_YOUR_LOCALTUNNEL_URL_HERE with your actual localtunnel URL.",
    icon: "📝",
  },
  {
    step: 3,
    title: "Get your localtunnel URL",
    detail: "Run: npx localtunnel --port 8000 in a terminal. Copy the generated HTTPS URL (e.g. https://hot-months-thank.loca.lt) and paste it into the script where indicated.",
    icon: "🔗",
  },
  {
    step: 4,
    title: "Save and create trigger",
    detail: "Press Ctrl+S to save. Then go to Triggers (⏱ icon on left) → Add Trigger → Select function: sendToMihira → Event source: From form → Event type: On form submit → Save.",
    icon: "⚡",
  },
  {
    step: 5,
    title: "Authorize permissions",
    detail: "Google will ask you to authorize the script to access Google Forms and make HTTP requests. Click Review Permissions → Choose your Google account → Allow.",
    icon: "🔐",
  },
  {
    step: 6,
    title: "Test by submitting a test response",
    detail: "Submit a test response on your form. Then check Apps Script → Executions for the log output. The Dashboard should show Google Form count +1 instantly.",
    icon: "✅",
  },
];

// ─────────────────────────────────────────────────
// GoogleFormSetupPage Component
// ─────────────────────────────────────────────────
export default function GoogleFormSetupPage() {
  // State: tracks whether the script was copied to clipboard
  const [copied, setCopied] = useState(false);

  // State: the localtunnel URL the user enters to build a live webhook URL preview
  const [tunnelUrl, setTunnelUrl] = useState("https://hot-months-thank.loca.lt");

  // State: test result from pinging the webhook
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // State: whether test request is in-flight
  const [testing, setTesting] = useState(false);

  // ── Build the live webhook URL from the user's tunnel input ──
  // Strips trailing slash to avoid double slashes in final URL
  const cleanTunnel = tunnelUrl.replace(/\/$/, "");
  const webhookUrl = `${cleanTunnel}/api/v1/webhooks/google-form/`;

  // ── Build the final script with real URL substituted in ──
  const finalScript = APPS_SCRIPT_CODE.replace(
    "PASTE_YOUR_LOCALTUNNEL_URL_HERE/api/v1/webhooks/google-form/",
    webhookUrl
  );

  // ── Copy script to clipboard ──────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalScript);
      setCopied(true);
      // Reset the "Copied!" label after 3 seconds
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Could not copy. Please select all text and copy manually.");
    }
  };

  // ── Send a test POST to our own Django webhook ───────────
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/webhooks/google-form/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Customer (Form Test)",
          phone: `+91999${Date.now().toString().slice(-7)}`, // Unique phone each test
          email: "test@mihirasolar.com",
          address: "Test Address, Hyderabad",
          "monthly bill": "3500",
          notes: "Submitted via webhook test on setup page",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({
          ok: true,
          message: `✅ Test lead #${data.lead_id} for "${data.customer_name}" saved in database! Check Dashboard.`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `❌ Webhook returned HTTP ${res.status}: ${JSON.stringify(data.errors || data)}`,
        });
      }
    } catch {
      setTestResult({
        ok: false,
        message: "❌ Cannot reach backend at " + API + ". Make sure Django is running on port 8000.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-slate-600">Dashboard</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">Google Form Setup</span>
      </div>

      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <span>📄</span> Connect Google Form to Mihira ERP
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Auto-capture every form submission as a solar lead in your database — no manual copy-paste.
        </p>
      </div>

      {/* ── How it Works Banner ── */}
      <div className="mb-8 bg-slate-800 text-slate-100 rounded-2xl p-5">
        <p className="text-sm font-bold mb-3">⚡ How It Works</p>
        <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
          <span className="bg-slate-700 px-3 py-1.5 rounded-lg">Customer fills Google Form</span>
          <span className="text-amber-400">→</span>
          <span className="bg-slate-700 px-3 py-1.5 rounded-lg">Apps Script fires instantly</span>
          <span className="text-amber-400">→</span>
          <span className="bg-slate-700 px-3 py-1.5 rounded-lg">POST to Django webhook</span>
          <span className="text-amber-400">→</span>
          <span className="bg-emerald-700 px-3 py-1.5 rounded-lg font-bold">Lead saved in database ✅</span>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Latency: &lt;1 second · Cost: Free (runs on Google&apos;s servers) · No third-party services needed
        </p>
      </div>

      {/* ── Step 1: Localtunnel URL Input ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
          🔗 Step 1 — Set Your Public Webhook URL
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Google Apps Script runs on Google&apos;s servers, so it can&apos;t reach your localhost directly.
          Use <strong>localtunnel</strong> to create a temporary public HTTPS URL.
          Run this in your terminal, then paste the URL below:
        </p>
        {/* Terminal command box */}
        <div className="bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span>npx localtunnel --port 8000</span>
          <span className="text-slate-500 text-xs">← run this in terminal</span>
        </div>

        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Your Localtunnel URL <span className="text-rose-500">*</span>
        </label>
        <input
          type="url"
          value={tunnelUrl}
          onChange={(e) => setTunnelUrl(e.target.value)}
          placeholder="https://your-tunnel-name.loca.lt"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
        />
        {/* Live preview of the full webhook URL */}
        <p className="mt-2 text-xs text-slate-500">
          Full webhook URL:{" "}
          <code className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-mono">
            POST {webhookUrl}
          </code>
        </p>
      </div>

      {/* ── Step 2: Apps Script Code Block ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            📝 Step 2 — Paste this into Google Apps Script Editor
          </h2>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              copied
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700 border border-slate-200"
            }`}
          >
            {copied ? "✅ Copied!" : "📋 Copy Script"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          In your Google Form: click <strong>⋮ → Script Editor</strong>. Delete all existing code, paste this, and save.
        </p>
        {/* Scrollable code block */}
        <div className="relative">
          <pre className="bg-slate-900 text-emerald-300 text-xs font-mono rounded-xl p-4 overflow-x-auto overflow-y-auto max-h-72 leading-relaxed whitespace-pre">
            {finalScript}
          </pre>
        </div>
      </div>

      {/* ── Setup Steps ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">📋 Complete Setup Checklist</h2>
        <div className="space-y-4">
          {SETUP_STEPS.map((s) => (
            <div key={s.step} className="flex items-start gap-4">
              {/* Step number bubble */}
              <div className="shrink-0 w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <span>{s.icon}</span> {s.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Test the Webhook ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
          🧪 Test Django Webhook Locally
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Click below to send a test lead directly to your local Django server (bypasses Apps Script and tunnel).
          Confirms the backend endpoint is working correctly.
        </p>
        <button
          onClick={handleTest}
          disabled={testing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl shadow hover:bg-amber-600 transition disabled:opacity-50"
        >
          {testing ? "Sending…" : "🚀 Send Test Submission to Django"}
        </button>

        {/* Test result banner */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${
            testResult.ok
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* ── Supported Question Labels ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">🗂️ Supported Google Form Question Labels</h2>
        <p className="text-xs text-slate-500 mb-4">
          Your form question titles don&apos;t need to be exact. The backend auto-maps these common labels:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { field: "Customer Name", aliases: "name, full name, customer name, your name" },
            { field: "Phone / WhatsApp", aliases: "phone, mobile, phone number, whatsapp, contact" },
            { field: "Email", aliases: "email, email address" },
            { field: "Address", aliases: "address, site address, installation address, location, city" },
            { field: "Monthly Bill (₹)", aliases: "monthly bill, electricity bill, average bill, bill" },
            { field: "Monthly Units (kWh)", aliases: "monthly units, units, kwh, consumption" },
            { field: "Sanctioned Load (kW)", aliases: "sanctioned load, load, meter load" },
            { field: "Roof Area (m²)", aliases: "roof area, roof size, rooftop area, shadow free" },
          ].map((item) => (
            <div key={item.field} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs font-bold text-slate-800">{item.field}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono leading-relaxed">{item.aliases}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Any unrecognised question titles are automatically appended to the lead&apos;s Notes field so no data is lost.
        </p>
      </div>
    </div>
  );
}
