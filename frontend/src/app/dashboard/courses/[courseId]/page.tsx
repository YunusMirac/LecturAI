"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { CourseInviteSection } from "@/components/dashboard/CourseInviteSection";
import { CourseMembersSection } from "@/components/dashboard/CourseMembersSection";
import { MarketingAuthShell } from "@/components/landing/MarketingAuthShell";
import {
  fetchCourseDetail,
  fetchCourseQuizzes,
  type CourseDetail,
  type QuizSummary,
} from "@/lib/api/quizzesApi";
import { difficultyLabelDe, quizStatusLabelDe, quizTypeLabelDe } from "@/lib/quiz-labels";
import { filterQuizzesForCourseViewer, studentQuizHref } from "@/lib/quiz-visibility";

type TabId = "quizzes" | "students";

function statusBadge(status: QuizSummary["status"]) {
  const base = "rounded-full px-2.5 py-0.5 text-xs font-semibold";
  switch (status) {
    case "published":
      return `${base} bg-[#2a9d8f]/15 text-[#2a9d8f]`;
    case "draft":
      return `${base} bg-amber-500/15 text-amber-800 dark:text-amber-200`;
    case "generating":
      return `${base} bg-sky-500/15 text-sky-800 dark:text-sky-200`;
    case "failed":
      return `${base} bg-red-500/15 text-red-700 dark:text-red-300`;
    default:
      return base;
  }
}

export default function CoursePage() {
  const params = useParams();
  const courseId = String(params.courseId ?? "");

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("quizzes");
  const [membersRefreshKey, setMembersRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [courseRes, quizRes] = await Promise.all([
      fetchCourseDetail(courseId),
      fetchCourseQuizzes(courseId),
    ]);
    setLoading(false);
    if (!courseRes.ok) {
      setError(courseRes.message);
      return;
    }
    setCourse(courseRes.course);
    if (!quizRes.ok) {
      setError(quizRes.message);
      return;
    }
    setQuizzes(quizRes.quizzes);
  }, [courseId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const visibleQuizzes = course ? filterQuizzesForCourseViewer(quizzes, course.can_manage) : [];

  return (
    <MarketingAuthShell mainVariant="wide">
      <div className="mx-auto w-full max-w-4xl px-2 py-4 sm:px-4">
        <Link
          href="/dashboard"
          className="mb-6 inline-block text-sm font-semibold text-[#2a9d8f] hover:underline"
        >
          ← Zurück zum Dashboard
        </Link>

        {loading ? (
          <div className="flex items-center gap-3 text-[#666666] dark:text-zinc-300">
            <Loader2 className="h-6 w-6 animate-spin text-[#2a9d8f]" />
            Kurs wird geladen…
          </div>
        ) : error ? (
          <p className="text-red-600 dark:text-red-300">{error}</p>
        ) : course ? (
          <>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-[#777777] dark:text-zinc-400">
                  Kurs
                </p>
                <h1 className="text-3xl font-extrabold text-[#333333] dark:text-zinc-100">
                  {course.name}
                </h1>
                {course.semester ? (
                  <p className="mt-1 text-[#666666] dark:text-zinc-400">{course.semester}</p>
                ) : null}
              </div>
              {course.can_manage ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/courses/${courseId}/edit`}
                    className="rounded-xl border border-white/40 px-4 py-2.5 text-sm font-semibold text-[#666666] transition hover:border-[#2a9d8f]/40 hover:text-[#2a9d8f] dark:text-zinc-300"
                  >
                    Bearbeiten
                  </Link>
                  {activeTab === "quizzes" ? (
                    <Link
                      href={`/dashboard/courses/${courseId}/quizzes/new`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2a9d8f] px-5 py-3 text-sm font-bold text-white shadow-[0_6px_24px_rgb(42_157_143_/_0.35)] transition hover:brightness-110"
                    >
                      <Sparkles className="h-4 w-4" />
                      Quiz aus PDF erstellen
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>

            {course.can_manage ? (
              <div className="mb-6 flex gap-1 border-b border-white/30 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab("quizzes")}
                  className={`px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "quizzes"
                      ? "border-b-2 border-[#2a9d8f] text-[#2a9d8f]"
                      : "text-[#666666] hover:text-[#333333] dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Quizze
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("students")}
                  className={`px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "students"
                      ? "border-b-2 border-[#2a9d8f] text-[#2a9d8f]"
                      : "text-[#666666] hover:text-[#333333] dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Schüler & Einladungen
                </button>
              </div>
            ) : null}

            {(!course.can_manage || activeTab === "quizzes") && (
              <div className="glass-panel rounded-2xl p-6 sm:p-8">
                <h2 className="mb-4 text-lg font-semibold text-[#2a9d8f]">Quizze</h2>
                {!course.can_manage && visibleQuizzes.length === 0 ? (
                  <p className="text-sm text-[#666666] dark:text-zinc-400">
                    Gerade ist kein Quiz oder keine Klausur geöffnet. Sobald deine Lehrkraft
                    etwas freischaltet, erscheint es hier.
                  </p>
                ) : course.can_manage && visibleQuizzes.length === 0 ? (
                  <p className="text-sm text-[#666666] dark:text-zinc-400">
                    Noch keine Quizze — lade ein Vorlesungs-PDF hoch und lass die KI Fragen
                    erstellen.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {visibleQuizzes.map((q) => {
                      const href = course.can_manage
                        ? `/dashboard/courses/${courseId}/quizzes/${q.id}`
                        : studentQuizHref(courseId, q);

                      return (
                        <li key={q.id}>
                          <Link
                            href={href}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/30 bg-white/30 px-4 py-3 transition hover:border-[#2a9d8f]/40 dark:border-white/10 dark:bg-zinc-900/30"
                          >
                            <div>
                              <p className="font-medium text-[#333333] dark:text-zinc-100">{q.title}</p>
                              <p className="mt-0.5 text-xs text-[#777777] dark:text-zinc-500">
                                {quizTypeLabelDe(q.quiz_type)} · {q.settings_json?.question_count ?? "?"}{" "}
                                Fragen · {difficultyLabelDe(q.settings_json?.difficulty ?? "medium")}
                                {!course.can_manage ? (
                                  <span className="ml-2 font-semibold text-[#2a9d8f]">
                                    · {q.quiz_type === "exam" ? "Geöffnet" : "Live geöffnet"}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {course.can_manage ? (
                                <span className={statusBadge(q.status)}>
                                  {quizStatusLabelDe(q.status)}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-[#2a9d8f]">
                                  Code eingeben →
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {course.can_manage && activeTab === "students" ? (
              <div className="space-y-6">
                <CourseInviteSection
                  courseId={courseId}
                  onInvited={() => setMembersRefreshKey((k) => k + 1)}
                />
                <CourseMembersSection courseId={courseId} refreshKey={membersRefreshKey} />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingAuthShell>
  );
}
