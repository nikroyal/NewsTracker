/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#F4F3EE",
        surface: "#FFFFFF",
        "surface-subtle": "#FAF9F5",
        "border-warm": "#E6E5DE",
        "border-strong": "#D5D4CC",
        "ink-main": "#1C1B18",
        "ink-muted": "#68665E",
        "ink-faint": "#9E9C92",
      },
    },
  },
  plugins: [],
}
