import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        glow: {
          "0%, 100%": { boxShadow: "0 0 0px rgba(239, 68, 68, 0.4)" },
          "50%": { boxShadow: "0 0 18px rgba(239, 68, 68, 0.7)" }
        },
        heartbeat: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0px rgba(248, 113, 113, 0.25)" },
          "12%": { transform: "scale(1.02)", boxShadow: "0 0 16px rgba(248, 113, 113, 0.45)" },
          "22%": { transform: "scale(1)", boxShadow: "0 0 0px rgba(248, 113, 113, 0.2)" },
          "36%": { transform: "scale(1.045)", boxShadow: "0 0 22px rgba(248, 113, 113, 0.6)" },
          "48%": { transform: "scale(1)", boxShadow: "0 0 0px rgba(248, 113, 113, 0.2)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0px rgba(248, 113, 113, 0.2)" }
        }
      },
      animation: {
        glow: "glow 1.6s ease-in-out infinite",
        heartbeat: "heartbeat 1.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
