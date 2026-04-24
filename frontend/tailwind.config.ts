import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#0b1020",
        ink: "#111827",
        champagne: "#f8efe0",
        aurora: "#7c3aed"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(124, 58, 237, 0.24)"
      }
    }
  },
  plugins: []
};

export default config;
