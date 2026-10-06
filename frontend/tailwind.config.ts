import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#07090e",
          900: "#0c1017",
          850: "#111722",
          800: "#161e2c",
          750: "#1d273a",
          700: "#253249",
          600: "#364765",
          500: "#4f658c",
          400: "#758eb5",
          300: "#a3b7d6",
          200: "#cddaf0",
          100: "#eaf0f9",
          50: "#f6f9fc",
        },
        slate: {
          neon: "#38bdf8",
          amber: "#f59e0b",
          rose: "#f43f5e",
          emerald: "#10b981",
          violet: "#a855f7",
        }
      },
      fontFamily: {
        screenplay: ["Courier Prime", "Courier New", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(56, 189, 248, 0.25)",
        "glow-amber": "0 0 20px -5px rgba(245, 158, 11, 0.25)",
        "glow-rose": "0 0 20px -5px rgba(244, 63, 94, 0.25)",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
