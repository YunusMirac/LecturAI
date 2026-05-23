import type { Config } from "tailwindcss";

/**
 * LecturAI — Design-Tokens (Tailwind v4)
 *
 * Hinweis: Das Projekt lädt diese Datei aus `src/app/globals.css` per `@config`.
 * Globale KI-Ästhetik (Mesh-Hintergrund, Glass-Utilities) liegt zusätzlich in `globals.css`.
 */
const config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Marken-Palette: tiefes Dunkel + Neon-Akzente */
        lectur: {
          void: "#020617",
          abyss: "#0b1120",
          surface: "#0f172a",
          elevated: "#151f32",
          border: "rgba(148, 163, 184, 0.12)",
          "border-bright": "rgba(167, 139, 250, 0.35)",
          muted: "#94a3b8",
          subtle: "#64748b",
          foreground: "#f8fafc",
          accent: {
            violet: "#c4b5fd",
            "violet-core": "#8b5cf6",
            cyan: "#22d3ee",
            emerald: "#34d399",
          },
        },
      },
      backgroundImage: {
        "lectur-mesh":
          "radial-gradient(ellipse 120% 80% at 20% 0%, rgba(139, 92, 246, 0.28) 0%, transparent 55%), radial-gradient(ellipse 100% 60% at 90% 10%, rgba(34, 211, 238, 0.22) 0%, transparent 50%), radial-gradient(ellipse 80% 70% at 10% 90%, rgba(52, 211, 153, 0.14) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(99, 102, 241, 0.12) 0%, transparent 45%)",
        "lectur-shine":
          "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 100%)",
        "lectur-text":
          "linear-gradient(92deg, #e9d5ff 0%, #a5f3fc 42%, #6ee7b7 100%)",
      },
      boxShadow: {
        "glow-violet":
          "0 0 24px rgba(139, 92, 246, 0.45), 0 0 56px rgba(139, 92, 246, 0.2)",
        "glow-cyan":
          "0 0 22px rgba(34, 211, 238, 0.42), 0 0 48px rgba(34, 211, 238, 0.15)",
        "glow-emerald":
          "0 0 22px rgba(52, 211, 153, 0.38), 0 0 44px rgba(16, 185, 129, 0.12)",
        /** Primär-CTA (z. B. Kurs-Code generieren) */
        "glow-cta":
          "0 0 32px rgba(167, 139, 250, 0.55), 0 0 64px rgba(34, 211, 238, 0.28), 0 0 96px rgba(52, 211, 153, 0.12)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        "glass-inset":
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.08)",
      },
      keyframes: {
        /** Für UI-Elemente (nicht `body::before` — der nutzt Keyframes in globals.css) */
        "lectur-ambient": {
          "0%, 100%": { opacity: "1", filter: "blur(0px)" },
          "50%": { opacity: "0.85", filter: "blur(1px)" },
        },
        "lectur-pulse-glow": {
          "0%, 100%": {
            boxShadow:
              "0 0 28px rgba(139, 92, 246, 0.5), 0 0 56px rgba(34, 211, 238, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 40px rgba(167, 139, 250, 0.65), 0 0 80px rgba(34, 211, 238, 0.35)",
          },
        },
        "lectur-shimmer": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" },
        },
        "lectur-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "lectur-ambient": "lectur-ambient 14s ease-in-out infinite",
        "lectur-pulse-glow": "lectur-pulse-glow 2.8s ease-in-out infinite",
        "lectur-shimmer": "lectur-shimmer 2.5s ease-in-out infinite",
        "lectur-float": "lectur-float 5s ease-in-out infinite",
      },
      transitionTimingFunction: {
        "lectur-out": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
} satisfies Config;

export default config;
