"use client"; // Must be client component because it uses usePathname hook for active link detection

// Next.js navigation hook to read the current URL path
import { usePathname } from "next/navigation";

// Next.js Link component for client-side page navigation without full reload
import Link from "next/link";

// ─────────────────────────────────────────────────
// Navigation item type definition
// Each menu entry has a display label, route href, and an emoji icon
// ─────────────────────────────────────────────────
interface NavItem {
  label: string;   // Text shown in the sidebar
  href: string;    // URL path this link navigates to
  icon: string;    // Emoji icon shown beside the label
}

// ─────────────────────────────────────────────────
// Master list of sidebar navigation items
// Add new pages here to automatically appear in the sidebar
// ─────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",        href: "/",              icon: "📊" }, // Overview stats and recent leads
  { label: "All Leads",        href: "/leads",         icon: "📋" }, // Full filterable leads table
  { label: "New Lead",         href: "/leads/new",     icon: "✍️"  }, // Manual call intake form
  { label: "Customers",        href: "/customers",     icon: "👥" }, // Deduplicated customer profiles
  { label: "Technicians",      href: "/technicians",   icon: "👷" }, // Field workforce & kit readiness tasks
  { label: "Google Form Setup",href: "/google-form",   icon: "📄" }, // Webhook bridge setup & Apps Script guide
];

// ─────────────────────────────────────────────────
// Sidebar Component
// Renders the left navigation panel shared across all pages
// ─────────────────────────────────────────────────
export default function Sidebar() {
  // Get current URL path to highlight the active menu item
  const pathname = usePathname();

  return (
    // Sidebar container: fixed height, slate dark background, flex column layout
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col shrink-0">

      {/* ── Brand / Logo Section ── */}
      <div className="px-5 py-6 border-b border-slate-700">
        {/* Sun icon badge */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            {/* App name */}
            <p className="text-white font-extrabold text-sm leading-tight">Mihira Solar</p>
            {/* App subtitle */}
            <p className="text-slate-400 text-xs">Lead Management ERP</p>
          </div>
        </div>
      </div>

      {/* ── Navigation Links ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Render each nav item from the NAV_ITEMS array */}
        {NAV_ITEMS.map((item) => {
          // ── Active State Detection ──────────────────────────────────────
          // Use EXACT match for all routes to prevent multiple items being
          // highlighted simultaneously.
          //
          // Problem without exact match:
          //   pathname = "/leads/new" → startsWith("/leads") = true  ← WRONG (both items lit)
          //   pathname = "/leads/new" → startsWith("/leads/new") = true ← correct
          //
          // Special case: "/customers" and "/technicians" use prefix match so that
          // future deep sub-routes (e.g. /customers/123) still highlight correctly,
          // since those routes have no sibling conflicts in the nav.
          const isActive =
            item.href === "/"
              ? pathname === "/"                               // Dashboard: strict exact match
              : item.href === "/leads"
              ? pathname === "/leads"                          // All Leads: exact only (avoids /leads/new clash)
              : pathname.startsWith(item.href);               // All others: prefix (safe since no siblings)

          return (
            <Link
              key={item.href}                             // Unique key for React list rendering
              href={item.href}                            // Destination route
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? "bg-amber-500 text-white shadow-md"             // Active: amber highlight
                  : "text-slate-400 hover:bg-slate-800 hover:text-white" // Inactive: muted with hover
                }
              `}
            >
              {/* Icon */}
              <span className="text-base">{item.icon}</span>
              {/* Label */}
              <span>{item.label}</span>
              {/* Active indicator dot on the right */}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer: Backend status indicator ── */}
      <div className="px-5 py-4 border-t border-slate-700">
        {/* Pulsing green dot + label showing Django backend is connected */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Django API: localhost:8000</span>
        </div>
      </div>
    </aside>
  );
}

