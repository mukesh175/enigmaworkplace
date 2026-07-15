import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "var(--base-950)",
          900: "var(--base-900)",
          800: "var(--base-800)",
          700: "var(--base-700)",
          600: "var(--base-600)",
          500: "var(--base-500)",
          400: "var(--base-400)",
          300: "var(--base-300)",
          200: "var(--base-200)",
          100: "var(--base-100)",
        },
        signal: {
          DEFAULT: "var(--accent)",
          soft: "color-mix(in srgb, var(--accent) 82%, white)",
          dim: "color-mix(in srgb, var(--accent) 70%, black)",
          tint: "color-mix(in srgb, var(--accent) 14%, transparent)",
          tint2: "color-mix(in srgb, var(--accent) 28%, transparent)",
        },
        brand: {
          dark: "#1a1c5c",
          accent: "#ed5e4e",
        },
        ok: "#4ADE80",
        warn: "#FBBF24",
        danger: "#F87171",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "3px",
      },
    },
  },
  plugins: [],
};
export default config;
