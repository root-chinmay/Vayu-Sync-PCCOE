import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "#0FB88D", // Teal Brand
          hover: "#0da07b",
          light: "#E6F8F3",
          dark: "#0B1F33",
        },
        brand: {
          navy: "#0B1F33",
          teal: "#0FB88D",
          "teal-dark": "#0da07b",
          "teal-light": "#E6F8F3",
          cyan: "#38BDF8",
          "cyan-light": "#E0F2FE",
          bg: "#F4F8FB",
          card: "#FFFFFF",
          slate: "#102A43",
          amber: "#FBBF24",
          orange: "#F97316",
          red: "#DC2626",
          green: "#16A34A",
        },
        accent: {
          gold: "#FBBF24",
          emerald: "#0FB88D",
          rose: "#DC2626",
          purple: "#8B5CF6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
