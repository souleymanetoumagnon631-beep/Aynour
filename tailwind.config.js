/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "oklch(0.81 0.13 82)",
        background: "oklch(0.08 0.02 80)",
        foreground: "oklch(0.93 0.02 80)",
        card: "oklch(0.12 0.02 80)",
        border: "oklch(0.25 0.02 80)",
        input: "oklch(0.14 0.02 80)",
        muted: "oklch(0.18 0.02 80)",
      },
    },
  },
  plugins: [],
};
