// Root layout for the entire Mihira Solar ERP application.
// This file wraps every page — the sidebar is rendered here so it
// appears on all routes without re-mounting between navigations.

// Import global Tailwind CSS styles and CSS variable definitions
import "./globals.css";

// Import the shared sidebar navigation component
import Sidebar from "../components/Sidebar";

// ─────────────────────────────────────────────────
// Page metadata: sets the browser tab title and SEO description
// ─────────────────────────────────────────────────
export const metadata = {
  title: "Mihira Solar ERP",                                         // Browser tab title
  description: "Solar lead intake, customer management, and pipeline tracking", // SEO meta description
};

// ─────────────────────────────────────────────────
// RootLayout: shared shell for all pages
// Next.js App Router automatically wraps every page with this component.
// ─────────────────────────────────────────────────
export default function RootLayout({
  children,  // The active page component injected by Next.js routing
}: {
  children: React.ReactNode; // TypeScript type: any valid React content
}) {
  return (
    // HTML root element with English language attribute for accessibility
    <html lang="en">
      {/* Body: minimum full screen height, slate-100 background, antialiased font rendering */}
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">

        {/* Outer flex container: sidebar on the left, page content on the right */}
        <div className="flex min-h-screen">

          {/* ── Left Sidebar Navigation ── */}
          {/* Sidebar is rendered once and persists across all page navigations */}
          <Sidebar />

          {/* ── Main Content Area ── */}
          {/* flex-1 makes this column fill all remaining width after the sidebar */}
          <main className="flex-1 overflow-y-auto">
            {/* Inner padding wrapper for all page content */}
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
              {/* Render the active page component here */}
              {children}
            </div>
          </main>

        </div>
      </body>
    </html>
  );
}
