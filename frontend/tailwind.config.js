/** @type {import('tailwindcss').Config} */
// Tailwind CSS configuration file defining scanned template paths and theme extensions
module.exports = {
  // Array of file globs where Tailwind should look for utility class names
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",        // Next.js App Router pages and layouts
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // Traditional pages directory if used
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // Custom UI components
  ],
  theme: {
    extend: {}, // Theme custom color and font extensions
  },
  plugins: [],  // Additional Tailwind plugins
};

