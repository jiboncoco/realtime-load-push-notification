import type { Config } from "tailwindcss";

// TV: kontras tinggi, tipografi besar. Token brand sama dengan app lain.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1F6F50", dark: "#155840" },
        accent: { DEFAULT: "#F59E0B" },
      },
    },
  },
  plugins: [],
};

export default config;
