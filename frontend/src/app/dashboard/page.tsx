"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Loader2, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { API_URL } from "@/lib/api";
import { clearAuth, getAccessToken } from "@/lib/auth";

const ease = [0.22, 1, 0.36, 1] as const;

type Course = {
  id: string;
  name: string;
  semester: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        clearAuth();
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError("Kurse konnten nicht geladen werden.");
        setCourses([]);
        return;
      }
      const data = (await res.json()) as Course[];
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setError("Netzwerkfehler — läuft das Backend?");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadCourses();
    });
  }, [loadCourses]);

  function logout() {
    clearAuth();
    router.push("/");
    router.refresh();
  }

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-5xl px-2 py-4 sm:px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Dashboard
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Deine <span className="text-primary">Kurse</span>
            </h1>
            <p className="mt-2 max-w-xl text-base text-muted-foreground">
              Alle Kurse, in denen du als Lehrkraft eingetragen bist oder als Mitglied
              teilnimmst.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCourses()}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Abmelden
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card/50 py-20 text-muted-foreground backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <span className="text-lg">Kurse werden geladen…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center text-destructive">
            <p className="text-lg font-medium">{error}</p>
            <Link href="/" className="mt-4 inline-block text-primary underline">
              Zur Startseite
            </Link>
          </div>
        ) : courses.length === 0 ? (
          <div
            className="rounded-2xl border border-border bg-card/60 px-8 py-16 text-center backdrop-blur-md"
            style={{
              boxShadow:
                "0 8px 48px color-mix(in srgb, var(--primary) 6%, rgba(0,0,0,0.08)), 0 0 0 1px color-mix(in srgb, var(--border) 55%, transparent)",
            }}
          >
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden />
            <p className="text-xl font-semibold text-foreground">Noch keine Kurse</p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Sobald du einem Kurs beigetreten bist oder als Lehrkraft einen Kurs anlegst,
              erscheint er hier.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
              style={{
                backgroundColor: "var(--primary)",
                boxShadow:
                  "0 0 18px color-mix(in srgb, var(--primary) 40%, transparent)",
              }}
            >
              Zur Startseite
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <motion.li
                key={course.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35, ease }}
              >
                <div
                  className="h-full rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-sm transition hover:border-primary hover:shadow-[0_0_0_1px_var(--primary),0_8px_28px_color-mix(in_srgb,var(--primary)_14%,transparent)]"
                  style={{
                    boxShadow:
                      "0 2px 12px color-mix(in srgb, var(--foreground) 6%, transparent)",
                  }}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--primary) 14%, transparent)",
                      }}
                    >
                      <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold leading-snug text-card-foreground">
                        {course.name}
                      </h2>
                      {course.semester ? (
                        <p className="mt-1 text-sm text-muted-foreground">{course.semester}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">ID: {course.id.slice(0, 8)}…</p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </MarketingAuthShell>
  );
}
