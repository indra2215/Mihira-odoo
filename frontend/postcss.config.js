// PostCSS configuration enabling Tailwind CSS processing and vendor autoprefixing
module.exports = {
  plugins: {
    // Compiles Tailwind utility classes into final CSS
    tailwindcss: {},
    // Adds vendor prefixes (-webkit-, -moz-) for cross-browser CSS compatibility
    autoprefixer: {},
  },
};

