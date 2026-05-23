import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f8f4",
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
        },
        surfaceAlt: "#eff7f1",
        foreground: "#10211a",
        muted: "#5f6f65",
        border: "#d8e5db",
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          pale: "var(--color-primary-pale)",
        },
        brand: {
          50: "#eefaf1",
          100: "#d8f4df",
          200: "#b3e7c0",
          300: "#84d79b",
          400: "#58c379",
          500: "#2fa85a",
          600: "#22884a",
          700: "#1c6b3c",
          800: "#185633",
          900: "#14462a",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          50: "#fff1f1",
          100: "#ffe0e0",
          500: "#c23b3b",
          600: "#9f2d2d",
        },
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        neutral: {
          900: "var(--color-neutral-900)",
          700: "var(--color-neutral-700)",
          400: "var(--color-neutral-400)",
          100: "var(--color-neutral-100)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        soft: "0 18px 50px rgba(16, 33, 26, 0.08)",
      },
      backgroundImage: {
        "hero-radial": "radial-gradient(circle at top, rgba(47, 168, 90, 0.12), transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
