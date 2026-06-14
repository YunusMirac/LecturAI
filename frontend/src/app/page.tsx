"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Clock, Cog, FileText, Zap } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { BlobBackground } from "@/components/landing/BlobBackground";
import { SessionNav } from "@/components/landing/SessionNav";
import { useTheme } from "@/components/theme/ThemeProvider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── Feature card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 20 }}
      className="rounded-2xl border bg-card/70 p-7 backdrop-blur-sm"
      style={{
        borderColor: hovered ? "var(--primary)" : "var(--border)",
        boxShadow: hovered
          ? "0 0 0 1px var(--primary), 0 0 28px color-mix(in srgb, var(--primary) 22%, transparent), 0 8px 24px rgba(0,0,0,0.12)"
          : "0 2px 12px rgba(0,0,0,0.05)",
        transition: "border-color 0.32s ease, box-shadow 0.32s ease",
      }}
    >
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 14%, transparent)" }}
      >
        <span style={{ color: "var(--primary)" }}>{icon}</span>
      </div>
      <h3 className="mb-2 text-[0.95rem] font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}

// ─── Process step: PDF with scanner laser ─────────────────────────────────────

function PdfWithScanner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Vorlesungs-PDF
      </p>
      <div className="relative h-40 w-32 overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <div
          className="absolute right-0 top-0 h-8 w-8"
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, color-mix(in srgb, var(--primary) 55%, #667) 50%)",
          }}
          aria-hidden
        />
        <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <FileText className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="text-[10px] font-medium text-muted-foreground">slides.pdf</span>
        </div>
        <div className="space-y-1.5 px-2.5 py-2">
          {[1, 0.8, 0.93, 0.67].map((w, i) => (
            <div key={i} className="h-1 rounded-sm bg-muted" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
        <motion.div
          className="pointer-events-none absolute inset-x-2 z-10 h-[2px] rounded-full"
          style={{
            background: "var(--primary)",
            boxShadow:
              "0 0 10px var(--primary), 0 0 22px color-mix(in srgb, var(--primary) 60%, transparent)",
          }}
          animate={{ top: ["12%", "88%", "12%"] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

// ─── Process step: KI Gear ────────────────────────────────────────────────────

function GearAi() {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        KI-Verarbeitung
      </p>
      <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card/60 px-6 backdrop-blur-sm">
        <motion.div
          animate={{ rotate: [0, 78, 78, 0, 78, 78, 0] }}
          transition={{
            duration: 4.8,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.12, 0.28, 0.42, 0.54, 0.7, 1],
          }}
        >
          <Cog
            className="h-16 w-16 text-primary"
            strokeWidth={1.15}
            aria-label="KI-Zahnrad"
          />
        </motion.div>
      </div>
    </div>
  );
}

// ─── Process step: staggered quiz cards ───────────────────────────────────────

type QuizMask = { top: boolean; mid: boolean; bot: boolean };

function QuizCardsAnimation() {
  const [mask, setMask] = useState<QuizMask>({ top: false, mid: false, bot: false });

  useEffect(() => {
    let cancelled = false;
    const stagger = 320;
    const holdAll = 800;
    const afterHide = 150;

    async function loop() {
      while (!cancelled) {
        setMask({ top: true, mid: false, bot: false });
        await sleep(stagger);
        if (cancelled) break;
        setMask({ top: true, mid: true, bot: false });
        await sleep(stagger);
        if (cancelled) break;
        setMask({ top: true, mid: true, bot: true });
        await sleep(holdAll);
        if (cancelled) break;
        setMask({ top: false, mid: false, bot: false });
        await sleep(afterHide);
      }
    }

    void loop();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: {
    key: keyof QuizMask;
    offset: string;
    z: string;
    label: string;
    desc: string;
  }[] = [
    { key: "bot", offset: "top-10", z: "z-[1]", label: "Frage 3", desc: "Kurzantwort: Definition…" },
    { key: "mid", offset: "top-5", z: "z-[2]", label: "Frage 2", desc: "Single Choice: Korrekt ist…" },
    { key: "top", offset: "top-0", z: "z-[3]", label: "Frage 1", desc: "Wissenscheck aus der Vorlesung…" },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Online-Klausur
      </p>
      <div className="relative flex h-44 w-full max-w-[11rem] items-center justify-center">
        {cards.map(({ key, offset, z, label, desc }) => (
          <motion.div
            key={key}
            className={`absolute left-1/2 ${offset} ${z} w-[9.5rem] -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-lg`}
            animate={{
              opacity: mask[key] ? 1 : 0,
              y: mask[key] ? 0 : 10,
              scale: mask[key] ? 1 : 0.96,
            }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="text-[10px] font-semibold"
              style={{ color: "var(--accent)" }}
            >
              {label}
            </p>
            <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">{desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES: FeatureCardProps[] = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Vollautomatische Generierung",
    description:
      "Lade dein Vorlesungs-PDF hoch — LecturAI analysiert Inhalte und erstellt in Sekunden eine vollständige Prüfung.",
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: "Akademisch validiert",
    description:
      "Fragen entsprechen echten Prüfungsstandards: richtige Taxonomiestufen, klare Formulierungen und eindeutige Antworten.",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Massiv Zeit sparen",
    description:
      "Was früher Stunden dauerte, gelingt in Minuten. Mehr Zeit für das, was wirklich zählt: gute Lehre.",
  },
];

// ─── Inline easing used across sections ──────────────────────────────────────
const ease = [0.22, 1, 0.36, 1] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <BlobBackground />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-baseline gap-0">
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                Lectur
              </span>
              <span className="text-xl font-extrabold tracking-tight text-primary">AI</span>
            </Link>

            <nav className="ml-4 flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
                aria-label="Hell- und Dunkelmodus umschalten"
              >
                {mounted ? (theme === "dark" ? "☀ Light" : "☾ Dark") : "Theme"}
              </button>
              <SessionNav />
            </nav>
          </div>
        </header>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative z-10 mx-auto max-w-4xl px-5 pb-10 pt-24 text-center sm:px-8 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
          >
            {/* Badge */}
            <span
              className="mb-5 inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-widest"
              style={{
                border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
                color: "var(--primary)",
                backgroundColor: "color-mix(in srgb, var(--primary) 9%, transparent)",
              }}
            >
              KI für die Hochschullehre
            </span>

            {/* Heading */}
            <h1 className="text-balance text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl">
              Aus PDFs werden{" "}
              <span
                style={{
                  background:
                    "linear-gradient(92deg, var(--primary) 0%, var(--accent) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Klausuren.
              </span>
              <br className="hidden sm:block" />
              Vollautomatisch.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              LecturAI verwandelt Vorlesungs-PDFs in akademisch valide Online-Klausuren —
              präzise, schnell und ohne manuellen Aufwand.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-base font-bold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow:
                    "0 0 22px color-mix(in srgb, var(--primary) 60%, transparent), 0 0 44px color-mix(in srgb, var(--primary) 25%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
                }}
              >
                Jetzt kostenlos starten →
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
              >
                Bereits Konto? Zum Login
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── Process animation ────────────────────────────────────────────── */}
        <section className="relative z-10 mx-auto max-w-4xl px-5 py-14 sm:px-8">
          <motion.div
            className="overflow-hidden rounded-2xl border border-border bg-card/30 px-6 py-10 backdrop-blur-md sm:px-10"
            style={{
              boxShadow:
                "0 8px 48px color-mix(in srgb, var(--primary) 7%, rgba(0,0,0,0.1)), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, delay: 0.15, ease }}
          >
            <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              So funktioniert LecturAI
            </p>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
              <PdfWithScanner />
              <GearAi />
              <QuizCardsAnimation />
            </div>
          </motion.div>
        </section>

        {/* ── Features grid ───────────────────────────────────────────────── */}
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease }}
          >
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              Warum{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                LecturAI?
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Drei Gründe, warum Lehrende es lieben.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.09, duration: 0.44, ease }}
              >
                <FeatureCard {...f} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── CTA banner ──────────────────────────────────────────────────── */}
        <section className="relative z-10 mx-auto max-w-4xl px-5 pb-24 sm:px-8">
          <motion.div
            className="overflow-hidden rounded-2xl border p-12 text-center backdrop-blur-sm"
            style={{
              borderColor: "color-mix(in srgb, var(--primary) 28%, transparent)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, var(--card)) 0%, color-mix(in srgb, var(--accent) 7%, var(--card)) 100%)",
              boxShadow:
                "0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent), 0 16px 64px color-mix(in srgb, var(--primary) 10%, rgba(0,0,0,0.12))",
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              Bereit, Zeit zu sparen?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Starte jetzt und erlebe, wie einfach Prüfungsvorbereitung sein kann.
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center justify-center rounded-xl px-8 py-3.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: "var(--primary)",
                boxShadow:
                  "0 0 24px color-mix(in srgb, var(--primary) 55%, transparent), 0 4px 16px color-mix(in srgb, var(--primary) 35%, transparent)",
              }}
            >
              Kostenlos registrieren →
            </Link>
          </motion.div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="relative z-10 border-t border-border/50 py-7 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LecturAI — KI-gestützte Prüfungsgenerierung für Hochschulen.
          </p>
        </footer>
    </div>
  );
}
