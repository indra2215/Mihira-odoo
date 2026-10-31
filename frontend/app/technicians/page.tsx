"use client"; // Client component: manages interactive state, kit updates, and API calls

// React hooks for component state and side effects
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────
// API base URL — read from env or default to Django dev server
// ─────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────
// TypeScript Interfaces
// ─────────────────────────────────────────────────

// Field technician / crew member model
interface Technician {
  id: number;
  name: string;
  phone: string;
  email?: string;
  specialization: string;
  specialization_display: string;
  status: "available" | "on_site" | "off_duty";
  active_tasks_count: number;
  created_at: string;
}

// Project customer details nested inside lead
interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

// Solar lead details associated with a task
interface Lead {
  id: number;
  customer: Customer;
  source: string;
  status: string;
  monthly_bill?: number;
}

// Task assigned to technician with kit readiness
interface TechnicianAssignment {
  id: number;
  technician: Technician;
  lead: Lead;
  task_type: string;
  task_type_display: string;
  scheduled_date: string;
  kit_status: "kit_ready" | "pending" | "dispatched";
  kit_status_display: string;
  kit_items: string;
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  created_at: string;
}

// ─────────────────────────────────────────────────
// Kit Status styling configuration
// ─────────────────────────────────────────────────
const KIT_STYLES: Record<string, { label: string; badge: string; icon: string }> = {
  kit_ready:  { label: "Kit Ready",      badge: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✅" },
  pending:    { label: "Kit Pending",    badge: "bg-amber-50 text-amber-800 border-amber-300",       icon: "⏳" },
  dispatched: { label: "Kit Dispatched", badge: "bg-blue-50 text-blue-800 border-blue-300",         icon: "🚚" },
};

// ─────────────────────────────────────────────────
// Availability status styling configuration
// ─────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  available: { label: "Available", dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  on_site:   { label: "On Site",   dot: "bg-blue-500",    text: "text-blue-700 bg-blue-50 border-blue-200" },
  off_duty:  { label: "Off Duty",  dot: "bg-slate-400",   text: "text-slate-600 bg-slate-100 border-slate-200" },
};

export default function TechniciansPage() {
  // State: technicians list
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // State: task assignments list
  const [assignments, setAssignments] = useState<TechnicianAssignment[]>([]);

  // State: leads list (for assignment dropdown)
  const [leads, setLeads] = useState<Lead[]>([]);

  // State: loading indicator
  const [loading, setLoading] = useState(true);

  // State: active tab ('board' for task kit readiness, 'crew' for technicians directory)
  const [activeTab, setActiveTab] = useState<"board" | "crew">("board");

  // State: filter by kit status ('all', 'kit_ready', 'pending', 'dispatched')
  const [kitFilter, setKitFilter] = useState("all");

  // State: notification banner
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // State: toggle modal to create new task assignment
  const [showAssignModal, setShowAssignModal] = useState(false);

  // State: new assignment form inputs
  const [assignForm, setAssignForm] = useState({
    technician_id: "",
    lead_id: "",
    task_type: "site_survey",
    scheduled_date: new Date().toISOString().split("T")[0], // Default to today
    kit_status: "kit_ready",
    kit_items: "Digital Inclinometer, Laser Distance Meter, Drone for Shading, Safety Helmet, 30m Tape",
    notes: "",
  });

  // State: form submission loading spinner
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch all data from Django REST API ──────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const [techRes, assignRes, leadsRes] = await Promise.all([
        fetch(`${API}/technicians/`),
        fetch(`${API}/technician-assignments/`),
        fetch(`${API}/leads/`),
      ]);

      if (techRes.ok) {
        const data = await techRes.json();
        setTechnicians(data.data || []);
      }

      if (assignRes.ok) {
        const data = await assignRes.json();
        setAssignments(data.data || []);
      }

      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.data || []);
      }
    } catch {
      setNotification({
        type: "error",
        message: "Failed to connect to backend at " + API,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Update Kit Status in Database ────────────────────────
  const handleUpdateKitStatus = async (assignmentId: number, newKitStatus: "kit_ready" | "pending" | "dispatched") => {
    try {
      const res = await fetch(`${API}/technician-assignments/${assignmentId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kit_status: newKitStatus }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `Kit status updated to "${KIT_STYLES[newKitStatus]?.label || newKitStatus}".`,
        });
        fetchData(); // Refresh assignments list
      } else {
        setNotification({ type: "error", message: "Failed to update kit status." });
      }
    } catch {
      setNotification({ type: "error", message: "Network error updating kit status." });
    }
  };

  // ── Create New Task Assignment ───────────────────────────
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.technician_id || !assignForm.lead_id) {
      setNotification({ type: "error", message: "Please select both a technician and a lead project." });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/technician-assignments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technician_id: parseInt(assignForm.technician_id),
          lead_id: parseInt(assignForm.lead_id),
          task_type: assignForm.task_type,
          scheduled_date: assignForm.scheduled_date,
          kit_status: assignForm.kit_status,
          kit_items: assignForm.kit_items,
          notes: assignForm.notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: "success",
          message: `Task successfully assigned to ${data.data.technician.name}!`,
        });
        setShowAssignModal(false);
        fetchData();
      } else {
        setNotification({
          type: "error",
          message: data.errors ? JSON.stringify(data.errors) : "Failed to assign task.",
        });
      }
    } catch {
      setNotification({ type: "error", message: "Network error saving assignment." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered Assignments ─────────────────────────────────
  const filteredAssignments = assignments.filter((a) => {
    if (kitFilter === "all") return true;
    return a.kit_status === kitFilter;
  });

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <span>👷</span> Field Technicians &amp; Kit Readiness
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Workforce task allocation, rooftop visit scheduling, and equipment kit verification
          </p>
        </div>

        {/* Action Button: Assign Task */}
        <button
          onClick={() => setShowAssignModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl shadow hover:bg-amber-600 transition"
        >
          ➕ Assign Task with Kit
        </button>
      </div>

      {/* ── Notification Banner ── */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded hover:bg-black/5"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* ── Metric Summary Pills ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Technicians</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{technicians.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Active Tasks</p>
          <p className="mt-1 text-2xl font-black text-blue-600">{assignments.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Kits Ready</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">
            {assignments.filter((a) => a.kit_status === "kit_ready").length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Kits Pending</p>
          <p className="mt-1 text-2xl font-black text-amber-600">
            {assignments.filter((a) => a.kit_status === "pending").length}
          </p>
        </div>
      </div>

      {/* ── View Toggle Tabs ── */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab("board")}
          className={`py-3 px-5 text-sm font-semibold rounded-t-xl transition-all ${
            activeTab === "board"
              ? "border-b-2 border-amber-500 text-amber-600 bg-white"
              : "text-slate-500 hover:text-slate-800 bg-transparent"
          }`}
        >
          📋 Task Assignments &amp; Kit Readiness ({assignments.length})
        </button>
        <button
          onClick={() => setActiveTab("crew")}
          className={`py-3 px-5 text-sm font-semibold rounded-t-xl transition-all ${
            activeTab === "crew"
              ? "border-b-2 border-amber-500 text-amber-600 bg-white"
              : "text-slate-500 hover:text-slate-800 bg-transparent"
          }`}
        >
          👷 Field Crew Directory ({technicians.length})
        </button>
      </div>

      {/* ── TAB 1: TASK ASSIGNMENTS & KIT READINESS BOARD ── */}
      {activeTab === "board" && (
        <div className="space-y-4">
          {/* Kit status filter toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Kit Status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setKitFilter("all")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  kitFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Kits ({assignments.length})
              </button>
              <button
                onClick={() => setKitFilter("kit_ready")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  kitFilter === "kit_ready"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                ✅ Kit Ready ({assignments.filter((a) => a.kit_status === "kit_ready").length})
              </button>
              <button
                onClick={() => setKitFilter("pending")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  kitFilter === "pending"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                ⏳ Kit Pending ({assignments.filter((a) => a.kit_status === "pending").length})
              </button>
              <button
                onClick={() => setKitFilter("dispatched")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  kitFilter === "dispatched"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                🚚 Dispatched ({assignments.filter((a) => a.kit_status === "dispatched").length})
              </button>
            </div>
          </div>

          {/* Assignments list */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading task schedule from database…</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
              No tasks found with kit status &quot;{kitFilter}&quot;. Use &quot;Assign Task with Kit&quot; to assign one!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAssignments.map((assignment) => {
                const kitConfig = KIT_STYLES[assignment.kit_status] || {
                  label: assignment.kit_status,
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                  icon: "📦",
                };

                return (
                  <div
                    key={assignment.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-amber-400 transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      {/* Left: Task & Technician info */}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            Task #{assignment.id}
                          </span>
                          <span className="font-bold text-slate-900 text-base">
                            {assignment.task_type_display}
                          </span>
                          {/* Kit status badge */}
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${kitConfig.badge}`}>
                            {kitConfig.icon} {kitConfig.label}
                          </span>
                          {/* Task progress badge */}
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                            {assignment.status.replace("_", " ")}
                          </span>
                        </div>

                        {/* Assigned technician */}
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400">Assigned Tech: </span>
                            <span className="font-semibold text-slate-800">{assignment.technician.name}</span>{" "}
                            <span className="text-slate-400">({assignment.technician.specialization_display})</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Scheduled: </span>
                            <span className="font-semibold text-slate-800">
                              📅 {new Date(assignment.scheduled_date).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>

                        {/* Customer & site address */}
                        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>📍 Project Lead #{assignment.lead.id}:</span>
                            <span>{assignment.lead.customer.name}</span>
                            <span className="text-slate-400 font-normal">({assignment.lead.customer.phone})</span>
                          </div>
                          {assignment.lead.customer.address && (
                            <p className="text-slate-500">{assignment.lead.customer.address}</p>
                          )}
                          {assignment.notes && (
                            <p className="text-amber-800 font-medium">📝 Note: {assignment.notes}</p>
                          )}
                        </div>

                        {/* Kit inventory items checklist */}
                        <div className="text-xs">
                          <p className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                            <span>🧰 Equipment &amp; Kit Checklist:</span>
                          </p>
                          <p className="font-mono text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                            {assignment.kit_items || "No specific items registered."}
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick Kit Status Switcher */}
                      <div className="shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                        <p className="font-bold text-slate-700">Update Kit Status:</p>
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleUpdateKitStatus(assignment.id, "kit_ready")}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-left transition ${
                              assignment.kit_status === "kit_ready"
                                ? "bg-emerald-600 text-white"
                                : "bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            ✅ Mark Kit Ready
                          </button>
                          <button
                            onClick={() => handleUpdateKitStatus(assignment.id, "dispatched")}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-left transition ${
                              assignment.kit_status === "dispatched"
                                ? "bg-blue-600 text-white"
                                : "bg-white text-blue-700 hover:bg-blue-100 border border-blue-200"
                            }`}
                          >
                            🚚 Mark Dispatched
                          </button>
                          <button
                            onClick={() => handleUpdateKitStatus(assignment.id, "pending")}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-left transition ${
                              assignment.kit_status === "pending"
                                ? "bg-amber-600 text-white"
                                : "bg-white text-amber-700 hover:bg-amber-100 border border-amber-200"
                            }`}
                          >
                            ⏳ Mark Pending
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: FIELD CREW DIRECTORY ── */}
      {activeTab === "crew" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technicians.map((tech) => {
            const statusStyle = STATUS_STYLES[tech.status] || {
              label: tech.status,
              dot: "bg-slate-400",
              text: "text-slate-600 bg-slate-100 border-slate-200",
            };

            return (
              <div
                key={tech.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-base flex items-center justify-center">
                      👷
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{tech.name}</h3>
                      <p className="text-xs text-slate-500">{tech.specialization_display}</p>
                    </div>
                  </div>
                  {/* Availability badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                    {statusStyle.label}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mb-4">
                  <p>📞 {tech.phone}</p>
                  {tech.email && <p>✉️ {tech.email}</p>}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Active Tasks:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {tech.active_tasks_count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: ASSIGN TASK WITH KIT READINESS ── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Assign Technician with Kit</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              {/* Technician Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Technician <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.technician_id}
                  onChange={(e) => setAssignForm({ ...assignForm, technician_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Choose a Technician --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization_display}) - {t.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lead / Project Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Project Lead <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.lead_id}
                  onChange={(e) => setAssignForm({ ...assignForm, lead_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Choose a Customer Project --</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lead #{l.id} - {l.customer.name} ({l.customer.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
                <select
                  value={assignForm.task_type}
                  onChange={(e) => setAssignForm({ ...assignForm, task_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="site_survey">Site Survey &amp; Shading Analysis</option>
                  <option value="structure_mounting">Structure &amp; Panel Mounting</option>
                  <option value="panel_wiring">DC Panel Wiring</option>
                  <option value="inverter_installation">Inverter &amp; DB Installation</option>
                  <option value="grid_commissioning">Grid Synchronizing &amp; Net Meter Commissioning</option>
                </select>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={assignForm.scheduled_date}
                  onChange={(e) => setAssignForm({ ...assignForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Kit Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kit Readiness Status</label>
                <select
                  value={assignForm.kit_status}
                  onChange={(e) => setAssignForm({ ...assignForm, kit_status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="kit_ready">✅ Kit Ready (All Tools Packed)</option>
                  <option value="pending">⏳ Kit Pending (Waiting for components)</option>
                  <option value="dispatched">🚚 Kit Dispatched (In vehicle)</option>
                </select>
              </div>

              {/* Kit Inventory Checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kit Inventory Checklist</label>
                <textarea
                  rows={3}
                  value={assignForm.kit_items}
                  onChange={(e) => setAssignForm({ ...assignForm, kit_items: e.target.value })}
                  placeholder="Specify equipment, cable lengths, inverters, meters, and safety gear packed in this kit..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Instructions / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Field Notes / Instructions</label>
                <input
                  type="text"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="e.g. Call customer 30 minutes before arrival; check rooftop staircase key."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-500 rounded-xl shadow hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {submitting ? "Assigning…" : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

