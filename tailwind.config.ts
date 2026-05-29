import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sherpa: {
          50: "#eef4ff",
          100: "#dee9fb",
          200: "#b7d0f7",
          400: "#5388ee",
          500: "#1f6feb",
          600: "#1659cb",
          700: "#1346a3",
          900: "#0c2a63",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
