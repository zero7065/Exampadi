/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2-rgb) / <alpha-value>)",
        "bg-3": "rgb(var(--bg-3-rgb) / <alpha-value>)",
        subtle: "rgb(var(--subtle-rgb) / <alpha-value>)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        text: "rgb(var(--text-rgb) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted-rgb) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          dim: "var(--primary-dim)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          dim: "var(--accent-dim)",
        },
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
surface: "rgb(var(--bg-rgb) / <alpha-value>)",
      "surface-2": "rgb(var(--bg-2-rgb) / <alpha-value>)",
      ash: {
        50: "#FAFAF9",
        100: "#F5F5F4",
        200: "#E7E5E4",
        300: "#D6D5D4",
        400: "#A3A1A0",
        500: "#71716F",
        600: "#525252",
        700: "#444444",
        800: "#282828",
        900: "#1A1A18",
      },
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        card: "var(--card-shadow)",
      }
    },
  },
  plugins: [],
}
