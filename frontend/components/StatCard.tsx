// Reusable StatCard component for displaying a single dashboard metric
// Used in the Dashboard page to show Total Leads, Customers, etc.

// ─────────────────────────────────────────────────
// Props interface for the StatCard component
// ─────────────────────────────────────────────────
interface StatCardProps {
  title: string;         // Label shown above the number (e.g. "Total Leads")
  value: number;         // The numeric value to display prominently
  subtitle?: string;     // Optional small description below the number
  icon: string;          // Emoji or icon shown in the top-right badge
  color?: string;        // Tailwind text color class for the value (default: slate-900)
  borderColor?: string;  // Tailwind border-top color accent class
}

// ─────────────────────────────────────────────────
// StatCard: A clean white card displaying one metric
// ─────────────────────────────────────────────────
export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = "text-slate-900",          // Default text color is near-black
  borderColor = "border-slate-200",  // Default border is subtle gray
}: StatCardProps) {
  return (
    // Card container: white background, rounded corners, subtle shadow, top colored border
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm p-5 border-t-4`}>

      {/* Top row: label on the left, icon badge on the right */}
      <div className="flex items-start justify-between mb-3">
        {/* Metric label in small uppercase */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {/* Icon badge with light gray background */}
        <span className="text-xl bg-slate-50 p-1.5 rounded-lg">{icon}</span>
      </div>

      {/* Large numeric value displayed prominently */}
      <p className={`text-4xl font-black ${color}`}>{value}</p>

      {/* Optional subtitle shown below the number in muted small text */}
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}

