export type CourseGlowCardProps = {
  id: string;
  name: string;
  semester?: string | null;
};

/**
 * Beispiel-Karte im LecturAI-KI-Look:
 * Glassmorphism, Neon-Rand, optional Shine, Tailwind-Glow-Utilities aus `tailwind.config.ts`.
 */
export function CourseGlowCard({ id, name, semester }: CourseGlowCardProps) {
  const shortId = id.length > 8 ? `${id.slice(0, 8)}…` : id;

  return (
    <article
      className={[
        "group relative rounded-3xl p-px",
        "bg-gradient-to-br from-lectur-accent-violet-core/50 via-lectur-accent-cyan/25 to-lectur-accent-emerald/30",
        "shadow-glow-violet hover:shadow-glow-cta transition-all duration-300 ease-lectur-out",
        "hover:-translate-y-0.5",
      ].join(" ")}
    >
      <div
        className={[
          "shine-sweep glass-card relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] p-6",
          "ring-1 ring-white/5",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-lectur-accent-violet-core/20 blur-2xl transition-opacity group-hover:opacity-100 opacity-60" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-lectur-accent-cyan/15 blur-2xl" />

        <header className="relative z-10 flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-tight text-lectur-foreground">
            <span className="text-gradient-lectur">{name}</span>
          </h3>
          <span className="rounded-full border border-lectur-accent-cyan/30 bg-lectur-accent-cyan/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-lectur-accent-cyan">
            Kurs
          </span>
        </header>

        <p className="relative z-10 mt-3 text-sm text-lectur-muted">
          Semester:{" "}
          <span className="text-lectur-foreground/90">
            {semester?.trim() ? semester : "Keine Angabe"}
          </span>
        </p>

        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
          <p className="font-mono text-xs text-lectur-subtle">
            ID: <span className="text-lectur-muted">{shortId}</span>
          </p>
          <button
            type="button"
            className="btn-glow-primary rounded-xl px-4 py-2 text-sm"
          >
            Code generieren
          </button>
        </div>
      </div>
    </article>
  );
}
