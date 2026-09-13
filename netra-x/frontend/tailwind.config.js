/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#060A12",
        panel: "#0C1320",
        panel2: "#0F1826",
        border: "#1B2740",
        primary: "#00E5FF",
        success: "#00F5A0",
        warning: "#FFC857",
        danger: "#FF3B5C",
        ink: "#F4F7FB",
        muted: "#7E8CA3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 229, 255, 0.25)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        xl2: "20px",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.4 },
        },
        dash: {
          to: { strokeDashoffset: 0 },
        },
      },
      animation: {
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        dash: "dash 2s linear forwards",
      },
    },
  },
  plugins: [],
};
