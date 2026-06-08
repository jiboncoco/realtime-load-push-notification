import type { Config } from "tailwindcss";

// Token visual sama dengan CMS (CLAUDE.md §3): deep green + amber.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1F6F50", dark: "#155840" },
        accent: { DEFAULT: "#F59E0B" },
      },
      borderRadius: { "2xl": "1rem", "3xl": "1.5rem" },
    },
  },
  plugins: [],
};

export default config;
