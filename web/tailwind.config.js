/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F8FAFC",
        ink: {
          DEFAULT: "#0F1824",
          light: "#5E6978",
          soft: "#848F9F",
        },
        brand: {
          DEFAULT: "#5746AF",
          50: "#F5F2FF",
          100: "#ECE7FF",
          500: "#5746AF",
          600: "#493A96",
          700: "#3D3080",
          dark: "#2F265F",
          light: "#F5F2FF",
        },
        accent: {
          DEFAULT: "#F97316",
          light: "#FFF7ED",
          dark: "#C77F1A",
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
        },
        success: {
          DEFAULT: "#10B981",
          light: "#D1FAE5",
        },
        info: {
          DEFAULT: "#0284C7",
          light: "#E0F2FE",
        },
      },
      boxShadow: {
        chunky: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 10px 25px -5px rgba(0, 0, 0, 0.08)",
        "chunky-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.06)",
        "chunky-lg": "0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 20px 32px -8px rgba(0, 0, 0, 0.12)",
        none: "0 0 0 0 transparent",
        glow: "0 10px 25px -5px rgba(87, 70, 175, 0.35)",
        "glow-success": "0 10px 25px -5px rgba(16, 185, 129, 0.35)",
        "glow-danger": "0 10px 25px -5px rgba(239, 68, 68, 0.35)",
        // Layered "raised panel" shadows: a tight contact shadow + a soft
        // ambient throw, so cards read as sitting above the page instead
        // of painted flat on it.
        elevated:
          "0 1px 1px 0 rgba(15, 24, 36, 0.04), 0 4px 8px -2px rgba(15, 24, 36, 0.08), 0 16px 32px -8px rgba(15, 24, 36, 0.14)",
        "elevated-hover":
          "0 2px 2px 0 rgba(15, 24, 36, 0.05), 0 8px 16px -4px rgba(15, 24, 36, 0.12), 0 24px 48px -12px rgba(15, 24, 36, 0.20)",
        "elevated-lg":
          "0 2px 4px 0 rgba(15, 24, 36, 0.06), 0 12px 24px -6px rgba(15, 24, 36, 0.16), 0 32px 64px -16px rgba(15, 24, 36, 0.22)",
        // Glossy inset highlight + colored ambient throw, for buttons that
        // should look like a physically pressable raised surface.
        "raised-brand":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 4px 0 rgba(15, 24, 36, 0.15), 0 10px 20px -6px rgba(87, 70, 175, 0.45)",
        "raised-brand-hover":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.3), 0 4px 8px 0 rgba(15, 24, 36, 0.18), 0 16px 28px -6px rgba(87, 70, 175, 0.5)",
        "raised-danger":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 4px 0 rgba(15, 24, 36, 0.15), 0 10px 20px -6px rgba(239, 68, 68, 0.4)",
        "raised-accent":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.25), 0 2px 4px 0 rgba(15, 24, 36, 0.15), 0 10px 20px -6px rgba(249, 115, 22, 0.4)",
        "raised-neutral":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.6), 0 1px 2px 0 rgba(15, 24, 36, 0.06), 0 6px 12px -4px rgba(15, 24, 36, 0.1)",
        pressed:
          "inset 0 1px 3px 0 rgba(15, 24, 36, 0.10), inset 0 1px 2px 0 rgba(15, 24, 36, 0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6C5BC7 0%, #5746AF 50%, #463796 100%)",
        "accent-gradient": "linear-gradient(135deg, #FB923C 0%, #F97316 100%)",
        "success-gradient": "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
        "danger-gradient": "linear-gradient(135deg, #F87171 0%, #EF4444 100%)",
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
