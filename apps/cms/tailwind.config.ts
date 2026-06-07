import type { Config } from "tailwindcss";

// Token visual dari CLAUDE.md §3: deep green primary + amber accent.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F6F50", // deep green
          dark: "#155840",
        },
        accent: {
          DEFAULT: "#F59E0B", // amber CTA
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
