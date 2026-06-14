"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Loader2, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { TeacherPanel } from "@/components/dashboard/TeacherPanel";
import { fetchCourses, getSession, signOut, type Course } from "@/lib/api";
import { roleLabelDe, type UserSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

const ease = [0.22, 1, 0.36, 1] as const;

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null | undefined>(undefined);

  useEffect(() => {
    void getSession().then(setUserSession);
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUserSession(null);
        router.replace("/login");
        return;
      }
      void getSession().then(setUserSession);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const loadCourses = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUserSession(session);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCourses();
      if (!result.ok) {
        if (result.reason === "unauthorized") {
          await signOut();
          router.replace("/login");
          return;
        }
        if (result.reason === "network") {
          setError("Netzwerkfehler — ist Supabase erreichbar?");
        } else {
          setError(result.message ?? "Kurse konnten nicht geladen werden.");
        }
        setCourses([]);
        return;
      }
      setCourses(result.courses);
    } catch {
      setError("Netzwerkfehler — ist Supabase erreichbar?");
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

  async function logout() {
    await signOut();
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
            <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
              Dashboard
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#333333] dark:text-zinc-100 sm:text-4xl">
              Deine <span className="text-[#2a9d8f]">Kurse</span>
            </h1>
            <p className="mt-2 max-w-xl text-base text-[#666666] dark:text-zinc-400">
              Alle Kurse, in denen du als Lehrkraft eingetragen bist oder als Mitglied
              teilnimmst.
            </p>
            {userSession !== undefined &&
            userSession &&
            (userSession.email || userSession.role) ? (
              <p className="mt-3 text-sm font-medium text-[#2a9d8f] dark:text-teal-300">
                {roleLabelDe(userSession.role)}
                {userSession.email ? <> · {userSession.email}</> : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCourses()}
              className="glass-panel rounded-xl border border-white/60 px-4 py-2.5 text-sm font-semibold text-[#444444] transition hover:border-[#2a9d8f]/35 hover:text-[#2a7d73] dark:border-white/10 dark:text-zinc-200 dark:hover:border-teal-400/30"
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="glass-panel inline-flex items-center justify-center gap-2 rounded-xl border border-white/60 px-4 py-2.5 text-sm font-semibold text-[#666666] transition hover:border-red-300/60 hover:text-red-700 dark:border-white/10 dark:text-zinc-300 dark:hover:border-red-500/40 dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Abmelden
            </button>
          </div>
        </motion.div>

        {userSession !== undefined && userSession?.role === "admin" ? <AdminPanel /> : null}
        {userSession !== undefined && userSession?.role === "teacher" ? (
          <TeacherPanel courses={courses} onCoursesChanged={() => void loadCourses()} />
        ) : null}

        {loading ? (
          <div className="glass-panel flex items-center justify-center gap-3 rounded-2xl py-20 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-8 w-8 animate-spin text-[#2a9d8f]" aria-hidden />
            <span className="text-lg">Kurse werden geladen…</span>
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl border border-red-300/50 bg-red-50/80 px-6 py-8 text-center text-red-700 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-200">
            <p className="text-lg font-medium">{error}</p>
            <Link href="/" className="mt-4 inline-block font-semibold text-[#2a9d8f] underline">
              Zur Startseite
            </Link>
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-panel rounded-2xl px-8 py-16 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#888888] dark:text-zinc-400" aria-hidden />
            <p className="text-xl font-semibold text-[#333333] dark:text-zinc-100">Noch keine Kurse</p>
            <p className="mx-auto mt-2 max-w-md text-[#666666] dark:text-zinc-400">
              Sobald du einem Kurs beigetreten bist oder als Lehrkraft einen Kurs anlegst,
              erscheint er hier.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#2a9d8f] px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_rgb(42_157_143_/_0.35)] transition hover:brightness-110"
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
                <div className="glass-panel h-full rounded-2xl p-6 transition hover:border-[#2a9d8f]/40 hover:shadow-[0_10px_36px_rgb(42_157_143_/_0.12)]">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2a9d8f]/12 dark:bg-[#2a9d8f]/25">
                      <BookOpen className="h-5 w-5 text-[#2a9d8f]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold leading-snug text-[#333333] dark:text-zinc-100">
                        {course.name}
                      </h2>
                      {course.semester ? (
                        <p className="mt-1 text-sm text-[#777777] dark:text-zinc-400">{course.semester}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-[#999999] dark:text-zinc-500">ID: {course.id.slice(0, 8)}…</p>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </MarketingAuthShell>
  );
}
