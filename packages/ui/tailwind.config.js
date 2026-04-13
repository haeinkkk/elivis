/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        elivis: {
          bg: "rgb(var(--elivis-bg) / <alpha-value>)",
          surface: {
            DEFAULT: "rgb(var(--elivis-surface-1) / <alpha-value>)",
            elevated: "rgb(var(--elivis-surface-2) / <alpha-value>)",
          },
          accent: {
            DEFAULT: "rgb(var(--elivis-accent) / <alpha-value>)",
            hover: "rgb(var(--elivis-accent-hover) / <alpha-value>)",
            strong: "rgb(var(--elivis-accent-strong) / <alpha-value>)",
          },
          ink: {
            DEFAULT: "rgb(var(--elivis-text-primary) / <alpha-value>)",
            secondary: "rgb(var(--elivis-text-secondary) / <alpha-value>)",
            muted: "rgb(var(--elivis-text-muted) / <alpha-value>)",
          },
          line: "rgb(var(--elivis-border) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
