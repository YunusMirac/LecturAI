import Link from "next/link";

import { CourseGlowCard } from "@/components/lectur/CourseGlowCard";
import { API_URL } from "@/lib/api";

export default async function Home() {
  let courses: { id: string; name: string; semester?: string | null }[] = [];
  let loadError = false;

  try {
    const res = await fetch(`${API_URL}/api/courses/`, {
      cache: "no-store",
    });
    if (res.ok) {
      courses = await res.json();
    } else {
      loadError = true;
    }
  } catch {
    loadError = true;
  }

  return (
    <main className="relative min-h-screen px-6 py-12 sm:px-10 lg:px-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lectur-accent-violet/50 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex flex-col gap-6 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-lectur-accent-cyan">
            LecturAI
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient-lectur">Intelligentes Lernen</span>
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-lectur-muted">
            Dein Dashboard im KI-Look: Kurse, Codes und Sitzungen — klar, sicher,
            mit Leuchtfokus auf das Wesentliche.
          </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-lectur-foreground hover:bg-white/5"
            >
              Anmelden
            </Link>
            <Link
              href="/register"
              className="btn-glow-primary rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Registrieren
            </Link>
          </nav>
        </header>

        <section aria-labelledby="courses-heading">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="courses-heading" className="text-2xl font-semibold text-lectur-foreground">
              Meine <span className="text-lectur-accent-violet">Kurse</span>
            </h2>
            <button
              type="button"
              className="btn-glow-primary self-start rounded-xl px-5 py-2.5 text-sm sm:self-auto"
            >
              Neuen Kurs anlegen
            </button>
          </div>

          {loadError ? (
            <div className="glass-card ring-glow-cyan rounded-3xl p-8 text-center text-lectur-muted">
              <p className="text-lectur-foreground">
                Backend nicht erreichbar — starte Django auf Port{" "}
                <code className="font-mono text-lectur-accent-cyan">8000</code>.
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <p className="text-lectur-muted">
                Noch keine Kurse. Lege im Django-Admin einen ersten Kurs an.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {courses.map((course) => (
                <CourseGlowCard
                  key={course.id}
                  id={course.id}
                  name={course.name}
                  semester={course.semester}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
